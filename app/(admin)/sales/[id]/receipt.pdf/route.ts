import { getBanks, getSale, getSettings } from "@/lib/data";
import { bankFor, withBank } from "@/lib/orders";
import { receiptPdf } from "@/lib/receipt-pdf";
import { receiptFileName } from "@/lib/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// /sales/<id>/receipt.pdf · staff only
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const [sale, settings, banks] = await Promise.all([getSale(id), getSettings(), getBanks()]);
  if (!sale) return new Response("Not found", { status: 404 });
  const pdf = await receiptPdf(sale, withBank(settings, bankFor(sale, banks)));
  const name = receiptFileName(sale);
  const download = new URL(req.url).searchParams.has("download");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
