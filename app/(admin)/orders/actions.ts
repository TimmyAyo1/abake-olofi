"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays, num, str, today, shortDate } from "@/lib/format";
import { linesTotal, stageIndex, STAGES } from "@/lib/orders";
import type { Line, Media, Stage } from "@/lib/types";

// ───────── helpers

function readLines(fd: FormData): Line[] {
  const k = fd.getAll("line_kind").map(String);
  const d = fd.getAll("line_desc").map(String);
  const q = fd.getAll("line_qty").map((v) => num(v) || 1);
  const u = fd.getAll("line_unit").map((v) => num(v));
  return d
    .map((desc, i) => ({ desc: desc.trim(), qty: q[i] ?? 1, unit: u[i] ?? 0, ...(k[i] === "heading" ? { heading: true } : {}) }))
    .filter((l) => l.desc || l.unit);
}

/** Gives the order the next invoice number (once). */
async function takeInvoiceNo(orderId: string) {
  const { supabase } = await me();
  await supabase.rpc("take_invoice_no", { p_order: orderId });
}

function readMedia(fd: FormData): Media[] {
  try {
    const v = JSON.parse(String(fd.get("media") || "[]"));
    return Array.isArray(v) ? v.filter((m) => m && typeof m.path === "string") : [];
  } catch {
    return [];
  }
}

async function me() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, uid: data.user?.id ?? null };
}

async function nextRef(): Promise<string> {
  const { supabase } = await me();
  const yy = today().slice(2, 4);
  const { data } = await supabase.from("orders").select("ref").like("ref", `AO-${yy}-%`).order("ref", { ascending: false }).limit(1);
  const last = data?.[0]?.ref ? Number(String(data[0].ref).split("-")[2]) : 0;
  return `AO-${yy}-${String(last + 1).padStart(3, "0")}`;
}

async function ensureWeaver(name: string, phone: string): Promise<string | null> {
  if (!name) return null;
  const { supabase } = await me();
  const { data: found } = await supabase.from("weavers").select("id, phone").eq("name", name).maybeSingle();
  if (found) {
    if (phone && phone !== found.phone) await supabase.from("weavers").update({ phone }).eq("id", found.id);
    return found.id;
  }
  const { data, error } = await supabase.from("weavers").insert({ name, phone: phone || null }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

async function addUpdate(orderId: string, kind: string, body: string, opts: { media?: Media[]; shared?: boolean } = {}) {
  const { supabase, uid } = await me();
  await supabase.from("order_updates").insert({
    order_id: orderId, kind, body, media: opts.media ?? [], shared: !!opts.shared, created_by: uid,
  });
}

async function setCoverIfMissing(orderId: string, media: Media[]) {
  const img = media.find((m) => m.type === "image");
  if (!img) return;
  const { supabase } = await me();
  await supabase.from("orders").update({ cover_path: img.path }).eq("id", orderId).is("cover_path", null);
}

function refresh(id?: string) {
  revalidatePath("/orders", "layout");
  revalidatePath("/money");
  revalidatePath("/numbers");
  if (id) revalidatePath(`/orders/${id}`);
}

// ───────── create / edit

export async function createOrder(fd: FormData) {
  const { supabase, uid } = await me();
  const ref = await nextRef();
  const media = readMedia(fd);
  const intent = str(fd.get("intent")); // "invoice" | "talking"
  const row = {
    ref,
    client_name: str(fd.get("client_name")),
    client_phone: str(fd.get("client_phone")) || null,
    source: str(fd.get("source")) || null,
    title: str(fd.get("title")) || null,
    specs: str(fd.get("specs")) || null,
    colourway: str(fd.get("colourway")) || null,
    client_promised: str(fd.get("client_promised")) || null,
    lines: readLines(fd),
    weaver_cost: num(fd.get("weaver_cost")) || null,
    stage: (intent === "invoice" ? "invoiced" : "enquiry") as Stage,
    invoiced_at: intent === "invoice" ? today() : null,
    cover_path: media.find((m) => m.type === "image")?.path ?? null,
    created_by: uid,
  };
  if (!row.client_name) throw new Error("Add the client's name.");
  const { data, error } = await supabase.from("orders").insert(row).select("id").single();
  if (error) throw new Error(error.message);
  await addUpdate(data.id, "stage", `New order from ${row.source ?? "a client"}`, { media });
  if (intent === "invoice") { await takeInvoiceNo(data.id); await addUpdate(data.id, "stage", "Invoice sent"); }
  refresh();
  redirect(`/orders/${data.id}${intent === "invoice" ? "?invoice=1" : ""}`);
}

export async function updateOrder(fd: FormData) {
  const { supabase } = await me();
  const id = str(fd.get("id"));
  const { error } = await supabase.from("orders").update({
    client_name: str(fd.get("client_name")),
    client_phone: str(fd.get("client_phone")) || null,
    source: str(fd.get("source")) || null,
    title: str(fd.get("title")) || null,
    specs: str(fd.get("specs")) || null,
    colourway: str(fd.get("colourway")) || null,
    client_promised: str(fd.get("client_promised")) || null,
    lines: readLines(fd),
  }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh(id);
  redirect(`/orders/${id}`);
}

// ───────── move to the next step

export async function advance(fd: FormData) {
  const { supabase } = await me();
  const id = str(fd.get("id"));
  const from = str(fd.get("from")) as Stage;
  const { data: o } = await supabase.from("orders").select("*").eq("id", id).single();
  if (!o || o.stage !== from) { refresh(id); redirect(`/orders/${id}`); }

  const patch: Record<string, unknown> = {};
  const date = str(fd.get("date")) || today();

  if (from === "enquiry") {
    patch.stage = "invoiced"; patch.invoiced_at = date;
    await takeInvoiceNo(id);
    await addUpdate(id, "stage", `Invoice sent · ₦${linesTotal(o.lines).toLocaleString("en-NG")}`);
  }

  if (from === "invoiced") {
    const amount = num(fd.get("amount"));
    if (amount > 0) {
      await supabase.from("payments").insert({ order_id: id, direction: "in", amount, paid_on: date, kind: "deposit", proof_path: readMedia(fd)[0]?.path ?? null });
    }
    patch.stage = "deposit"; patch.deposit_at = date;
    await addUpdate(id, "payment", `Deposit received · ₦${amount.toLocaleString("en-NG")}`, { media: readMedia(fd) });
  }

  if (from === "deposit") {
    const newName = str(fd.get("weaver_new"));
    const weaverId = newName ? await ensureWeaver(newName, "") : str(fd.get("weaver_id")) || null;
    if (!weaverId) throw new Error("Pick a weaver.");
    const { data: w } = await supabase.from("weavers").select("name").eq("id", weaverId).single();
    const wp = str(fd.get("weaver_promised"));
    const cp = str(fd.get("client_promised"));
    const firstCall = str(fd.get("next_call")) || addDays(today(), 3);
    Object.assign(patch, {
      stage: "weaving", weaving_at: today(), weaver_id: weaverId,
      weaver_promised: wp || null, client_promised: cp || null, next_call: firstCall,
    });
    await addUpdate(id, "stage", `Handed to ${w?.name ?? "the weaver"} · weaver's date ${shortDate(wp)} · client told ${shortDate(cp)}`);
    await addUpdate(id, "client", "Weaving has started.", { shared: true });
  }

  if (from === "weaving") {
    const paid = num(fd.get("paid_now"));
    if (paid > 0) await supabase.from("payments").insert({ order_id: id, direction: "out", amount: paid, paid_on: date, kind: "weaver" });
    const media = readMedia(fd);
    Object.assign(patch, { stage: "ready", ready_at: date, next_call: null });
    await addUpdate(id, "stage", `Received from the weaver${str(fd.get("note")) ? ` · ${str(fd.get("note"))}` : ""}`, { media, shared: fd.get("shared") === "on" });
    await setCoverIfMissing(id, media);
  }

  if (from === "ready") {
    const amount = num(fd.get("amount"));
    if (amount > 0) await supabase.from("payments").insert({ order_id: id, direction: "in", amount, paid_on: str(fd.get("paid_on")) || date, kind: "balance" });
    Object.assign(patch, { stage: "delivered", delivered_at: date });
    await addUpdate(id, "client", "Delivered. Enjoy your aso-oke!", { shared: true, media: readMedia(fd) });
  }

  const { error } = await supabase.from("orders").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  refresh(id);
  redirect(`/orders/${id}`);
}

export async function undoStep(fd: FormData) {
  const { supabase } = await me();
  const id = str(fd.get("id"));
  const { data: o } = await supabase.from("orders").select("stage").eq("id", id).single();
  const i = stageIndex(o?.stage as Stage);
  if (i > 0) {
    const prev = STAGES[i - 1].id;
    const dateCol: Record<string, string> = { invoiced: "invoiced_at", deposit: "deposit_at", weaving: "weaving_at", ready: "ready_at", delivered: "delivered_at" };
    await supabase.from("orders").update({ stage: prev, [dateCol[o!.stage]]: null }).eq("id", id);
    await addUpdate(id, "stage", `Moved back to “${STAGES[i - 1].label}”`);
  }
  refresh(id);
  redirect(`/orders/${id}`);
}

export async function toggleCancelled(fd: FormData) {
  const { supabase } = await me();
  const id = str(fd.get("id"));
  const cancel = fd.get("cancel") === "1";
  await supabase.from("orders").update({ cancelled: cancel }).eq("id", id);
  await addUpdate(id, "stage", cancel ? "Order cancelled" : "Order restored");
  refresh(id);
  redirect(`/orders/${id}`);
}

// ───────── updates, calls and dates

export async function logUpdate(fd: FormData) {
  const { supabase } = await me();
  const id = str(fd.get("id"));
  const kind = str(fd.get("kind")) || "note";
  const media = readMedia(fd);
  let body = str(fd.get("body"));
  const patch: Record<string, unknown> = {};

  if (kind === "weaver") {
    body = body || "Called the weaver";
    patch.last_call = today();
    const next = str(fd.get("next_call_pick")) || str(fd.get("next_call"));
    patch.next_call = next || addDays(today(), 3);
  }

  if (fd.get("date_changed") === "on") {
    const wp = str(fd.get("weaver_promised"));
    const cp = str(fd.get("client_promised"));
    const note = str(fd.get("client_date_note"));
    const { data: o } = await supabase.from("orders").select("weaver_promised, client_promised").eq("id", id).single();
    if (wp && wp !== o?.weaver_promised) { patch.weaver_promised = wp; body += `${body ? ". " : ""}Weaver's new date ${shortDate(wp)}`; }
    if (cp && cp !== o?.client_promised) {
      patch.client_promised = cp;
      patch.client_date_note = note || null;
      await addUpdate(id, "client", `New ready date: ${shortDate(cp)}${note ? `. ${note}` : ""}`, { shared: true });
    }
  }

  if (body || media.length) await addUpdate(id, kind, body, { media, shared: fd.get("shared") === "on" });
  if (Object.keys(patch).length) await supabase.from("orders").update(patch).eq("id", id);
  await setCoverIfMissing(id, media);
  refresh(id);
  redirect(`/orders/${id}`);
}

export async function toggleShared(fd: FormData) {
  const { supabase } = await me();
  const id = str(fd.get("id"));
  const updateId = str(fd.get("update_id"));
  await supabase.from("order_updates").update({ shared: fd.get("shared") === "1" }).eq("id", updateId);
  refresh(id);
}

export async function addPayment(fd: FormData) {
  const { supabase } = await me();
  const id = str(fd.get("id"));
  const amount = num(fd.get("amount"));
  const direction = str(fd.get("direction")) === "out" ? "out" : "in";
  const media = readMedia(fd);
  if (amount > 0) {
    await supabase.from("payments").insert({
      order_id: id, direction, amount, paid_on: str(fd.get("paid_on")) || today(),
      kind: direction === "out" ? "weaver" : "payment", proof_path: media[0]?.path ?? null,
    });
    await addUpdate(id, "payment", direction === "out" ? `Paid the weaver ₦${amount.toLocaleString("en-NG")}` : `Payment received ₦${amount.toLocaleString("en-NG")}`, { media });
  }
  refresh(id);
  redirect(`/orders/${id}`);
}

// ───────── invoice terms

export async function saveInvoiceTerms(fd: FormData) {
  const { supabase } = await me();
  const id = str(fd.get("id"));
  const dep = str(fd.get("deposit_due"));
  await supabase.from("orders").update({
    discount: num(fd.get("discount")),
    deposit_due: dep ? num(dep) : null,
  }).eq("id", id);
  await takeInvoiceNo(id);
  refresh(id);
  redirect(`/orders/${id}?invoice=1`);
}
