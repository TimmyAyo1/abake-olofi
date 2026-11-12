import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton, SharePdf } from "@/components/Client";
import { Sheet } from "@/components/Sheet";
import { SubmitButton } from "@/components/SubmitButton";
import { getBanks, getSale, getSettings } from "@/lib/data";
import { bankFor } from "@/lib/orders";
import { longDate, naira, shortDate, waLink } from "@/lib/format";
import { buyer, lineTotal, perLabel, receiptFileName, receiptNo, saleMoney } from "@/lib/sales";
import { deleteSale } from "../actions";

export const metadata = { title: "Sale" };

export default async function SalePage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ delete?: string; done?: string }> }) {
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
  const [sale, settings, banks] = await Promise.all([getSale(id), getSettings(), getBanks()]);
  if (!sale) notFound();

  const m = saleMoney(sale);
  const no = receiptNo(sale);
  const bank = bankFor(sale, banks);
  const fmt = (v: number) => Math.round(v).toLocaleString("en-NG");
  const pdf = `/sales/${sale.id}/receipt.pdf`;
  const here = `/sales/${sale.id}`;

  const text = [
    `${settings.biz_name} · Receipt ${no}`,
    shortDate(sale.sold_on),
    "",
    ...sale.lines.map((l) => `${l.desc} (${perLabel(l.qty, l.per)}) ${naira(lineTotal(l))}`),
    ...(m.discount ? [`Discount −${naira(m.discount)}`] : []),
    `Paid ${naira(m.total)}`,
    "",
    "Thank you for shopping with us.",
  ].join("\n");
  const wa = waLink(sale.customer_phone);

  return (
    <div className="page">
      <Link href="/sales" className="mut small back-link">‹ Sales</Link>
      <div className="page-head">
        <div>
          <h1 className="page-title">{buyer(sale)}</h1>
          <div className="mut small">{[no, sale.channel, longDate(sale.sold_on)].filter(Boolean).join(" · ")}</div>
        </div>
        <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{naira(sale.total)}</div>
      </div>

      {sp.done ? <div className="done-note">Saved. The receipt is ready to send.</div> : null}

      <div className="invoice-preview">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div className="inv-title">RECEIPT</div>
          <img src="/logo.svg" alt="Àbáké Olófì" style={{ height: 70, width: "auto" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div><div className="inv-label">Sold to</div><div style={{ fontWeight: 600, letterSpacing: ".08em" }}>{buyer(sale).toUpperCase()}</div></div>
          <div style={{ textAlign: "right" }}><div className="inv-label">Receipt no {no}</div><div className="mut small">{shortDate(sale.sold_on)}</div></div>
        </div>
        <div>
          {sale.lines.map((l, k) => (
            <div className="kv" key={k}>
              <span>{l.desc}<span className="mut"> · {perLabel(l.qty, l.per)}</span></span>
              <span className="num">{fmt(lineTotal(l))}</span>
            </div>
          ))}
          {m.discount ? (
            <>
              <div className="kv"><span className="inv-label">Subtotal</span><span className="num">{fmt(m.subtotal)}</span></div>
              <div className="kv"><span className="inv-label">Discount</span><span className="num">−{fmt(m.discount)}</span></div>
            </>
          ) : null}
          <div className="kv"><strong className="inv-label">Amount paid</strong><strong className="num">{fmt(m.total)}</strong></div>
        </div>
        {bank ? <div className="mut small">Paid into {[bank.bank_name, bank.account_name].filter(Boolean).join(" · ")}</div> : null}
      </div>

      <div className="row-btns" style={{ flexDirection: "row", flexWrap: "wrap" }}>
        <SharePdf url={pdf} filename={receiptFileName(sale)} label="Share receipt" />
        <a className="btn ghost" href={`${pdf}?download=1`}>Download</a>
        <a className="btn quiet" href={pdf} target="_blank" rel="noopener noreferrer">Open</a>
        {wa ? <a className="btn quiet" href={`${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a> : <CopyButton text={text} label="Copy as text" />}
      </div>

      {sale.note ? <p className="mut" style={{ margin: 0 }}>{sale.note}</p> : null}

      <Link href={`${here}?delete=1`} className="linkbtn hot" style={{ alignSelf: "flex-start" }} scroll={false}>Delete this sale</Link>

      {sp.delete ? (
        <Sheet title="Delete this sale?" closeHref={here}>
          <p style={{ margin: 0 }}>{buyer(sale)} · {naira(sale.total)} on {shortDate(sale.sold_on)}. It comes off the Numbers too. This can&apos;t be undone.</p>
          <form action={deleteSale} className="row-btns" style={{ flexDirection: "row" }}>
            <input type="hidden" name="id" value={sale.id} />
            <SubmitButton className="btn danger" pendingText="Deleting…">Delete</SubmitButton>
            <Link href={here} className="btn quiet" scroll={false}>Keep it</Link>
          </form>
        </Sheet>
      ) : null}
    </div>
  );
}
