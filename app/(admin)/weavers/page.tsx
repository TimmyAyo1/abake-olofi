import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/SubmitButton";
import { Sheet } from "@/components/Sheet";
import { shortDate, today } from "@/lib/format";
import { addWeaver, deleteWeaver, renameWeaver, setWeaverActive } from "./actions";

export const metadata = { title: "Weavers" };

type W = { id: string; name: string; active: boolean };
type O = { id: string; client_name: string; title: string | null; weaver_id: string | null; weaver_promised: string | null; next_call: string | null };

export default async function WeaversPage(props: { searchParams: Promise<{ edit?: string; add?: string; err?: string; del?: string }> }) {
  const sp = await props.searchParams;
  const supabase = await createClient();
  const [{ data: ws }, { data: os }] = await Promise.all([
    supabase.from("weavers").select("id, name, active").order("name"),
    supabase.from("orders").select("id, client_name, title, weaver_id, weaver_promised, next_call").eq("stage", "weaving").eq("cancelled", false),
  ]);
  const weavers = (ws ?? []) as W[];
  const orders = (os ?? []) as O[];
  const byWeaver = (id: string) => orders.filter((o) => o.weaver_id === id).sort((a, b) => (a.weaver_promised ?? "").localeCompare(b.weaver_promised ?? ""));
  const active = weavers.filter((w) => w.active).sort((a, b) => byWeaver(b.id).length - byWeaver(a.id).length || a.name.localeCompare(b.name));
  const resting = weavers.filter((w) => !w.active);
  const editing = sp.edit ? weavers.find((w) => w.id === sp.edit) : null;
  const t = today();

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <h1 className="page-title">Weavers</h1>
        <Link href="/weavers?add=1" className="btn">Add weaver</Link>
      </div>
      <p className="mut" style={{ margin: 0 }}>Who is weaving what right now. Give new work to whoever has the least on their loom.</p>

      {active.length === 0 ? <div className="empty">No weavers yet. Add the weavers she works with, then pick them when handing over an order.</div> : null}

      <div>
        {active.map((w) => {
          const list = byWeaver(w.id);
          return (
            <section key={w.id} style={{ borderTop: "1px solid var(--rule)", padding: "14px 0 6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <Link href={`/weavers?edit=${w.id}`} className="display" style={{ fontSize: 24 }}>{w.name}</Link>
                <span className={list.length >= 3 ? "hot" : "mut"} style={{ fontWeight: 600 }}>
                  {list.length === 0 ? "Free" : `${list.length} order${list.length > 1 ? "s" : ""} on the loom`}
                </span>
              </div>
              {list.map((o) => (
                <Link key={o.id} href={`/orders/${o.id}`} className="kv" style={{ borderTopColor: "var(--line)" }}>
                  <span>{o.client_name}{o.title ? <span className="mut"> · {o.title}</span> : null}</span>
                  <span className={`small ${o.weaver_promised && o.weaver_promised < t ? "hot" : "mut"}`}>due {shortDate(o.weaver_promised)}</span>
                </Link>
              ))}
            </section>
          );
        })}
      </div>

      {resting.length ? (
        <section>
          <div className="label mut" style={{ paddingBottom: 6 }}>Not active</div>
          {resting.map((w) => (
            <div className="kv" key={w.id}>
              <Link href={`/weavers?edit=${w.id}`} className="mut">{w.name}</Link>
              <form action={setWeaverActive}><input type="hidden" name="id" value={w.id} /><input type="hidden" name="active" value="1" /><button className="linkbtn small">Make active</button></form>
            </div>
          ))}
        </section>
      ) : null}

      {sp.add ? (
        <Sheet title="Add a weaver" closeHref="/weavers">
          <form action={addWeaver} className="stack">
            <label className="field">Name<input name="name" required autoFocus placeholder="e.g. Mr A" /></label>
            <SubmitButton className="btn block">Add to the list</SubmitButton>
          </form>
        </Sheet>
      ) : null}

      {editing ? (
        <Sheet title={editing.name} kicker="Weaver" closeHref="/weavers">
          <form action={renameWeaver} className="stack">
            <input type="hidden" name="id" value={editing.id} />
            <label className="field">Name<input name="name" required defaultValue={editing.name} /></label>
            <SubmitButton className="btn block">Save</SubmitButton>
          </form>
          <form action={setWeaverActive}>
            <input type="hidden" name="id" value={editing.id} />
            <input type="hidden" name="active" value="0" />
            <SubmitButton className="btn quiet block">Take off the active list</SubmitButton>
          </form>
          <p className="mut small" style={{ margin: 0 }}>Taking them off the active list hides them when handing over orders. Their past orders stay as they are.</p>
          {sp.err ? <p className="error" style={{ margin: 0 }}>{sp.err}</p> : null}
          {sp.del ? (
            <form action={deleteWeaver} className="box" style={{ borderColor: "var(--bad)" }}>
              <input type="hidden" name="id" value={editing.id} />
              <strong>Delete {editing.name} for good?</strong>
              <span className="mut small">Past orders they wove will no longer show a weaver name. This can&apos;t be undone.</span>
              <div className="row-btns">
                <Link href={`/weavers?edit=${editing.id}`} className="btn quiet">Keep</Link>
                <SubmitButton className="btn destroy" pendingText="Deleting…">Delete</SubmitButton>
              </div>
            </form>
          ) : (
            <Link href={`/weavers?edit=${editing.id}&del=1`} className="btn danger block">Delete weaver</Link>
          )}
        </Sheet>
      ) : null}
    </div>
  );
}
