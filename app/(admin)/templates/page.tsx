import Link from "next/link";
import { getTemplates } from "@/lib/data";
import { linesTotal } from "@/lib/orders";
import { naira } from "@/lib/format";
import { LinesEditor } from "@/components/LinesEditor";
import { SubmitButton } from "@/components/SubmitButton";
import { Sheet } from "@/components/Sheet";
import { deleteTemplate, saveTemplate } from "../settings/actions";

export const metadata = { title: "Templates" };

export default async function TemplatesPage(props: { searchParams: Promise<{ edit?: string }> }) {
  const searchParams = await props.searchParams;
  const templates = await getTemplates();
  const editing = searchParams.edit ? templates.find((t) => t.id === searchParams.edit) ?? null : null;
  const open = searchParams.edit === "new" || !!editing;

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="page-head">
        <h1 className="page-title">Templates</h1>
        <Link href="/templates?edit=new" className="btn">New template</Link>
      </div>
      <p className="mut" style={{ margin: 0 }}>The orders she makes again and again. A new order can start from one, with the usual pieces, price and weaving time filled in.</p>

      {templates.length ? (
        <div>
          {templates.map((t) => (
            <Link key={t.id} href={`/templates?edit=${t.id}`} className="orow">
              <div className="orow-main">
                <div className="orow-name">{t.name}</div>
                <div className="orow-sub">{t.lines.length} item{t.lines.length === 1 ? "" : "s"}{t.weeks ? ` · about ${t.weeks} weeks on the loom` : ""}</div>
              </div>
              <div className="orow-end num">{naira(linesTotal(t.lines))}</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">No templates yet. Make one for each order she repeats, like a bridal gele and ipele set.</div>
      )}

      {open ? (
        <Sheet title={editing ? "Edit template" : "New template"} closeHref="/templates">
          <form action={saveTemplate} className="stack">
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <label className="field">Name<input name="name" required defaultValue={editing?.name ?? ""} placeholder="e.g. Bridal gele and ipele" /></label>
            <label className="field">Usual details<textarea name="specs" defaultValue={editing?.specs ?? ""} /></label>
            <div className="field">Invoice<LinesEditor initial={editing?.lines} /></div>
            <div className="grid2">
              <label className="field">Usual weaver price<input name="weaver_cost" inputMode="numeric" defaultValue={editing?.weaver_cost ?? ""} /></label>
              <label className="field">Weeks on the loom<input name="weeks" inputMode="numeric" defaultValue={editing?.weeks ?? ""} /></label>
            </div>
            <SubmitButton className="btn block">Save template</SubmitButton>
          </form>
          {editing ? (
            <form action={deleteTemplate}>
              <input type="hidden" name="id" value={editing.id} />
              <SubmitButton className="btn danger block" pendingText="Deleting…">Delete template</SubmitButton>
            </form>
          ) : null}
        </Sheet>
      ) : null}
    </div>
  );
}
