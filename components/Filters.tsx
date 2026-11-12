"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Search + quick filter chips + a date range, for any list.
 * The page renders each row on the server and hands it over with what it can be filtered by.
 * Rows tagged "_archive" (delivered and paid, cancelled, not active…) stay out of "All"
 * and only show when their own chip is picked or a search finds them.
 * Opening a page with ?q=… or ?f=… starts with that search or chip.
 */

export type FItem = { id: string; group?: string; tags: string[]; text: string; date?: string | null; amount?: number; node: React.ReactNode };
export type FGroup = { key: string; label: string; hot?: boolean; note?: string; showAmount?: boolean };
export type FChip = { key: string; label: string };

type Range = { p: "all" | "today" | "7d" | "month" | "last" | "custom"; from?: string; to?: string };
const RANGES: [Range["p"], string][] = [["today", "Today"], ["7d", "Last 7 days"], ["month", "This month"], ["last", "Last month"], ["all", "Any time"], ["custom", "Pick dates"]];

function lagosToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
}
function shift(d: string, days: number) {
  const x = new Date(d + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + days);
  return x.toISOString().slice(0, 10);
}
function bounds(r: Range): { from: string; to: string; label: string } | null {
  const t = lagosToday();
  if (r.p === "today") return { from: t, to: t, label: "Today" };
  if (r.p === "7d") return { from: shift(t, -6), to: t, label: "Last 7 days" };
  if (r.p === "month") return { from: t.slice(0, 8) + "01", to: t, label: "This month" };
  if (r.p === "last") {
    const end = shift(t.slice(0, 8) + "01", -1);
    return { from: end.slice(0, 8) + "01", to: end, label: "Last month" };
  }
  if (r.p === "custom") {
    let f = r.from || shift(t, -6), to = r.to || t;
    if (f > to) [f, to] = [to, f];
    const d = (s: string) => new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
    return { from: f, to, label: `${d(f)} – ${d(to)}` };
  }
  return null;
}
const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");

export function Filtered({
  items, groups = [], chips, search = "Search", dates, noun = ["item", "items"], empty = "Nothing matches.", money,
}: {
  items: FItem[];
  groups?: FGroup[];
  chips: FChip[];
  search?: string;
  /** label for the date filter, e.g. "Added" — leave out for no date filter */
  dates?: string;
  noun?: [string, string];
  empty?: string;
  /** show the total of the shown rows' amounts, e.g. "to collect" */
  money?: string;
}) {
  const sp = useSearchParams();
  const [q, setQ] = useState(() => sp.get("q") ?? "");
  const [chip, setChip] = useState(() => (chips.some((c) => c.key === sp.get("f")) ? sp.get("f")! : "all"));
  const [range, setRange] = useState<Range>({ p: "all" });
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menu.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  const R = bounds(range);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);

  // Search and dates first, so each chip can show how many it would give.
  const base = useMemo(
    () => items.filter((it) =>
      (!R || (it.date && it.date >= R.from && it.date <= R.to)) &&
      words.every((w) => it.text.toLowerCase().includes(w))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, q, R?.from, R?.to],
  );
  const inChip = (it: FItem, k: string) => (k === "all" ? words.length > 0 || !it.tags.includes("_archive") : it.tags.includes(k));
  const shown = base.filter((it) => inChip(it, chip));
  const count = (k: string) => base.filter((it) => inChip(it, k)).length;
  const filtering = chip !== "all" || !!R || words.length > 0;
  const total = shown.reduce((a, it) => a + (it.amount ?? 0), 0);

  const order = groups.length ? groups : [{ key: "", label: "" }];
  const sections = order
    .map((g) => ({ g, rows: shown.filter((it) => (groups.length ? it.group === g.key : true)) }))
    .filter((s) => s.rows.length);

  return (
    <div className="ftools-wrap">
      <div className="ftools">
        <div className="ftools-top">
          <input className="input fsearch" type="search" placeholder={search} aria-label={search} value={q} onChange={(e) => setQ(e.target.value)} />
          {dates ? (
            <div className="fdate" ref={menu}>
              <button type="button" className={`fbtn${R ? " on" : ""}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
                <span>{R ? R.label : dates}</span>
              </button>
              {open ? (
                <div className="fmenu" role="listbox" aria-label={dates}>
                  <div className="fmenu-h">{dates}</div>
                  {RANGES.map(([k, l]) => (
                    <button key={k} type="button" role="option" aria-selected={range.p === k} className={`fopt${range.p === k ? " on" : ""}`}
                      onClick={() => { setRange((r) => ({ ...r, p: k })); if (k !== "custom") setOpen(false); }}>
                      <span>{l}</span>{range.p === k ? <span aria-hidden="true">✓</span> : null}
                    </button>
                  ))}
                  {range.p === "custom" ? (
                    <div className="fdates">
                      <label>From<input className="input" type="date" value={R?.from ?? ""} max={lagosToday()} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /></label>
                      <label>To<input className="input" type="date" value={R?.to ?? ""} max={lagosToday()} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></label>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="fchips" role="group" aria-label="Show">
          {chips.map((c) => {
            const n = count(c.key);
            if (c.key !== "all" && n === 0 && chip !== c.key) return null;
            return (
              <button key={c.key} type="button" className="fchip" aria-pressed={chip === c.key} onClick={() => setChip(c.key)}>
                {c.label}<span className="c">{n}</span>
              </button>
            );
          })}
        </div>

        {filtering ? (
          <div className="fcount">
            <span>{shown.length} {shown.length === 1 ? noun[0] : noun[1]}{money && total ? ` · ${naira(total)} ${money}` : ""}</span>
            <button type="button" className="linkbtn" onClick={() => { setQ(""); setChip("all"); setRange({ p: "all" }); }}>Clear</button>
          </div>
        ) : null}
      </div>

      {sections.length === 0 ? <div className="empty" style={{ marginTop: 16 }}>{empty}</div> : null}
      {sections.map(({ g, rows }) => (
        <div key={g.key || "all"}>
          {g.label ? (
            <div className={`section-h label${g.hot ? " hot" : ""}`}>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>{g.hot ? <span className="dot" /> : null}{g.label}</span>
              <span className="num">{g.showAmount ? naira(rows.reduce((a, it) => a + (it.amount ?? 0), 0)) : String(rows.length).padStart(2, "0")}</span>
            </div>
          ) : null}
          {g.note ? <p className="mut small" style={{ margin: "4px 0 2px" }}>{g.note}</p> : null}
          {rows.map((it) => <div key={it.id} className="frow">{it.node}</div>)}
        </div>
      ))}
    </div>
  );
}
