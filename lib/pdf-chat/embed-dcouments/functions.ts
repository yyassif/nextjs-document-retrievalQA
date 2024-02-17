import { generateEmbeddings } from "@/lib/pdf-chat/embeddings";
import { ChunkType } from "@/types";
import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import SqlString from "sqlstring";

export async function processDocumentInBackground({
  supabase,
  channel,
  content,
}: {
  supabase: SupabaseClient<SupaTypes>;
  channel: RealtimeChannel;
  content: string[];
}) {
  sendProgress(channel, "Saving document details...");

  const chunks = await generateEmbeddings(content);

  messageForLongDocs(chunks, channel);

  const { content: texts, embeddings } = chunks;

  const { error } = await supabase.from("documents").insert(
    texts.map((value, index) => ({
      content: SqlString.escape(value),
      embedding: JSON.stringify(embeddings[index]),
      metadata: {
        index,
      },
    }))
  );

  if (error) {
    sendError(channel, error.message);
    return;
  }

  channel.send({
    type: "broadcast",
    event: "upload:complete",
  });
}

export const sendProgress = (channel: RealtimeChannel, message: string) => {
  channel.send({
    type: "broadcast",
    event: "upload:progress",
    payload: {
      message,
    },
  });
};

export const sendError = (channel: RealtimeChannel, error: string) => {
  console.error(error);
  channel.send({
    type: "broadcast",
    event: "upload:error",
    payload: {
      error,
    },
  });
};

export const messageForLongDocs = (
  chunks: ChunkType,
  channel: RealtimeChannel
) => {
  if (chunks.content.length > 10) {
    sendProgress(channel, "Uploading a big Document might take a while...");
  }
};
