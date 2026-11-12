import Link from "next/link";
import { getOrders } from "@/lib/data";
import { stageLabel } from "@/lib/orders";
import { relativeDay, lagosDay } from "@/lib/format";
import { SelectList } from "@/components/SelectList";
import { deleteOrders } from "../orders/actions";

export const metadata = { title: "Select orders" };

export default async function ManagePage() {
  const orders = (await getOrders()).slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
  const items = orders.map((o) => ({
    id: o.id,
    name: o.client_name,
    sub: [o.ref, o.title, `added ${relativeDay(lagosDay(o.created_at))}`].filter(Boolean).join(" · "),
    group: o.cancelled ? "Cancelled" : stageLabel(o.stage),
  }));
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <Link href="/orders" className="mut small">‹ Orders</Link>
      <h1 className="page-title">Select orders</h1>
      {items.length ? <SelectList items={items} action={deleteOrders} /> : <div className="empty">No orders.</div>}
    </div>
  );
}
