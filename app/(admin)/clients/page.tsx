import Link from "next/link";
import { Filtered, type FItem } from "@/components/Filters";
import { CopyButton } from "@/components/Client";
import { Swatch } from "@/components/Swatch";
import { getOrders, getSales } from "@/lib/data";
import { money } from "@/lib/orders";
import { lagosDay, naira, relativeDay, waLink } from "@/lib/format";

export const metadata = { title: "Clients" };

type C = {
  key: string; name: string; phone: string | null;
  orders: number; live: number; sales: number;
  spent: number; owed: number; owedReady: number; last: string;
};

/** Everyone who has ordered or bought, put together by name. */
export default async function ClientsPage() {
  const [orders, sales] = await Promise.all([getOrders(), getSales()]);
  const map = new Map<string, C>();
  const get = (name: string, phone: string | null, date: string) => {
    const key = name.trim().toLowerCase().replace(/\s+/g, " ");
    let c = map.get(key);
    if (!c) { c = { key, name: name.trim(), phone: null, orders: 0, live: 0, sales: 0, spent: 0, owed: 0, owedReady: 0, last: date }; map.set(key, c); }
    if (phone && !c.phone) c.phone = phone;
    if (date > c.last) c.last = date;
    return c;
  };

  orders.filter((o) => !o.cancelled).forEach((o) => {
    const c = get(o.client_name, o.client_phone, lagosDay(o.created_at));
    const m = money(o);
    c.orders += 1;
    c.spent += m.paidIn;
    if (o.stage !== "delivered") c.live += 1;
    if (o.stage !== "enquiry" && m.balance > 0) {
      c.owed += m.balance;
      if (o.stage === "ready" || o.stage === "delivered") c.owedReady += m.balance;
    }
  });
  sales.filter((s) => s.customer_name?.trim()).forEach((s) => {
    const c = get(s.customer_name!, s.customer_phone, s.sold_on);
    c.sales += 1;
    c.spent += Number(s.total);
  });

  const clients = [...map.values()].sort((a, b) => b.owedReady - a.owedReady || b.owed - a.owed || b.last.localeCompare(a.last));
  const owing = clients.filter((c) => c.owed > 0);

  const items: FItem[] = clients.map((c) => {
    const tags: string[] = [];
    if (c.owed > 0) tags.push("owes");
    if (c.owedReady > 0) tags.push("collect");
    if (c.owed === 0 && c.spent > 0) tags.push("paid");
    if (c.live > 0) tags.push("live");
    if (c.orders + c.sales > 1) tags.push("repeat");
    if (c.sales > 0 && c.orders === 0) tags.push("shop");
    const what = [c.orders ? `${c.orders} order${c.orders > 1 ? "s" : ""}` : null, c.sales ? `${c.sales} purchase${c.sales > 1 ? "s" : ""}` : null, `last ${relativeDay(c.last)}`].filter(Boolean).join(" · ");
    const href = c.orders ? `/orders?q=${encodeURIComponent(c.name)}` : `/sales?q=${encodeURIComponent(c.name)}`;
    const wa = waLink(c.phone);
    const ask = `Hello ${c.name}, this is Abake from Àbáké Olófì. A gentle reminder that ${naira(c.owed)} is outstanding on your order. Thank you!`;
    return {
      id: c.key, tags, text: [c.name, c.phone].filter(Boolean).join(" "), date: c.last, amount: c.owed,
      node: (
        <div className="orow">
          <Swatch name={c.name} src={null} />
          <Link href={href} className="orow-main">
            <div className="orow-name">{c.name}</div>
            <div className="orow-sub">{what}</div>
          </Link>
          <div className="orow-end" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              {c.owed > 0
                ? <div className="num hot" style={{ fontWeight: 600 }}>Owes {naira(c.owed)}</div>
                : <div className="num mut">{c.spent ? "Paid up" : "—"}</div>}
              <div className="small mut num">{naira(c.spent)} paid</div>
            </div>
            {c.owedReady > 0
              ? wa
                ? <a className="btn sm" href={`${wa}?text=${encodeURIComponent(ask)}`} target="_blank" rel="noopener noreferrer">Ask</a>
                : <CopyButton text={ask} label="Copy" className="btn sm" />
              : null}
          </div>
        </div>
      ),
    };
  });

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Clients</h1>
      </div>
      <p className="mut" style={{ margin: 0 }}>
        {clients.length} client{clients.length === 1 ? "" : "s"}{owing.length ? ` · ${owing.length} owe ${naira(owing.reduce((a, c) => a + c.owed, 0))}` : ""}. Tap a client to see their orders.
      </p>

      {clients.length ? (
        <Filtered
          store="clients"
          items={items}
          chips={[
            { key: "all", label: "All" },
            { key: "owes", label: "Owes a balance" },
            { key: "collect", label: "Collect now" },
            { key: "paid", label: "Fully paid" },
            { key: "live", label: "Order in progress" },
            { key: "repeat", label: "Came back" },
            { key: "shop", label: "Shop only" },
          ]}
          search="Search name or phone"
          dates="Last seen"
          noun={["client", "clients"]}
          money="owed"
          empty="No clients match."
        />
      ) : (
        <div className="empty">Clients show here once there are orders or named sales.</div>
      )}
    </div>
  );
}
