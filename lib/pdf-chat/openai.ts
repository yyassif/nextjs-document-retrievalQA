import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { BufferMemory } from "langchain/memory";
import { Configuration, OpenAIApi } from "openai-edge";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

export const openAI = new OpenAIApi(config);

export const chatMemory = new BufferMemory();

export const llm = new ChatOpenAI({
  openAIApiKey: process.env.NEXT_PUBLIC_sOPENAI_API_KEY,
  modelName: "gpt-3.5-turbo",
  streaming: true,
  temperature: 0.9,
});

export const openAIEmbedding = new OpenAIEmbeddings({
  openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  modelName: "text-embedding-ada-002",
});
