import Chat from "@/components/ui/chat";
import { createClient } from "@/lib/supabase/server";
import { Conversation } from "@/types/supa.tables";
import { redirect } from "next/navigation";

interface IConversationProps {
  params: {
    chatId: string;
  };
}

export default async function Page({ params }: IConversationProps) {
  const supabase = createClient();

  // Initial posts
  const { data, error } = await supabase
    .from("conversations")
    .select("*, messages(*)")
    .eq("id", params.chatId)
    .single();

  if (!data || error) {
    redirect("/upload");
  }

  return (
    <Chat
      chatId={params.chatId}
      conversation={data as Conversation}
      initialMessages={data.messages}
    />
  );
}
