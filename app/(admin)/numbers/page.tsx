import Link from "next/link";
import { getOrders } from "@/lib/data";
import { SOURCES } from "@/lib/orders";
import { naira, today } from "@/lib/format";
import type { OrderFull } from "@/lib/types";

export const metadata = { title: "Numbers" };

const monthName = (ym: string) => new Date(ym + "-01T00:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const monthShort = (ym: string) => new Date(ym + "-01T00:00:00Z").toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
function shift(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

function monthStats(orders: OrderFull[], ym: string) {
  const inM = (d: string | null | undefined) => !!d && d.startsWith(ym);
  const started = orders.filter((o) => inM(o.deposit_at));
  const delivered = orders.filter((o) => inM(o.delivered_at));
  const withDate = delivered.filter((o) => o.client_promised);
  const onTime = withDate.filter((o) => (o.delivered_at ?? "") <= (o.client_promised ?? "")).length;
  const pays = orders.flatMap((o) => o.payments).filter((p) => inM(p.paid_on));
  const moneyIn = pays.filter((p) => p.direction === "in").reduce((a, p) => a + Number(p.amount), 0);
  const moneyOut = pays.filter((p) => p.direction === "out").reduce((a, p) => a + Number(p.amount), 0);
  const rated = orders.filter((o) => o.feedback_at && inM(o.feedback_at.slice(0, 10)));
  const loved = rated.filter((o) => o.feedback_product === "loved").length;
  return { started: started.length, delivered: delivered.length, onTime, withDate: withDate.length, moneyIn, moneyOut, kept: moneyIn - moneyOut, rated: rated.length, loved };
}

export default async function NumbersPage(props: { searchParams: Promise<{ m?: string }> }) {
  const searchParams = await props.searchParams;
  const orders = (await getOrders()).filter((o) => !o.cancelled);
  const now = today().slice(0, 7);
  const ym = /^\d{4}-\d{2}$/.test(searchParams.m ?? "") ? searchParams.m! : now;
  const s = monthStats(orders, ym);

  const last6 = Array.from({ length: 6 }, (_, k) => shift(ym, k - 5));
  const bars = last6.map((m) => ({ m, v: monthStats(orders, m).moneyIn }));
  const max = Math.max(1, ...bars.map((b) => b.v));

  const last12 = Array.from({ length: 12 }, (_, k) => shift(now, -k));
  const table = last12.map((m) => ({ m, ...monthStats(orders, m) })).filter((r) => r.started || r.delivered || r.moneyIn);
  const best = table.reduce((b, r) => (r.moneyIn > (b?.moneyIn ?? 0) ? r : b), null as (typeof table)[number] | null);

  const enquiries = orders.filter((o) => o.created_at.slice(0, 7) === ym);
  const sources = SOURCES.map((src) => {
    const e = enquiries.filter((o) => o.source === src);
    return { src, asked: e.length, paid: e.filter((o) => o.deposit_at).length };
  }).filter((x) => x.asked);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Numbers</h1>
        <div className="seg" role="group" aria-label="Month">
          <Link href={`/numbers?m=${shift(ym, -1)}`} aria-label="Previous month">‹</Link>
          <Link href={`/numbers?m=${ym}`} aria-current="true">{monthName(ym)}</Link>
          {ym < now ? <Link href={`/numbers?m=${shift(ym, 1)}`} aria-label="Next month">›</Link> : null}
        </div>
      </div>

      <div className="stats">
        <div className="stat"><span className="v num">{s.started}</span><span className="k">Orders started</span></div>
        <div className="stat"><span className="v num">{s.delivered}</span><span className="k">Delivered</span></div>
        <div className="stat"><span className="v num">{s.withDate ? `${s.onTime} of ${s.withDate}` : "—"}</span><span className="k">Delivered on the promised date</span></div>
        <div className="stat"><span className="v num">{naira(s.moneyIn)}</span><span className="k">Money in</span></div>
        <div className="stat"><span className="v num">{s.rated ? `${s.loved} of ${s.rated}` : "—"}</span><span className="k">Clients who loved it</span></div>
      </div>

      <section>
        <div className="label">Money in, last 6 months</div>
        <div className="bars" role="img" aria-label="Money received in each of the last six months">
          {bars.map((b) => (
            <div key={b.m} className={`bar ${b.m === ym ? "cur" : ""}`}>
              <em className="num">{b.v ? naira(b.v).replace(/,\d{3}$/, "k") : ""}</em>
              <i style={{ height: `${Math.max(1.5, (b.v / max) * 100)}%` }} />
              <small>{monthShort(b.m)}</small>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="label" style={{ paddingBottom: 6 }}>Month by month</div>
        {table.length ? (
          <div className="table-wrap">
            <table className="num">
              <thead><tr><th>Month</th><th className="r">Started</th><th className="r">Money in</th><th className="r">On time</th></tr></thead>
              <tbody>
                {table.map((r) => (
                  <tr key={r.m}>
                    <td><Link href={`/numbers?m=${r.m}`} style={{ textDecoration: "underline" }}>{monthName(r.m)}</Link>{best && best.m === r.m && table.length > 1 ? <span className="hot small"> · best</span> : null}</td>
                    <td className="r">{r.started}</td>
                    <td className="r">{naira(r.moneyIn)}</td>
                    <td className="r">{r.withDate ? `${r.onTime}/${r.withDate}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="mut">Months fill in as orders and payments are recorded.</p>}
      </section>

      <section>
        <div className="label" style={{ paddingBottom: 6 }}>Where clients came from · {monthShort(ym)}</div>
        {sources.length ? sources.map((x) => (
          <div className="kv" key={x.src}><span>{x.src}</span><span className="mut">{x.asked} asked · {x.paid} paid a deposit</span></div>
        )) : <p className="mut">No new enquiries this month.</p>}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <a href={`/numbers/export`} className="btn ghost" style={{ alignSelf: "flex-start" }}>Download all records (CSV)</a>
        <span className="mut small">Every order, payment and date in a spreadsheet. Keep it with the bank statements.</span>
      </section>
    </div>
  );
}
