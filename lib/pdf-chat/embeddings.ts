import { openAIEmbedding } from "@/lib/pdf-chat/openai";
import { convertToAscii } from "@/lib/utils";
import { pipeline } from "@xenova/transformers";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

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
    embeddings: await openAIEmbedding.embedDocuments(chunks),
  };
};

export async function generateEmbedding(content: string) {
  const generateEmbedding = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  // Generate a vector using Transformers.js
  const output = await generateEmbedding(content, {
    pooling: "mean",
    normalize: true,
  });

  // Extract the embedding output
  const embedding = Array.from(output.data);
  return embedding;
}
