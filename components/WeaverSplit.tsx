"use client";

import { useMemo, useState } from "react";

type W = { id: string; name: string; load: number };
type L = { idx: number; desc: string };
type Row = { key: number; weaver: string; newName: string; items: number[]; date: string };

function plus(d: string, n: number) {
  if (!d) return "";
  const x = new Date(d + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

/**
 * Hand an order to one weaver or split it: each row is a weaver, the invoice items
 * they'll make, and the date they gave. The client's date follows the latest weaver
 * date plus the buffer, unless it was already promised or changed by hand.
 * Posts a_weaver / a_new / a_items / a_date per row, plus client_promised.
 */
export function WeaverSplit({ weavers, lines, buffer, defaultDate, clientDate, multi }: {
  weavers: W[]; lines: L[]; buffer: number; defaultDate: string; clientDate: string; multi: boolean;
}) {
  const all = lines.map((l) => l.idx);
  // One weaver: a single row with every item. Split: start with two rows; ticking an item for one weaver takes it off the other.
  const [rows, setRows] = useState<Row[]>(
    multi
      ? [{ key: 1, weaver: "", newName: "", items: all, date: defaultDate }, { key: 2, weaver: "", newName: "", items: [], date: defaultDate }]
      : [{ key: 1, weaver: "", newName: "", items: all, date: defaultDate }]
  );
  const [client, setClient] = useState(clientDate);
  const [manual, setManual] = useState(!!clientDate);

  const latest = useMemo(() => rows.map((r) => r.date).filter(Boolean).sort().pop() ?? "", [rows]);
  const autoClient = plus(latest, buffer);
  const shownClient = manual ? client : autoClient;

  const set = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const toggle = (key: number, idx: number) =>
    setRows((rs) => rs.map((r) => {
      if (r.key === key) return { ...r, items: r.items.includes(idx) ? r.items.filter((i) => i !== idx) : [...r.items, idx] };
      return { ...r, items: r.items.filter((i) => i !== idx) }; // an item goes to one weaver only
    }));
  const unassigned = lines.filter((l) => !rows.some((r) => r.items.includes(l.idx)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rows.map((r, n) => (
        <div key={r.key} className="box" style={{ gap: 12, position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>{multi ? `Weaver ${n + 1}` : "Which weaver?"}</strong>
            {multi && rows.length > 2 ? (
              <button type="button" className="linkbtn small" style={{ fontWeight: 500 }} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>Remove</button>
            ) : null}
          </div>

          <input type="hidden" name="a_weaver" value={r.newName ? "" : r.weaver} />
          {/* Stops "Start weaving" until a weaver is chosen for this row. */}
          <input
            aria-hidden="true" tabIndex={-1} required readOnly value={r.newName || r.weaver}
            onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity("Pick a weaver or type a new name")}
            style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
          />
          <input type="hidden" name="a_new" value={r.newName} />
          <input type="hidden" name="a_items" value={r.items.join(",")} />

          {weavers.length ? (
            <div className="chips">
              {weavers.map((w) => (
                <label className="chip" key={w.id}>
                  <input type="radio" name={`pick-${r.key}`} checked={!r.newName && r.weaver === w.id} onChange={() => set(r.key, { weaver: w.id, newName: "" })} />
                  <span>{w.name} <span style={{ opacity: 0.6, fontWeight: 400 }}>· {w.load}</span></span>
                </label>
              ))}
            </div>
          ) : null}
          <label className="field">{weavers.length ? "Or a new weaver" : "Weaver's name"}
            <input value={r.newName} onChange={(e) => set(r.key, { newName: e.target.value })} placeholder="Name" autoComplete="off" />
          </label>

          {multi && lines.length ? (
            <div className="field">
              Items for this weaver
              <div className="chips">
                {lines.map((l) => (
                  <label className="chip" key={l.idx}>
                    <input type="checkbox" checked={r.items.includes(l.idx)} onChange={() => toggle(r.key, l.idx)} />
                    <span>{l.desc || `Item ${l.idx + 1}`}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <label className="field">Date this weaver confirmed
            <input type="date" name="a_date" required value={r.date} onChange={(e) => set(r.key, { date: e.target.value })} />
          </label>
        </div>
      ))}

      {multi && unassigned.length ? (
        <p className="error" style={{ margin: 0 }}>Not given to anyone yet: {unassigned.map((l) => l.desc).join(", ")}</p>
      ) : null}

      {multi ? <button
        type="button"
        className="btn quiet"
        onClick={() => setRows((rs) => [...rs, { key: Date.now(), weaver: "", newName: "", items: [], date: defaultDate }])}
      >
        + Add another weaver
      </button> : null}

      <label className="field">
        Date to tell the client <span className="hint">{manual ? "set by you" : `latest weaver date + ${buffer} days`}</span>
        <input type="date" name="client_promised" required value={shownClient} onChange={(e) => { setClient(e.target.value); setManual(true); }} />
      </label>
    </div>
  );
}
