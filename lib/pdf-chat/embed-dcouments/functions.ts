import { generateEmbeddings } from "@/lib/pdf-chat/embeddings";
import { llm } from "@/lib/pdf-chat/openai";
import { ChunkType } from "@/types";
import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "langchain/prompts";
import SqlString from "sqlstring";

export async function saveDocument({
  supabase,
  document_name,
  file_key,
  chunks,
}: {
  supabase: SupabaseClient<SupaTypes>;
  file_key: string;
  document_name: string;
  chunks: ChunkType;
}) {
  const { data, error } = await supabase
    .from("documents")
    .insert([
      {
        title: document_name,
        document_name,
        file_key,
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error(error);
    return { error };
  }
  const document_id = data?.id as string;

  const { error: saveChunksError } = await saveDocumentChunks({
    supabase,
    document_id,
    chunks,
  });

  if (saveChunksError) {
    await supabase
      .from("documents")
      .delete({ count: "exact" })
      .eq("id", document_id);

    return {
      data: null,
      error: saveChunksError,
    };
  }

  return {
    data: {
      id: document_id,
    },
    error: null,
  };
}

async function saveDocumentChunks({
  supabase,
  document_id,
  chunks,
}: {
  supabase: SupabaseClient<SupaTypes>;
  document_id: string;
  chunks: ChunkType;
}) {
  const { content, embeddings } = chunks;

  const { error } = await supabase.from("document_chunks").insert(
    content.map((value, index) => ({
      content: SqlString.escape(value),
      embedding: JSON.stringify(embeddings[index]),
      metadata: {
        document_id,
        index,
      },
    }))
  );

  if (error) {
    console.error("[saveDocumentChunkError]: ", error);
    return { error };
  }

  return { error: null };
}

async function generateDocumentTitle({
  supabase,
  document_id,
  document_name,
}: {
  supabase: SupabaseClient<SupaTypes>;
  document_id: string;
  document_name: string;
}) {
  const defaultTitle = {
    title: document_name,
  };
  const prompt = new PromptTemplate({
    template:
      "Based on the passage below, suggest a modest title for the passage. The following are the conditions that must be followed\n\n- The title should be within ten words\n- The title should include only alphabets and numbers\n\nPassage:\n------------------\n{content}\n------------------\n\nTitle:",
    inputVariables: ["content"],
  });

  const { content } = await getChunkContent(supabase, document_id, 3);
  if (content === null) {
    return defaultTitle;
  }

  const chain = new LLMChain({
    llm,
    prompt,
    verbose: true,
  });

  const { text: title, error } = await chain
    .call({
      content,
    })
    .catch((error) => {
      return { text: null, error };
    });

  if (error) {
    return defaultTitle;
  }

  const { error: updateError } = await supabase
    .from("documents")
    .update({
      title,
    })
    .eq("id", document_id);

  if (updateError) {
    return defaultTitle;
  }

  return {
    title,
  };
}

async function getChunkContent(
  supabase: SupabaseClient<SupaTypes>,
  document_id: string,
  chunkLimit: number = 3
) {
  const { data, error } = await supabase
    .from("document_chunks")
    .select("content")
    .in("metadata", [document_id]);

  if (error) {
    return {
      content: null,
    };
  }

  const content = data
    .map((chunk) => chunk.content)
    .join("\n")
    .slice(0, 6000);

  return {
    content,
  };
}

export async function processDocumentInBackground({
  supabase,
  channel,
  content,
  file_key,
  document_name,
}: {
  supabase: SupabaseClient<SupaTypes>;
  channel: RealtimeChannel;
  content: string[];
  file_key: string;
  document_name: string;
}) {
  sendProgress(channel, "Saving document details...");

  const chunks = await generateEmbeddings(content);

  messageForLongDocs(chunks, channel);

  const { data, error } = await saveDocument({
    supabase,
    file_key,
    document_name,
    chunks,
  });

  if (error) {
    sendError(channel, error.message);
    return;
  }

  sendProgress(channel, "Generating document title...");

  const { title } = await generateDocumentTitle({
    supabase,
    document_id: data?.id as string,
    document_name,
  });

  channel.send({
    type: "broadcast",
    event: "upload:complete",
    payload: {
      ...data,
      title,
    },
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
    sendProgress(
      channel,
      "Uploading a big document, aren't we?\nThis might take a while..."
    );
  }
};
