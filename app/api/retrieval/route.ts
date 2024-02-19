import { createClient } from "@/lib/supabase/route";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  Message,
  StreamingTextResponse,
  createStreamDataTransformer,
  experimental_StreamData,
} from "ai";
import { ChatOllama } from "langchain/chat_models/ollama";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { AIMessage, HumanMessage, SystemMessage } from "langchain/schema";
import { BytesOutputParser } from "langchain/schema/output_parser";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";

export const runtime = "edge";

interface IRetrievalAgentsBody {
  messages: Message[];
  conversation_id: string;
}

function parseMessages(messages: Message[]) {
  return messages.map((m) =>
    m.role == "user"
      ? new HumanMessage(m.content)
      : m.role == "system"
      ? new SystemMessage(m.content)
      : new AIMessage(m.content)
  );
}

// Create a new ratelimiter, that allows 4 posts per 1 minute
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 d"),
  analytics: true,
});

export async function POST(req: Request) {
  const body = (await req.json()) as IRetrievalAgentsBody;
  const { messages, conversation_id } = body;
  const currentMessageContent = messages[messages.length - 1].content;

  // Ratelimiting the request
  const { success } = await ratelimit.limit("retrieval");

  const client = createClient();

  await client.from("messages").insert([
    {
      body: currentMessageContent,
      conversation_id,
      role: "user",
    },
  ]);

  const searchModel = !success
    ? new ChatOllama({
        baseUrl: process.env.OLLAMA_BASE_URL,
        model: process.env.OLLAMA_MODEL_NAME,
        temperature: 0,
      })
    : new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY!,
        modelName: "gpt-3.5-turbo",
        temperature: 0.1,
        streaming: true,
      });

  const model = !success
    ? new ChatOllama({
        baseUrl: process.env.OLLAMA_BASE_URL,
        model: process.env.OLLAMA_MODEL_NAME,
        temperature: 0.5,
      })
    : new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY!,
        modelName: "gpt-3.5-turbo",
        temperature: 0.5,
        streaming: true,
      });

  const store = new SupabaseVectorStore(new OpenAIEmbeddings(), {
    client,
    tableName: "documents",
    queryName: "match_documents",
  });

  // Extract a standalone question to later query the vector db.
  const answer = await searchModel.call(
    parseMessages([
      ...messages,
      {
        id: "0",
        role: "system",
        content: `Given the following conversation and a follow-up question, rephrase the follow-up question to be a standalone keyword-based question. Reply only with the question, nothing else.
----------
Standalone question:`,
      },
    ])
  );

  const data = new experimental_StreamData();

  const context = await store.similaritySearch(answer.content as string, 3);

  data.append(JSON.stringify({ context }));

  const contextString = context
    .map(
      (x) => `
## Page ${x?.metadata?.index}
${x?.pageContent}
`
    )
    .join("----\n");

  let systemInstructions = `You are a PDF Document Retrieval Agent. Your job is to find the most relevant documents to answer the question. You can use the following context to answer the question. If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------
CONTEXT: ${contextString}
----------`;

  console.log("Context: ", contextString);

  const stream = await model
    .pipe(new BytesOutputParser())
    .stream(
      parseMessages([
        { id: "instructions", role: "system", content: systemInstructions },
        ...messages,
      ]),
      {
        callbacks: [
          {
            handleLLMEnd: async (output) => {
              data.close();
              await client.from("messages").insert([
                {
                  body: output.generations[0][0].text,
                  conversation_id,
                  role: "assistant",
                },
              ]);
            },
          },
        ],
      }
    );

  return new StreamingTextResponse(
    stream.pipeThrough(createStreamDataTransformer(true)),
    {},
    data
  );
}
