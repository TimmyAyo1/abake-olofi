"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

export type Pick = { id: string; name: string; sub: string; group: string };

/** Tick orders (or "all like this") and delete them in one go, after a confirm. */
export function SelectList({ items, action }: { items: Pick[]; action: (fd: FormData) => void }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const all = sel.size === items.length && items.length > 0;

  // Same client name created more than once = likely duplicates.
  const dupes = useMemo(() => {
    const seen = new Map<string, string[]>();
    items.forEach((i) => seen.set(i.name.toLowerCase(), [...(seen.get(i.name.toLowerCase()) ?? []), i.id]));
    return Array.from(seen.values()).filter((ids) => ids.length > 1).flatMap((ids) => ids.slice(1)); // keep the oldest
  }, [items]);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input type="hidden" name="back" value="/manage" />
      {Array.from(sel).map((id) => <input key={id} type="hidden" name="ids" value={id} />)}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn quiet sm" onClick={() => setSel(all ? new Set() : new Set(items.map((i) => i.id)))}>{all ? "Clear all" : "Select all"}</button>
        {dupes.length ? <button type="button" className="btn quiet sm" onClick={() => setSel(new Set(dupes))}>Select repeats ({dupes.length})</button> : null}
      </div>
      <p className="mut small" style={{ margin: 0 }}>“Select repeats” ticks every extra order with the same client name and keeps the oldest one.</p>

      <div>
        {items.map((i) => (
          <label key={i.id} className="orow" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={sel.has(i.id)} onChange={() => toggle(i.id)} style={{ width: 20, height: 20, flexShrink: 0 }} />
            <span className="orow-main">
              <span className="orow-name" style={{ display: "block" }}>{i.name}</span>
              <span className="orow-sub">{i.sub}</span>
            </span>
            <span className="orow-end mut small">{i.group}</span>
          </label>
        ))}
      </div>

      {sel.size ? (
        <div className="selbar" role="region" aria-label="Selected orders">
          {confirming ? (
            <>
              <span className="warn">Delete {sel.size} order{sel.size > 1 ? "s" : ""} for good, with their updates, photos and payments? This can&apos;t be undone.</span>
              <span className="grow" />
              <button type="button" className="btn quiet" onClick={() => setConfirming(false)}>Keep them</button>
              <DeleteButton n={sel.size} />
            </>
          ) : (
            <>
              <span className="grow">{sel.size} selected</span>
              <button type="button" className="btn quiet" onClick={() => setSel(new Set())}>Clear</button>
              <button type="button" className="btn destroy" onClick={() => setConfirming(true)}>Delete {sel.size}</button>
            </>
          )}
        </div>
      ) : null}
    </form>
  );
}

function DeleteButton({ n }: { n: number }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn destroy" disabled={pending}>{pending ? "Deleting…" : `Yes, delete ${n}`}</button>;
}
