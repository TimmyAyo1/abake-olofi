"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { naira } from "@/lib/format";
import { CHANNELS, UNITS } from "@/lib/sales";
import type { Bank } from "@/lib/types";

type Row = { desc: string; per: string; qty: number; unit: number };
const blank = (): Row => ({ desc: "", per: "piece", qty: 1, unit: 0 });
const digits = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;

/** A sale from what's already made. Only the items are needed; it's paid on the spot. */
export function SaleForm({ action, banks, today }: { action: (fd: FormData) => void; banks: Bank[]; today: string }) {
  const [key] = useState(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random()));
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [discount, setDiscount] = useState(0);
  const set = (i: number, k: keyof Row, v: string) =>
    setRows((cur) => cur.map((r, j) => (j === i ? { ...r, [k]: k === "desc" || k === "per" ? v : digits(v) } : r)));
  const subtotal = rows.reduce((a, r) => a + (r.qty || 1) * (r.unit || 0), 0);
  const total = Math.max(0, subtotal - discount);
  const def = banks.find((b) => b.is_default) ?? banks[0];

  return (
    <form action={action} className="stack">
      <input type="hidden" name="client_key" value={key} />

      <div className="field">
        What they bought
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="sale-row mut small" style={{ fontWeight: 600 }}>
            <span>Item</span><span>Qty</span><span>Per</span><span>Price (₦)</span><span />
          </div>
          {rows.map((r, i) => (
            <div className="sale-row" key={i}>
              <input className="input" name="sale_desc" aria-label="Item" placeholder="e.g. Sanyan aso-oke" value={r.desc} onChange={(e) => set(i, "desc", e.target.value)} required={i === 0} autoFocus={i === 0} />
              <input className="input" name="sale_qty" aria-label="Quantity" inputMode="decimal" value={r.qty || ""} onChange={(e) => set(i, "qty", e.target.value)} />
              <select className="input" name="sale_per" aria-label="Sold per" value={r.per} onChange={(e) => set(i, "per", e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <input className="input" name="sale_unit" aria-label="Price each" inputMode="numeric" value={r.unit ? r.unit.toLocaleString("en-NG") : ""} onChange={(e) => set(i, "unit", e.target.value)} required={i === 0} />
              <button type="button" className="x" aria-label="Remove item" onClick={() => setRows((cur) => (cur.length > 1 ? cur.filter((_, j) => j !== i) : [blank()]))}>×</button>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button type="button" className="linkbtn" onClick={() => setRows((cur) => [...cur, blank()])}>+ Item</button>
            <label className="mut small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              Discount ₦
              <input className="input" name="discount" inputMode="numeric" style={{ width: 110, padding: "7px 8px" }} value={discount ? discount.toLocaleString("en-NG") : ""} onChange={(e) => setDiscount(digits(e.target.value))} />
            </label>
          </div>
          <div className="sale-total">
            <span>{discount ? <span className="mut">{naira(subtotal)} − {naira(discount)} = </span> : null}Total paid</span>
            <strong className="num">{naira(total)}</strong>
          </div>
        </div>
      </div>

      <div className="field">
        How they bought
        <div className="chips">
          {CHANNELS.map((c) => (
            <label className="chip" key={c}>
              <input type="radio" name="channel" value={c} defaultChecked={c === "Walk-in"} />
              <span>{c}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="field">Customer&apos;s name <span className="hint">optional · leave empty for a walk-in</span>
        <input name="customer_name" autoComplete="off" />
      </label>

      {banks.length > 1 ? (
        <div className="field">
          Paid into
          <div className="chips">
            {banks.map((b) => (
              <label className="chip" key={b.id}>
                <input type="radio" name="bank_account_id" value={b.id} defaultChecked={b.id === def?.id} />
                <span>{b.bank_name}</span>
              </label>
            ))}
          </div>
        </div>
      ) : def ? <input type="hidden" name="bank_account_id" value={def.id} /> : null}

      <details className="more">
        <summary>More details <span className="mut small" style={{ fontWeight: 400, marginLeft: 8, marginRight: "auto" }}>optional</span></summary>
        <div className="stack-in">
          <label className="field">Date sold<input type="date" name="sold_on" defaultValue={today} max={today} /></label>
          <label className="field">WhatsApp number <span className="hint">to send the receipt</span><input name="customer_phone" inputMode="tel" placeholder="080…" /></label>
          <label className="field">Note<input name="note" placeholder="e.g. Paid cash, collected by her sister" /></label>
        </div>
      </details>

      <Save />
    </form>
  );
}

function Save() {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn block" disabled={pending}>{pending ? "Saving…" : "Save and make receipt"}</button>;
}
