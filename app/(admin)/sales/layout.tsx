import Link from "next/link";
import { SplitView, RowLink } from "@/components/SplitView";
import { Swatch } from "@/components/Swatch";
import { getSales } from "@/lib/data";
import { naira, relativeDay, today } from "@/lib/format";
import { CHANNELS, buyer, receiptNo, saleSummary } from "@/lib/sales";
import { Filtered, type FItem } from "@/components/Filters";

const monthName = (ym: string) => new Date(ym + "-01T00:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const sales = await getSales();
  const ym = today().slice(0, 7);
  const thisMonth = sales.filter((s) => s.sold_on.startsWith(ym));
  const todays = sales.filter((s) => s.sold_on === today());
  const sum = (xs: typeof sales) => xs.reduce((a, s) => a + Number(s.total), 0);

  // Group by month, newest first.
  const months: { ym: string; rows: typeof sales }[] = [];
  sales.forEach((s) => {
    const m = s.sold_on.slice(0, 7);
    const g = months.find((x) => x.ym === m);
    if (g) g.rows.push(s); else months.push({ ym: m, rows: [s] });
  });

  const items: FItem[] = sales.map((s) => ({
    id: s.id,
    group: s.sold_on.slice(0, 7),
    tags: [s.channel ?? "Walk-in"],
    text: [buyer(s), s.customer_phone, receiptNo(s), saleSummary(s), s.note].filter(Boolean).join(" "),
    date: s.sold_on,
    amount: Number(s.total),
    node: (
      <div className="orow">
        <Swatch name={buyer(s)} src={null} />
        <RowLink href={`/sales/${s.id}`}>
          <div className="orow-name">{buyer(s)}</div>
          <div className="orow-sub">{[saleSummary(s), s.channel, relativeDay(s.sold_on)].filter(Boolean).join(" · ")}</div>
        </RowLink>
        <div className="orow-end"><div className="num" style={{ fontWeight: 600 }}>{naira(s.total)}</div></div>
      </div>
    ),
  }));

  const list = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div className="page-head">
        <h1 className="page-title">Sales</h1>
        <Link href="/sales/new" className="btn">New sale</Link>
      </div>
      <p className="mut" style={{ margin: "10px 0 0", fontSize: 14 }}>
        Ready-made pieces, walk-in or online.{sales.length ? ` Today ${naira(sum(todays))} · this month ${naira(sum(thisMonth))}` : ""}
      </p>

      {sales.length === 0 ? (
        <div className="empty" style={{ marginTop: 24 }}>
          <strong style={{ color: "var(--ink)" }}>No sales yet</strong>
          When someone buys something already made, in the shop or online, record it here. It takes seconds and gives them a receipt.
          <Link href="/sales/new" className="btn">Record a sale</Link>
        </div>
      ) : null}

      {sales.length ? (
        <Filtered
          items={items}
          groups={months.map((g) => ({ key: g.ym, label: monthName(g.ym), showAmount: true }))}
          chips={[{ key: "all", label: "All" }, ...CHANNELS.map((c) => ({ key: c, label: c }))]}
          search="Search customer, item or receipt no"
          dates="Sold"
          noun={["sale", "sales"]}
          money="sold"
          empty="No sales match."
        />
      ) : null}
    </div>
  );

  return <SplitView list={list} base="/sales" label="Sales">{children}</SplitView>;
}
