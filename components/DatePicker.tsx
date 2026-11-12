"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * The brand date picker, used everywhere instead of the browser's own calendar.
 * Posts the date as YYYY-MM-DD under `name`, exactly like <input type="date"> did.
 */

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const lagosToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
const show = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthTitle = (y: number, m: number) => new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

type Props = {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  placeholder?: string;
  label?: string;
  compact?: boolean;
};

export function DatePicker({ name, value, defaultValue = "", onChange, min, max, required, placeholder = "Pick a date", label, compact }: Props) {
  const [own, setOwn] = useState(defaultValue);
  const v = value ?? own;
  const [open, setOpen] = useState(false);
  const start = v || lagosToday();
  const [view, setView] = useState({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 });
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const t = lagosToday();

  function set(d: string) {
    if (value === undefined) setOwn(d);
    onChange?.(d);
    setOpen(false);
    btn.current?.focus();
  }

  function toggle() {
    if (!open) {
      const s = v || t;
      setView({ y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)) - 1 });
    }
    setOpen((o) => !o);
  }

  // Place it under the field, or above when there's no room; keep it on screen.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btn.current?.getBoundingClientRect();
      if (!r) return;
      const w = 296, h = pop.current?.offsetHeight ?? 340;
      const up = r.bottom + 8 + h > window.innerHeight && r.top - 8 - h > 0;
      const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
      setPos({ top: up ? r.top - 8 - h : r.bottom + 8, left, up });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open, view]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      const n = e.target as Node;
      if (!pop.current?.contains(n) && !btn.current?.contains(n)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); btn.current?.focus(); } };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", key, true); };
  }, [open]);

  const first = new Date(Date.UTC(view.y, view.m, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Monday first
  const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => iso(view.y, view.m, i + 1))];
  while (cells.length % 7) cells.push(null);
  const step = (n: number) => setView(({ y, m }) => { const d = new Date(Date.UTC(y, m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const off = (d: string) => (!!min && d < min) || (!!max && d > max);

  return (
    <span className={`dp${compact ? " dp-compact" : ""}`}>
      <button type="button" ref={btn} className={`dp-btn${v ? "" : " empty"}`} aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={toggle}>
        <span>{v ? show(v) : placeholder}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 7h16v13H4zM4 11h16M8 4v4M16 4v4" /></svg>
      </button>
      {name ? <input type="hidden" name={name} value={v} /> : null}
      {required ? <input className="dp-req" tabIndex={-1} aria-hidden="true" required value={v} onChange={() => {}} /> : null}
      {open && typeof document !== "undefined"
        ? createPortal(
            <div ref={pop} className="dp-pop" role="dialog" aria-label={label ?? "Choose a date"} style={{ top: pos?.top ?? -9999, left: pos?.left ?? 0 }}>
              <div className="dp-head">
                <strong>{monthTitle(view.y, view.m)}</strong>
                <span style={{ display: "flex", gap: 4 }}>
                  <button type="button" className="dp-nav" aria-label="Previous month" onClick={() => step(-1)}>‹</button>
                  <button type="button" className="dp-nav" aria-label="Next month" onClick={() => step(1)}>›</button>
                </span>
              </div>
              <div className="dp-grid">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="dp-wd">{d}</span>)}
                {cells.map((d, i) =>
                  d ? (
                    <button key={d} type="button" disabled={off(d)} onClick={() => set(d)}
                      className={`dp-day${d === v ? " on" : ""}${d === t ? " today" : ""}`} aria-pressed={d === v} aria-label={show(d)}>
                      {Number(d.slice(8))}
                    </button>
                  ) : <span key={"x" + i} />
                )}
              </div>
              <div className="dp-foot">
                <button type="button" className="dp-link" disabled={off(t)} onClick={() => set(t)}>Today</button>
                {!required && v ? <button type="button" className="dp-link mut" onClick={() => set("")}>Clear</button> : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
