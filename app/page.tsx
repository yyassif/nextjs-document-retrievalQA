import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Page() {
  const supabase = createClient();
  const { data } = await supabase
    .from("conversations")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    redirect("/upload");
  } else {
    redirect(`/chat/${data.id}`);
  }
}
