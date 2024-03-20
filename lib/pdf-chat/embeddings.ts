import { convertToAscii } from "@/lib/utils";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";

const shouldUseOllama = process.env.RUN_LOCALLY_ON_PREMISE == "True";

const openaiEmbeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY as string,
  modelName: "text-embedding-ada-002",
});
const ollamaEmbeddings = new OllamaEmbeddings({
    model: process.env.OLLAMA_EMBEDDINGS_NAME as string,
    baseUrl: process.env.OLLAMA_EMBEDDINGS_URL as string,
  });

const embeddings = shouldUseOllama ? ollamaEmbeddings : openaiEmbeddings;

export const generateEmbeddings = async (content: string[]) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 4096,
    chunkOverlap: 200,
  });

  const textToAscii = content.map(convertToAscii);
  const sanitizedText = textToAscii.map((chunk) => chunk.replace(/\s+/g, " "));
  const chunks = await splitter.splitText(sanitizedText.join(" "));

  return {
    content: chunks,
    embeddings: await embeddings.embedDocuments(chunks),
  };
};
