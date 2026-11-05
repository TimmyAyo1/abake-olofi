"use client";

import { useState } from "react";

/** Copies text; falls back to selecting it when the clipboard is blocked. */
export function CopyButton({ text, label, className = "btn quiet" }: { text: string; label: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          window.prompt("Copy this:", text);
        }
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

function plus(d: string, n: number) {
  if (!d) return "";
  const x = new Date(d + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

/** Weaver's date and the date for the client, which follows it plus the buffer until changed by hand. */
export function DatePair({ weaver, client, buffer }: { weaver: string; client: string; buffer: number }) {
  const [w, setW] = useState(weaver);
  const [c, setC] = useState(client || plus(weaver, buffer));
  const [manual, setManual] = useState(!!client); // keep a date already promised to the client
  return (
    <>
      <label className="field">
        Date the weaver confirmed
        <input type="date" name="weaver_promised" required value={w} onChange={(e) => { setW(e.target.value); if (!manual) setC(plus(e.target.value, buffer)); }} />
      </label>
      <label className="field">
        Date to tell the client <span className="hint">Weaver&apos;s date + {buffer} days buffer</span>
        <input type="date" name="client_promised" required value={c} onChange={(e) => { setC(e.target.value); setManual(true); }} />
      </label>
    </>
  );
}

/** Shows its children only while the checkbox is ticked. */
export function Reveal({ name, label, hint, children }: { name: string; label: string; hint?: string; children: React.ReactNode }) {
  const [on, setOn] = useState(false);
  return (
    <div className="box soft">
      <label className="toggle">
        <span><strong>{label}</strong>{hint ? <span className="mut small" style={{ display: "block" }}>{hint}</span> : null}</span>
        <input type="checkbox" name={name} checked={on} onChange={(e) => setOn(e.target.checked)} />
      </label>
      {on ? children : null}
    </div>
  );
}

/**
 * Shares the invoice PDF straight into WhatsApp (phone share sheet) where the browser allows it,
 * otherwise downloads it.
 */
export function SharePdf({ url, filename, label = "Share PDF", className = "btn" }: { url: string; filename: string; label?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error("pdf");
          const blob = await res.blob();
          const file = new File([blob], filename, { type: "application/pdf" });
          const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
          if (nav.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: filename });
          } else {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 4000);
          }
        } catch (e) {
          if ((e as Error)?.name !== "AbortError") window.open(url, "_blank");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Preparing…" : label}
    </button>
  );
}
