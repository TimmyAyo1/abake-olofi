"use client";

import { useState } from "react";
import Link from "next/link";
import { SOURCES } from "@/lib/orders";
import type { Order, Template } from "@/lib/types";
import { LinesEditor } from "./LinesEditor";
import { MediaPicker } from "./MediaPicker";
import { SubmitButton } from "./SubmitButton";
import { useFormStatus } from "react-dom";

type Props = {
  action: (fd: FormData) => void;
  templates?: Template[];
  order?: Order;
  repeatOf?: Partial<Order> | null;
};

/**
 * New order / edit order. Only the client's name is required.
 * Everything else that isn't needed every time sits under "More details".
 */
export function OrderForm({ action, templates = [], order, repeatOf }: Props) {
  const base: Partial<Order> = order ?? repeatOf ?? {};
  const editing = !!order;
  // One key per form: if it's submitted twice, the server keeps only the first order.
  const [formKey] = useState(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random()));
  const [tpl, setTpl] = useState<string>("");
  const t = templates.find((x) => x.id === tpl);
  const [title, setTitle] = useState(base.title ?? "");
  const [specs, setSpecs] = useState(base.specs ?? "");
  const hasExtras = !!(base.title || base.specs || base.client_phone);

  function pick(id: string) {
    setTpl(id === tpl ? "" : id);
    const x = templates.find((y) => y.id === id);
    if (x && id !== tpl) { setTitle(x.name); setSpecs(x.specs ?? ""); }
  }

  return (
    <form action={action} className="stack">
      {!editing ? <input type="hidden" name="client_key" value={formKey} /> : null}
      {order ? <input type="hidden" name="id" value={order.id} /> : null}
      {t?.weaver_cost ? <input type="hidden" name="weaver_cost" value={t.weaver_cost} /> : null}

      {!editing && templates.length ? (
        <div className="field">
          Start from
          <div className="chips">
            {templates.map((x) => (
              <label className="chip" key={x.id}>
                <input type="radio" name="tpl" value={x.id} checked={tpl === x.id} onChange={() => {}} onClick={() => pick(x.id)} />
                <span>{x.name}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <label className="field">Client&apos;s name<input name="client_name" required defaultValue={base.client_name ?? ""} autoComplete="off" autoFocus={!editing} /></label>

      <div className="field">
        Found you on
        <div className="chips">
          {SOURCES.map((s) => (
            <label className="chip" key={s}>
              <input type="radio" name="source" value={s} defaultChecked={(base.source ?? "TikTok") === s} />
              <span>{s}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="field">Proposed delivery date <span className="hint">optional · the client sees this</span>
        <input type="date" name="client_promised" defaultValue={base.client_promised ?? ""} />
      </label>

      <div className="field">
        Invoice
        <LinesEditor key={tpl || "base"} initial={t ? t.lines : base.lines} />
      </div>

      {!editing ? (
        <div className="field">
          Sample or inspiration photos <span className="hint">optional</span>
          <MediaPicker folder={`orders/new-${Date.now().toString(36)}`} label="Photo" />
        </div>
      ) : null}

      <details className="more" open={editing && hasExtras}>
        <summary>More details <span className="mut small" style={{ fontWeight: 400, marginLeft: 8, marginRight: "auto" }}>optional</span></summary>
        <div className="stack-in">
          <label className="field">Project name<input name="title" placeholder="e.g. Bridal gele and ipele" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="field">What they want <span className="hint">colours, pattern, pieces, sizes</span>
            <textarea name="specs" value={specs} onChange={(e) => setSpecs(e.target.value)} />
          </label>
          <label className="field">WhatsApp number <span className="hint">lets the Remind buttons open her chat</span><input name="client_phone" inputMode="tel" placeholder="080…" defaultValue={base.client_phone ?? ""} /></label>
        </div>
      </details>

      {editing ? (
        <div className="row-btns">
          <SubmitButton className="btn">Save changes</SubmitButton>
          <Link href={`/orders/${order!.id}`} className="btn quiet">Cancel</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <IntentButtons />
        </div>
      )}
    </form>
  );
}

/** Both save buttons lock while the order is being saved. */
function IntentButtons() {
  const { pending } = useFormStatus();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button type="submit" name="intent" value="invoice" className="btn block" disabled={pending}>{pending ? "Saving…" : "Save and send invoice"}</button>
      <button type="submit" name="intent" value="talking" className="btn ghost block" disabled={pending}>Save, still talking</button>
    </div>
  );
}
