import "server-only";
import { createClient } from "./supabase/server";
import type { Bank, OrderFull, OrderUpdate, Sale, Settings, Template, Weaver } from "./types";

const ORDER_SELECT = "*, weaver:weavers(id, name, phone), payments(*), assignments:order_assignments(*, weaver:weavers(id, name, phone))";
const ORDER_SELECT_OLD = "*, weaver:weavers(id, name, phone), payments(*)"; // before migration 006

function tidy(o: OrderFull): OrderFull {
  const a = (o.assignments ?? []).slice().sort((x, y) => x.created_at.localeCompare(y.created_at));
  return { ...o, assignments: a };
}

export async function getOrders(): Promise<OrderFull[]> {
  const supabase = await createClient();
  let { data, error } = await supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false });
  if (error && /order_assignments/.test(error.message)) {
    ({ data, error } = await supabase.from("orders").select(ORDER_SELECT_OLD).order("created_at", { ascending: false }));
  }
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as OrderFull[]).map(tidy);
}

export async function getOrder(id: string): Promise<OrderFull | null> {
  const supabase = await createClient();
  let { data, error } = await supabase.from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle();
  if (error && /order_assignments/.test(error.message)) {
    ({ data, error } = await supabase.from("orders").select(ORDER_SELECT_OLD).eq("id", id).maybeSingle());
  }
  if (error) throw new Error(error.message);
  return data ? tidy(data as unknown as OrderFull) : null;
}

export async function getUpdates(orderId: string): Promise<OrderUpdate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_updates")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as OrderUpdate[];
}

export async function getSettings(): Promise<Settings> {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
  return (data as Settings) ?? {
    id: 1, biz_name: "Àbáké Olófì", address: "Oje Market, Ibadan", phone: "08107985997", handle: "@abake_olofi",
    bank_name: null, account_name: null, account_number: null, terms: null, buffer_days: 7, call_every_days: 3, next_invoice_no: 1281,
  };
}

export async function getWeavers(): Promise<Weaver[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("weavers").select("id, name, phone, active").eq("active", true).order("name");
  return (data ?? []) as Weaver[];
}

/** weaver id → number of orders on their loom right now. */
export async function weaverLoad(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const out: Record<string, number> = {};
  // Each weaver's share still on the loom (an order split across weavers counts once for each of them).
  const { data, error } = await supabase
    .from("order_assignments")
    .select("weaver_id, received_at, orders!inner(stage, cancelled)")
    .is("received_at", null)
    .eq("orders.stage", "weaving")
    .eq("orders.cancelled", false);
  if (!error) {
    (data ?? []).forEach((r: { weaver_id: string | null }) => { if (r.weaver_id) out[r.weaver_id] = (out[r.weaver_id] ?? 0) + 1; });
    return out;
  }
  const { data: old } = await supabase.from("orders").select("weaver_id").eq("stage", "weaving").eq("cancelled", false);
  (old ?? []).forEach((r: { weaver_id: string | null }) => { if (r.weaver_id) out[r.weaver_id] = (out[r.weaver_id] ?? 0) + 1; });
  return out;
}

export async function getTemplates(): Promise<Template[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("templates").select("*").order("name");
  return (data ?? []) as Template[];
}

export async function getMe(): Promise<{ id: string; email: string | null; name: string; role: string } | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const claims = auth?.claims;
  if (!claims?.sub) return null;
  const { data } = await supabase.from("staff").select("name, role").eq("user_id", claims.sub).maybeSingle();
  return { id: claims.sub, email: (claims.email as string | undefined) ?? null, name: data?.name ?? "", role: data?.role ?? "" };
}

/** Signed URLs (1 hour) for private photos and videos. */
export async function signMedia(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const supabase = await createClient();
  const { data } = await supabase.storage.from("media").createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  (data ?? []).forEach((d) => { if (d.path && d.signedUrl) out[d.path] = d.signedUrl; });
  return out;
}

export async function getBanks(): Promise<Bank[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("bank_accounts").select("id, bank_name, account_name, account_number, is_default").order("created_at");
  return (data ?? []) as Bank[];
}

/** Stock sales, newest first. Empty (not an error) until migration 007 has been run. */
export async function getSales(): Promise<Sale[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sales").select("*").order("sold_on", { ascending: false }).order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as Sale[];
}

export async function getSale(id: string): Promise<Sale | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("sales").select("*").eq("id", id).maybeSingle();
  return (data as Sale) ?? null;
}
