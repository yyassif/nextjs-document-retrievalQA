import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Page() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert([{}])
    .select("id")
    .single();

  if (!data || error) {
    redirect("/upload");
  } else {
    redirect(`/chat/${data.id}`);
  }
}
