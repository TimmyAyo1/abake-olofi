import Link from "next/link";
import { getBanks, getOrders } from "@/lib/data";
import { bankFor, money } from "@/lib/orders";
import { naira, relativeDay, shortDate, waLink } from "@/lib/format";
import { CopyButton } from "@/components/Client";
import { Filtered, type FItem } from "@/components/Filters";
import type { Bank, OrderFull } from "@/lib/types";

export const metadata = { title: "Money" };

/** The WhatsApp message for a balance reminder, worded for where the order is. */
function reminder(o: OrderFull, balance: number, bank: Bank | null) {
  const pay = bank ? ` to ${bank.bank_name}, ${bank.account_number}${bank.account_name ? ` (${bank.account_name})` : ""}` : "";
  const what = o.title ? `your ${o.title}` : "your aso-oke";
  if (o.stage === "ready")
    return `Hello ${o.client_name}, good news from Àbáké Olófì: ${what} is ready! Please send the balance of ${naira(balance)}${pay} and we'll send it out to you right away. Thank you!`;
  if (o.stage === "delivered")
    return `Hello ${o.client_name}, this is Abake from Àbáké Olófì. I hope you're enjoying ${what}. A gentle reminder that ${naira(balance)} is still outstanding${pay}. Thank you!`;
  return `Hello ${o.client_name}, this is Abake from Àbáké Olófì. Just a note that the balance of ${naira(balance)} on ${what} is due before delivery${pay}. Thank you!`;
}

export default async function MoneyPage() {
  const [all, banks] = await Promise.all([getOrders(), getBanks()]);
  const owing = all.filter((o) => !o.cancelled && o.stage !== "enquiry" && money(o).balance > 0);

  const collectNow = owing.filter((o) => o.stage === "ready");          // back in the shop: get paid before it goes out
  const overdue = owing.filter((o) => o.stage === "delivered");          // already delivered, still owing
  const later = owing.filter((o) => o.stage !== "ready" && o.stage !== "delivered"); // still being made
  const sum = (list: OrderFull[]) => list.reduce((a, o) => a + money(o).balance, 0);

  function Row({ o, tone }: { o: OrderFull; tone: "now" | "overdue" | "later" }) {
    const m = money(o);
    const wa = waLink(o.client_phone);
    const text = reminder(o, m.balance, bankFor(o, banks));
    const sub =
      tone === "now" ? `Back from the weaver ${relativeDay(o.ready_at)} · paid ${naira(m.paidIn)} of ${naira(m.total)}`
      : tone === "overdue" ? `Delivered ${relativeDay(o.delivered_at)} · paid ${naira(m.paidIn)} of ${naira(m.total)}`
      : `On the loom${o.client_promised ? ` · ready ${shortDate(o.client_promised)}` : ""} · paid ${naira(m.paidIn)} of ${naira(m.total)}`;
    return (
      <div className="orow">
        <Link href={`/orders/${o.id}`} className="orow-main">
          <div className="orow-name">{o.client_name}</div>
          <div className="orow-sub">{sub}</div>
        </Link>
        <div className="orow-end" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <strong className={`num ${tone !== "later" ? "hot" : ""}`}>{naira(m.balance)}</strong>
          {tone !== "later" ? (
            wa
              ? <a className="btn sm" href={`${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">Ask for balance</a>
              : <CopyButton text={text} label="Copy reminder" className="btn sm" />
          ) : null}
        </div>
      </div>
    );
  }

  function item(o: OrderFull, tone: "now" | "overdue" | "later"): FItem {
    const tags: string[] = [tone];
    if (!waLink(o.client_phone)) tags.push("nophone");
    return { id: o.id, group: tone, tags, text: [o.client_name, o.ref, o.title, o.client_phone].filter(Boolean).join(" "), amount: money(o).balance, node: <Row o={o} tone={tone} /> };
  }

  return (
    <div className="page">
      <h1 className="page-title">Money</h1>

      <div className="stats">
        <div className="stat"><span className="v num hot">{naira(sum(collectNow) + sum(overdue))}</span><span className="k">To collect now</span></div>
        <div className="stat"><span className="v num">{naira(sum(later))}</span><span className="k">Due when ready</span></div>
        <div className="stat"><span className="v num">{naira(sum(owing))}</span><span className="k">Clients owe in total</span></div>
      </div>

      {owing.length === 0 ? <div className="empty">Nobody owes anything right now.</div> : null}

      {owing.length ? (
        <Filtered
          items={[
            ...collectNow.map((o) => item(o, "now")),
            ...overdue.map((o) => item(o, "overdue")),
            ...later.map((o) => item(o, "later")),
          ]}
          groups={[
            { key: "now", label: "Ready in the shop · collect before delivery", hot: true, note: "These are back from the weaver. Ask for the balance before sending them out." },
            { key: "overdue", label: "Delivered · still owing", hot: true },
            { key: "later", label: "Still being made · balance due when ready" },
          ]}
          chips={[
            { key: "all", label: "All" },
            { key: "now", label: "Collect now" },
            { key: "overdue", label: "Delivered, still owing" },
            { key: "later", label: "Still being made" },
            { key: "nophone", label: "No WhatsApp number" },
          ]}
          search="Search client or order"
          noun={["client", "clients"]}
          money="owed"
          empty="Nobody matches."
        />
      ) : null}

      <p className="mut small">Attach the bank-alert screenshot to each payment so every figure matches the bank. Add a client&apos;s WhatsApp number to open the chat straight from here.</p>
    </div>
  );
}
