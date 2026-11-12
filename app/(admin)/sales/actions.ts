"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { num, str, today } from "@/lib/format";
import { UNITS, saleMoney } from "@/lib/sales";
import type { SaleLine } from "@/lib/types";

function readLines(fd: FormData): SaleLine[] {
  const d = fd.getAll("sale_desc").map(String);
  const p = fd.getAll("sale_per").map(String);
  const q = fd.getAll("sale_qty").map((v) => num(v) || 1);
  const u = fd.getAll("sale_unit").map((v) => num(v));
  return d
    .map((desc, i) => ({ desc: desc.trim(), per: (UNITS as readonly string[]).includes(p[i]) ? p[i] : "piece", qty: q[i] ?? 1, unit: u[i] ?? 0 }))
    .filter((l) => l.desc || l.unit);
}

function refresh(id?: string) {
  revalidatePath("/sales", "layout");
  revalidatePath("/numbers");
  if (id) revalidatePath(`/sales/${id}`);
}

const NEEDS_007 = "Sales need a one-time database update (migration 007). Run supabase/migrations/007_sales.sql in Supabase, then try again.";

export async function createSale(fd: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const key = str(fd.get("client_key")) || null;

  if (key) {
    const { data: existing, error } = await supabase.from("sales").select("id").eq("client_key", key).maybeSingle();
    if (error && /sales/.test(error.message)) redirect(`/sales/new?err=${encodeURIComponent(NEEDS_007)}`);
    if (existing) redirect(`/sales/${existing.id}`);
  }

  const lines = readLines(fd);
  if (!lines.length) redirect(`/sales/new?err=${encodeURIComponent("Add at least one item with a price.")}`);
  const discount = num(fd.get("discount"));
  const { total } = saleMoney({ lines, discount });

  const { data: no, error: noErr } = await supabase.rpc("take_receipt_no");
  if (noErr) redirect(`/sales/new?err=${encodeURIComponent(NEEDS_007)}`);

  const sold = str(fd.get("sold_on"));
  const bank = str(fd.get("bank_account_id"));
  const { data, error } = await supabase
    .from("sales")
    .insert({
      receipt_no: no as number,
      customer_name: str(fd.get("customer_name")) || null,
      customer_phone: str(fd.get("customer_phone")) || null,
      channel: str(fd.get("channel")) || "Walk-in",
      lines,
      discount: Math.min(discount, total + discount),
      total,
      sold_on: /^\d{4}-\d{2}-\d{2}$/.test(sold) ? sold : today(),
      bank_account_id: /^[0-9a-f-]{36}$/i.test(bank) ? bank : null,
      note: str(fd.get("note")) || null,
      client_key: key,
      created_by: auth.user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) {
    if (/client_key/.test(error.message) && key) {
      const { data: existing } = await supabase.from("sales").select("id").eq("client_key", key).maybeSingle();
      if (existing) redirect(`/sales/${existing.id}`);
    }
    redirect(`/sales/new?err=${encodeURIComponent(error.message)}`);
  }
  refresh();
  redirect(`/sales/${data.id}?done=1`);
}

export async function deleteSale(fd: FormData) {
  const supabase = await createClient();
  const id = str(fd.get("id"));
  const { error } = await supabase.from("sales").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
  redirect("/sales");
}
