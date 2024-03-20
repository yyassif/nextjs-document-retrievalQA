import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function Page() {
  const supabase = createClient();
  const date = new Date()
  const { data, error } = await supabase
    .from("conversations")
    .insert([{
      name: `Conversation ${formatDate(date)}`
    }])
    .select("id")
    .single();

  if (!data || error) {
    redirect("/upload");
  } else {
    redirect(`/chat/${data.id}`);
  }
}
