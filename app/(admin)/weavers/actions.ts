"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/format";

export async function addWeaver(fd: FormData) {
  const name = str(fd.get("name"));
  if (name) {
    const supabase = await createClient();
    const { data: found } = await supabase.from("weavers").select("id").ilike("name", name).maybeSingle();
    if (found) await supabase.from("weavers").update({ active: true }).eq("id", found.id);
    else await supabase.from("weavers").insert({ name });
  }
  revalidatePath("/weavers");
  redirect("/weavers");
}

export async function renameWeaver(fd: FormData) {
  const supabase = await createClient();
  const name = str(fd.get("name"));
  if (name) await supabase.from("weavers").update({ name }).eq("id", str(fd.get("id")));
  revalidatePath("/weavers");
  redirect("/weavers");
}

export async function setWeaverActive(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("weavers").update({ active: fd.get("active") === "1" }).eq("id", str(fd.get("id")));
  revalidatePath("/weavers");
  redirect("/weavers");
}
