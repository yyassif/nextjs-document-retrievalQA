import {
  processDocumentInBackground,
  sendError,
  sendProgress,
} from "@/lib/pdf-chat/embed-dcouments/functions";
import { createClient } from "@/lib/supabase/route";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const runtime = "edge";

interface IngestionBody {
  content: string[];
}

// Create a new rate-limiter for document embedding
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 d"),
  analytics: true,
});

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const body = (await request.json()) as IngestionBody;
    const { content } = body;

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "") {
      return Response.json(
        { error: "MISSING_OPENAI_API_KEY" },
        { status: 400 }
      );
    }
    if (
      process.env.NODE_ENV != "development" &&
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      const { success } = await ratelimit.limit("embeddings");

      if (!success) {
        return Response.json({ error: "TO_MANY_REQUESTS" }, { status: 429 });
      }
    }

    const channel = supabase.channel(`upload`);
    channel.subscribe((status) => {
      console.log({ status });
      if (status in ["TIMED_OUT", "CLOSED", "CHANNEL_ERROR"]) {
        sendError(channel, status);
      }
    });

    sendProgress(channel, "Processing document...");

    await processDocumentInBackground({
      supabase,
      channel,
      content,
    });

    return Response.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return Response.json({ error: e?.message }, { status: 500 });
  }
}
