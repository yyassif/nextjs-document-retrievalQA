import { createClient } from "@/lib/supabase/route";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  Message,
  StreamingTextResponse,
  createStreamDataTransformer,
  experimental_StreamData,
} from "ai";

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { BytesOutputParser } from "@langchain/core/output_parsers";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";

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
  try {
    const body = (await req.json()) as IRetrievalAgentsBody;
    const { messages, conversation_id } = body;
    const currentMessageContent = messages[messages.length - 1].content;

    // Ratelimiting the request
    const { success } = await ratelimit.limit("retrieval");

    const shouldUseOllama = !success || process.env.RUN_LOCALLY_ON_PREMISE == "True";

    const client = createClient();

    await client.from("messages").insert([
      {
        body: currentMessageContent,
        conversation_id,
        role: "user",
      },
    ]);

    const searchModel = new ChatOpenAI({
        configuration: {
          baseURL: shouldUseOllama ? process.env.OLLAMA_BASE_URL as string : "https://api.openai.com/v1",
          apiKey: shouldUseOllama ? "ollama" as string : process.env.OPENAI_API_KEY,
        },
          modelName: shouldUseOllama ? process.env.OLLAMA_MODEL_NAME as string : "gpt-3.5-turbo",
          temperature: 0.1,
          streaming: true,
        });

    const model = new ChatOpenAI({
      configuration: {
        baseURL: shouldUseOllama ? process.env.OLLAMA_BASE_URL as string : "https://api.openai.com/v1",
        apiKey: shouldUseOllama ? "ollama" as string : process.env.OPENAI_API_KEY,
      },
        modelName: shouldUseOllama ? process.env.OLLAMA_MODEL_NAME as string : "gpt-3.5-turbo",
        temperature: 0.5,
        streaming: true,
      });

    const openaiEmbeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY as string,
        modelName: "text-embedding-ada-002",
      });
    const ollamaEmbeddings = new OllamaEmbeddings({
        model: process.env.OLLAMA_EMBEDDINGS_NAME as string,
        baseUrl: process.env.OLLAMA_EMBEDDINGS_URL as string,
      });

    const embeddings = shouldUseOllama ? ollamaEmbeddings : openaiEmbeddings;
    
    const store = new SupabaseVectorStore(embeddings, {
      client,
      tableName: "documents",
      queryName: shouldUseOllama ? "match_ollama_documents" : "match_documents",
    });

    // Extract a standalone question to later query the vector db.
    const answer = await searchModel.invoke(
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
  } catch (error) {
    console.log(error)
    return Response.json({ error: error}, { status: 500 });
  }
}
