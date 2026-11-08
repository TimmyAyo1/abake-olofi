import { createAdminClient } from "@/lib/supabase/admin";
import { invoiceFileName, invoicePdf } from "@/lib/invoice-pdf";
import type { Bank, OrderFull, Settings } from "@/lib/types";
import { bankFor, withBank } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// /t/<token>/invoice.pdf · the client's own invoice, opened from their tracking page.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!/^[a-f0-9]{16,64}$/.test(token)) return new Response("Not found", { status: 404 });
  const db = createAdminClient();
  const { data: o } = await db.from("orders").select("*, weaver:weavers(id, name, phone), payments(*)").eq("track_token", token).maybeSingle();
  if (!o || o.cancelled || o.stage === "enquiry") return new Response("Not found", { status: 404 });
  const [{ data: settings }, { data: banks }] = await Promise.all([
    db.from("settings").select("*").eq("id", 1).single(),
    db.from("bank_accounts").select("id, bank_name, account_name, account_number, is_default").order("created_at"),
  ]);
  const order = o as unknown as OrderFull;
  const pdf = await invoicePdf(order, withBank(settings as Settings, bankFor(order, (banks ?? []) as Bank[])));
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(invoiceFileName(order))}`,
      "Cache-Control": "private, no-store",
    },
  });
}
