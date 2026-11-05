import { getOrders } from "@/lib/data";
import { money, stageLabel } from "@/lib/orders";
import { today } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const orders = await getOrders();
  const head = [
    "Ref", "Client", "Phone", "Source", "Order", "Stage", "Cancelled", "Created", "Invoiced", "Deposit", "With weaver",
    "Ready", "Delivered", "Weaver", "Weaver promised", "Client promised", "Invoice total", "Paid in", "Balance",
    "Weaver cost", "Paid to weaver", "Other costs", "Kept", "Product feedback", "Service feedback",
  ];
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = orders.map((o) => {
    const m = money(o);
    return [
      o.ref, o.client_name, o.client_phone, o.source, o.title, stageLabel(o.stage), o.cancelled ? "yes" : "", o.created_at.slice(0, 10),
      o.invoiced_at, o.deposit_at, o.weaving_at, o.ready_at, o.delivered_at, o.weaver?.name, o.weaver_promised, o.client_promised,
      m.total, m.paidIn, m.balance, m.weaverCost || "", m.paidOut || "", o.other_costs || "", m.weaverCost ? m.kept : "",
      o.feedback_product, o.feedback_service,
    ].map(q).join(",");
  });
  const csv = "﻿" + [head.map(q).join(","), ...rows].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="abake-olofi-orders-${today()}.csv"`,
    },
  });
}
