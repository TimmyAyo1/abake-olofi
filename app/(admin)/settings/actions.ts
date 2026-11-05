"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { num, str } from "@/lib/format";
import type { Line } from "@/lib/types";

export async function saveSettings(fd: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("settings").update({
    biz_name: str(fd.get("biz_name")) || "Àbáké Olófì",
    address: str(fd.get("address")) || null,
    phone: str(fd.get("phone")) || null,
    handle: str(fd.get("handle")) || null,
    bank_name: str(fd.get("bank_name")) || null,
    account_name: str(fd.get("account_name")) || null,
    account_number: str(fd.get("account_number")) || null,
    terms: str(fd.get("terms")) || null,
    buffer_days: num(fd.get("buffer_days")) || 7,
    call_every_days: num(fd.get("call_every_days")) || 3,
    ...(num(fd.get("next_invoice_no")) ? { next_invoice_no: num(fd.get("next_invoice_no")) } : {}),
  }).eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}

function readLines(fd: FormData): Line[] {
  const k = fd.getAll("line_kind").map(String);
  const d = fd.getAll("line_desc").map(String);
  const q = fd.getAll("line_qty").map((v) => num(v) || 1);
  const u = fd.getAll("line_unit").map((v) => num(v));
  return d.map((desc, i) => ({ desc: desc.trim(), qty: q[i] ?? 1, unit: u[i] ?? 0, ...(k[i] === "heading" ? { heading: true } : {}) })).filter((l) => l.desc || l.unit);
}

export async function saveTemplate(fd: FormData) {
  const supabase = await createClient();
  const id = str(fd.get("id"));
  const row = {
    name: str(fd.get("name")),
    specs: str(fd.get("specs")) || null,
    lines: readLines(fd),
    weaver_cost: num(fd.get("weaver_cost")) || null,
    weeks: num(fd.get("weeks")) || null,
  };
  if (!row.name) throw new Error("Give the template a name.");
  const { error } = id
    ? await supabase.from("templates").update(row).eq("id", id)
    : await supabase.from("templates").insert(row);
  if (error) throw new Error(error.message);
  revalidatePath("/templates");
  revalidatePath("/orders/new");
  redirect("/templates");
}

export async function deleteTemplate(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("templates").delete().eq("id", str(fd.get("id")));
  revalidatePath("/templates");
  redirect("/templates");
}
