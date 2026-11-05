import "server-only";
import { createClient } from "./supabase/server";
import type { OrderFull, OrderUpdate, Settings, Template, Weaver } from "./types";

const ORDER_SELECT = "*, weaver:weavers(id, name, phone), payments(*)";

export async function getOrders(): Promise<OrderFull[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OrderFull[];
}

export async function getOrder(id: string): Promise<OrderFull | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as OrderFull) ?? null;
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
  const { data } = await supabase.from("orders").select("weaver_id").eq("stage", "weaving").eq("cancelled", false);
  const out: Record<string, number> = {};
  (data ?? []).forEach((r: { weaver_id: string | null }) => { if (r.weaver_id) out[r.weaver_id] = (out[r.weaver_id] ?? 0) + 1; });
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
