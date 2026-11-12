import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/SubmitButton";
import { Sheet } from "@/components/Sheet";
import { Filtered, type FItem } from "@/components/Filters";
import { shortDate, today } from "@/lib/format";
import { addWeaver, deleteWeaver, renameWeaver, setWeaverActive } from "./actions";

export const metadata = { title: "Weavers" };

type W = { id: string; name: string; active: boolean };
type O = { id: string; client_name: string; title: string | null; weaver_id: string | null; weaver_promised: string | null; next_call: string | null };

export default async function WeaversPage(props: { searchParams: Promise<{ edit?: string; add?: string; err?: string; del?: string }> }) {
  const sp = await props.searchParams;
  const supabase = await createClient();
  const [{ data: ws }, shares] = await Promise.all([
    supabase.from("weavers").select("id, name, active").order("name"),
    // Each weaver's share still on the loom (an order split across weavers shows under each of them).
    supabase
      .from("order_assignments")
      .select("weaver_id, items, weaver_promised, next_call, received_at, order:orders!inner(id, client_name, title, stage, cancelled)")
      .is("received_at", null)
      .eq("order.stage", "weaving")
      .eq("order.cancelled", false),
  ]);
  const weavers = (ws ?? []) as W[];
  let orders: O[];
  if (!shares.error) {
    type S = { weaver_id: string | null; items: string | null; weaver_promised: string | null; next_call: string | null; order: { id: string; client_name: string; title: string | null } };
    orders = ((shares.data ?? []) as unknown as S[]).map((a) => ({
      id: a.order.id, client_name: a.order.client_name, title: a.items || a.order.title,
      weaver_id: a.weaver_id, weaver_promised: a.weaver_promised, next_call: a.next_call,
    }));
  } else {
    const { data: os } = await supabase.from("orders").select("id, client_name, title, weaver_id, weaver_promised, next_call").eq("stage", "weaving").eq("cancelled", false);
    orders = (os ?? []) as O[];
  }
  const byWeaver = (id: string) => orders.filter((o) => o.weaver_id === id).sort((a, b) => (a.weaver_promised ?? "").localeCompare(b.weaver_promised ?? ""));
  const active = weavers.filter((w) => w.active).sort((a, b) => byWeaver(b.id).length - byWeaver(a.id).length || a.name.localeCompare(b.name));
  const resting = weavers.filter((w) => !w.active);
  const editing = sp.edit ? weavers.find((w) => w.id === sp.edit) : null;
  const t = today();

  const items: FItem[] = [
    ...active.map((w) => {
      const list = byWeaver(w.id);
      const tags = [list.length ? "busy" : "free"];
      if (list.some((o) => o.weaver_promised && o.weaver_promised < t)) tags.push("late");
      if (list.some((o) => o.next_call && o.next_call <= t)) tags.push("call");
      return {
        id: w.id, group: "active", tags,
        text: [w.name, ...list.map((o) => `${o.client_name} ${o.title ?? ""}`)].join(" "),
        node: (
          <section style={{ borderTop: "1px solid var(--rule)", padding: "14px 0 6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <Link href={`/weavers?edit=${w.id}`} className="display" style={{ fontSize: 24 }}>{w.name}</Link>
              <span className={list.length >= 3 ? "hot" : "mut"} style={{ fontWeight: 600 }}>
                {list.length === 0 ? "Free" : `${list.length} order${list.length > 1 ? "s" : ""} on the loom`}
              </span>
            </div>
            {list.map((o) => (
              <Link key={o.id + (o.title ?? "")} href={`/orders/${o.id}`} className="kv" style={{ borderTopColor: "var(--line)" }}>
                <span>{o.client_name}{o.title ? <span className="mut"> · {o.title}</span> : null}</span>
                <span className={`small ${o.weaver_promised && o.weaver_promised < t ? "hot" : "mut"}`}>due {shortDate(o.weaver_promised)}</span>
              </Link>
            ))}
          </section>
        ),
      };
    }),
    ...resting.map((w) => ({
      id: w.id, group: "resting", tags: ["_archive", "resting"], text: w.name,
      node: (
        <div className="kv">
          <Link href={`/weavers?edit=${w.id}`} className="mut">{w.name}</Link>
          <form action={setWeaverActive}><input type="hidden" name="id" value={w.id} /><input type="hidden" name="active" value="1" /><button className="linkbtn small">Make active</button></form>
        </div>
      ),
    })),
  ];

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <h1 className="page-title">Weavers</h1>
        <Link href="/weavers?add=1" className="btn">Add weaver</Link>
      </div>
      <p className="mut" style={{ margin: 0 }}>Who is weaving what right now. Give new work to whoever has the least on their loom.</p>

      {weavers.length === 0 ? <div className="empty">No weavers yet. Add the weavers she works with, then pick them when handing over an order.</div> : null}

      {weavers.length ? (
        <Filtered
          items={items}
          groups={[{ key: "active", label: "" }, { key: "resting", label: "Not active" }]}
          chips={[
            { key: "all", label: "All" },
            { key: "busy", label: "Weaving now" },
            { key: "free", label: "Free" },
            { key: "late", label: "Running late" },
            { key: "call", label: "To call today" },
            { key: "resting", label: "Not active" },
          ]}
          search="Search weaver or client"
          noun={["weaver", "weavers"]}
          empty="No weavers match."
        />
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
