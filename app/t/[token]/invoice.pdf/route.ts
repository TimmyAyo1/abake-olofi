import { createAdminClient } from "@/lib/supabase/admin";
import { invoiceFileName, invoicePdf } from "@/lib/invoice-pdf";
import type { OrderFull, Settings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// /t/<token>/invoice.pdf · the client's own invoice, opened from their tracking page.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!/^[a-f0-9]{16,64}$/.test(token)) return new Response("Not found", { status: 404 });
  const db = createAdminClient();
  const { data: o } = await db.from("orders").select("*, weaver:weavers(id, name, phone), payments(*)").eq("track_token", token).maybeSingle();
  if (!o || o.cancelled || o.stage === "enquiry") return new Response("Not found", { status: 404 });
  const { data: settings } = await db.from("settings").select("*").eq("id", 1).single();
  const order = o as unknown as OrderFull;
  const pdf = await invoicePdf(order, settings as Settings);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(invoiceFileName(order))}`,
      "Cache-Control": "private, no-store",
    },
  });
}
