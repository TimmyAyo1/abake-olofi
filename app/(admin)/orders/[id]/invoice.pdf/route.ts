import { getBanks, getOrder, getSettings } from "@/lib/data";
import { bankFor, withBank } from "@/lib/orders";
import { invoiceFileName, invoicePdf } from "@/lib/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// /orders/<id>/invoice.pdf · staff only (row-level security decides what getOrder can see)
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [o, settings, banks] = await Promise.all([getOrder(id), getSettings(), getBanks()]);
  if (!o) return new Response("Not found", { status: 404 });
  const pdf = await invoicePdf(o, withBank(settings, bankFor(o, banks)));
  const download = new URL(req.url).searchParams.has("download");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(invoiceFileName(o))}"; filename*=UTF-8''${encodeURIComponent(invoiceFileName(o))}`,
      "Cache-Control": "private, no-store",
    },
  });
}
