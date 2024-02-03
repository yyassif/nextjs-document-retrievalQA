import Chat from "@/components/ui/chat";
import { createClient } from "@/lib/supabase/server";
import { PDFDocument } from "@/types/supa.tables";
import { redirect } from "next/navigation";

interface IChatPageProps {
  params: {
    chatId: string;
  };
}

export default async function Page({ params }: IChatPageProps) {
  const supabase = createClient();

  // Initial posts
  const { data, error } = await supabase
    .from("documents")
    .select("*, document_messages(*)")
    .eq("id", params.chatId)
    .single();

  if (!data || error) {
    redirect("/");
  }

  return (
    <Chat
      chatId={params.chatId}
      conversation={data as PDFDocument}
      initialMessages={data.document_messages}
    />
  );
}
