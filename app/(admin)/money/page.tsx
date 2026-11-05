import Link from "next/link";
import { getOrders } from "@/lib/data";
import { money, stageLabel } from "@/lib/orders";
import { naira, relativeDay, waLink } from "@/lib/format";

export const metadata = { title: "Money" };

export default async function MoneyPage(props: { searchParams: Promise<{ view?: string }> }) {
  const searchParams = await props.searchParams;
  const orders = (await getOrders()).filter((o) => !o.cancelled);
  const view = "clients";

  // Clients owe: invoices sent with a balance left.
  const clients = orders
    .filter((o) => o.stage !== "enquiry" && money(o).balance > 0)
    .sort((a, b) => (a.stage === "delivered" ? -1 : 0) - (b.stage === "delivered" ? -1 : 0));
  const owedToYou = clients.reduce((a, o) => a + money(o).balance, 0);

  // You owe weavers: agreed price minus what's been paid.
  const weavers = orders.filter((o) => money(o).owedToWeaver > 0);
  const youOwe = weavers.reduce((a, o) => a + money(o).owedToWeaver, 0);

  return (
    <div className="page">
      <h1 className="page-title">Money</h1>
      <div className="stats" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
        <div className="stat"><span className="v num">{naira(owedToYou)}</span><span className="k">Clients owe you</span></div>
      </div>

      <div>
        {view === "clients" ? (
          clients.length ? clients.map((o) => {
            const m = money(o);
            const wa = waLink(o.client_phone);
            const text = encodeURIComponent(`Hello ${o.client_name}, this is Abake from Àbáké Olófì. A gentle reminder that ${naira(m.balance)} is still due on your order ${o.ref}. Thank you!`);
            return (
              <div className="orow" key={o.id}>
                <Link href={`/orders/${o.id}`} className="orow-main">
                  <div className="orow-name">{o.client_name}</div>
                  <div className="orow-sub">{stageLabel(o.stage)}{o.stage === "delivered" ? ` ${relativeDay(o.delivered_at)}` : ""} · paid {naira(m.paidIn)} of {naira(m.total)}</div>
                </Link>
                <div className="orow-end" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <strong className={`num ${o.stage === "delivered" ? "hot" : ""}`}>{naira(m.balance)}</strong>
                  {wa ? <a className="btn ghost sm" href={`${wa}?text=${text}`} target="_blank" rel="noopener noreferrer">Remind</a> : null}
                </div>
              </div>
            );
          }) : <div className="empty">Nobody owes you anything right now.</div>
        ) : (
          weavers.length ? weavers.map((o) => {
            const m = money(o);
            return (
              <div className="orow" key={o.id}>
                <Link href={`/orders/${o.id}`} className="orow-main">
                  <div className="orow-name">{o.weaver?.name ?? "Weaver"}</div>
                  <div className="orow-sub">for {o.client_name} · paid {naira(m.paidOut)} of {naira(m.weaverCost)}</div>
                </Link>
                <div className="orow-end" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <strong className="num">{naira(m.owedToWeaver)}</strong>
                  <Link className="btn ghost sm" href={`/orders/${o.id}?pay=1`}>Record payment</Link>
                </div>
              </div>
            );
          }) : <div className="empty">All weavers are paid up.</div>
        )}
      </div>
      <p className="mut small">Attach the bank-alert screenshot to each payment so every figure matches the bank.</p>
    </div>
  );
}
