"use client";

import { useState } from "react";
import { naira } from "@/lib/format";
import type { Line } from "@/lib/types";

const blank = (): Line => ({ desc: "", qty: 1, unit: 0 });

/**
 * Invoice lines. Items have a price and quantity. Sections ("Loom Asooke") group
 * the items below them; a section with a price prints as a bold line ("Sewing").
 * Posts line_kind / line_desc / line_qty / line_unit.
 */
export function LinesEditor({ initial }: { initial?: Line[] }) {
  const [lines, setLines] = useState<Line[]>(initial?.length ? initial : [blank()]);
  const set = (i: number, k: keyof Line, v: string) =>
    setLines((cur) => cur.map((l, j) => (j === i ? { ...l, [k]: k === "desc" ? v : Number(v.replace(/[^\d.]/g, "")) || 0 } : l)));
  const total = lines.reduce((a, l) => a + (l.qty || 1) * (l.unit || 0), 0);
  const remove = (i: number) => setLines((cur) => (cur.length > 1 ? cur.filter((_, j) => j !== i) : [blank()]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="line-row mut small" style={{ fontWeight: 600 }}>
        <span>Item</span><span>Qty</span><span>Rate (₦)</span><span />
      </div>
      {lines.map((l, i) => (
        <div className="line-row" key={i} style={l.heading ? { marginTop: i ? 10 : 0 } : undefined}>
          <input type="hidden" name="line_kind" value={l.heading ? "heading" : "item"} />
          <input
            className="input"
            name="line_desc"
            aria-label={l.heading ? "Section" : "Item"}
            placeholder={l.heading ? "Section, e.g. Loom Asooke" : "e.g. Men's complete (20\"×180\")"}
            value={l.desc}
            onChange={(e) => set(i, "desc", e.target.value)}
            style={l.heading ? { fontWeight: 700 } : undefined}
          />
          <input className="input" name="line_qty" aria-label="Quantity" inputMode="numeric" placeholder={l.heading ? "–" : ""} value={l.heading && !l.unit ? "" : l.qty || ""} onChange={(e) => set(i, "qty", e.target.value)} />
          <input className="input" name="line_unit" aria-label="Rate" inputMode="numeric" placeholder={l.heading ? "optional" : ""} value={l.unit ? l.unit.toLocaleString("en-NG") : ""} onChange={(e) => set(i, "unit", e.target.value)} />
          <button type="button" className="x" aria-label="Remove line" onClick={() => remove(i)}>×</button>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 16 }}>
          <button type="button" className="linkbtn" onClick={() => setLines((cur) => [...cur, blank()])}>+ Item</button>
          <button type="button" className="linkbtn" onClick={() => setLines((cur) => [...cur, { ...blank(), heading: true }])}>+ Section</button>
        </div>
        <span className="num" style={{ fontWeight: 600 }}>Subtotal {naira(total)}</span>
      </div>
    </div>
  );
}
