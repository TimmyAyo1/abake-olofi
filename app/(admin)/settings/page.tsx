import Link from "next/link";
import { getBanks, getMe, getSettings } from "@/lib/data";
import { Sheet } from "@/components/Sheet";
import { createClient } from "@/lib/supabase/server";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteBank, makeDefaultBank, saveBank, saveSettings } from "./actions";
import { signOut } from "../../login/actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage(props: { searchParams: Promise<{ saved?: string; bank?: string; err?: string }> }) {
  const searchParams = await props.searchParams;
  const [s, me, banks] = await Promise.all([getSettings(), getMe(), getBanks()]);
  const editingBank = searchParams.bank && searchParams.bank !== "new" ? banks.find((b) => b.id === searchParams.bank) ?? null : null;
  const supabase = await createClient();
  const { data: staff } = await supabase.from("staff").select("name, role").order("created_at");

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <h1 className="page-title">Settings</h1>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="label">Appearance</div>
        <ThemeSwitch />
      </section>

      <section id="banks" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div className="label section-h" style={{ marginTop: 0, display: "flex", justifyContent: "space-between" }}>
          <span>Bank accounts</span>
          <Link href="/settings?bank=new" className="linkbtn" style={{ letterSpacing: 0, textTransform: "none", fontSize: 14 }}>+ Add account</Link>
        </div>
        {banks.length === 0 ? <p className="mut" style={{ margin: "6px 0 0" }}>No accounts yet. Add the ones clients pay into; she picks one on each invoice.</p> : null}
        {banks.map((b) => (
          <div key={b.id} className="kv" style={{ alignItems: "center" }}>
            <Link href={`/settings?bank=${b.id}`} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 500 }}>{b.bank_name} · {b.account_number}</span>
              <span className="mut small">{b.account_name ?? ""}</span>
            </Link>
            {b.is_default ? <span className="pill shared">Default</span> : (
              <form action={makeDefaultBank}><input type="hidden" name="id" value={b.id} /><button className="linkbtn small" style={{ fontWeight: 500 }}>Make default</button></form>
            )}
          </div>
        ))}
      </section>

      {searchParams.bank ? (
        <Sheet title={editingBank ? "Edit account" : "Add a bank account"} closeHref="/settings#banks">
          {searchParams.err ? <p className="error" style={{ margin: 0 }}>{searchParams.err}</p> : null}
          <form action={saveBank} className="stack">
            {editingBank ? <input type="hidden" name="id" value={editingBank.id} /> : null}
            <label className="field">Bank<input name="bank_name" required placeholder="e.g. KUDA Bank" defaultValue={editingBank?.bank_name ?? ""} /></label>
            <label className="field">Account name<input name="account_name" defaultValue={editingBank?.account_name ?? ""} /></label>
            <label className="field">Account number<input name="account_number" required inputMode="numeric" defaultValue={editingBank?.account_number ?? ""} /></label>
            <SubmitButton className="btn block">Save account</SubmitButton>
          </form>
          {editingBank ? (
            <form action={deleteBank}><input type="hidden" name="id" value={editingBank.id} /><SubmitButton className="btn danger block" pendingText="Removing…">Remove this account</SubmitButton></form>
          ) : null}
        </Sheet>
      ) : null}

      <form action={saveSettings} className="stack">
        <div className="label section-h" style={{ marginTop: 0 }}>Business</div>
        <label className="field">Business name<input name="biz_name" defaultValue={s.biz_name} /></label>
        <label className="field">Address<input name="address" defaultValue={s.address ?? ""} /></label>
        <div className="grid2">
          <label className="field">Phone<input name="phone" defaultValue={s.phone ?? ""} /></label>
          <label className="field">Social handle<input name="handle" defaultValue={s.handle ?? ""} /></label>
        </div>

        <div className="label section-h">On invoices</div>
        <label className="field">Terms<textarea name="terms" defaultValue={s.terms ?? ""} /></label>
        <label className="field">Next invoice number <span className="hint">continues from her last paper invoice</span><input name="next_invoice_no" inputMode="numeric" defaultValue={s.next_invoice_no ?? ""} /></label>

        <div className="label section-h">Reminders</div>
        <div className="grid2">
          <label className="field">Buffer for clients <span className="hint">days added to the weaver&apos;s date</span><input name="buffer_days" inputMode="numeric" defaultValue={s.buffer_days} /></label>
          <label className="field">Call weavers every <span className="hint">days, as the default</span><input name="call_every_days" inputMode="numeric" defaultValue={s.call_every_days} /></label>
        </div>
        {searchParams.saved ? <p className="mut" style={{ margin: 0 }}>Saved.</p> : null}
        <SubmitButton className="btn">Save settings</SubmitButton>
      </form>

      <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div className="label section-h">Team</div>
        {(staff ?? []).map((p, k) => <div className="kv" key={k}><span>{p.name}</span><span className="mut">{p.role}</span></div>)}
        <p className="mut small">New people are added in Supabase (see the README), then they can sign in here.</p>
      </section>

      <section className="row-btns">
        <Link href="/templates" className="btn quiet">Order templates</Link>
        <form action={signOut}><button className="btn ghost" style={{ width: "100%" }}>Sign out{me?.name ? ` (${me.name})` : ""}</button></form>
      </section>
    </div>
  );
}
