import Link from "next/link";
import { getMe, getSettings } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { SubmitButton } from "@/components/SubmitButton";
import { saveSettings } from "./actions";
import { signOut } from "../../login/actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage(props: { searchParams: Promise<{ saved?: string }> }) {
  const searchParams = await props.searchParams;
  const [s, me] = await Promise.all([getSettings(), getMe()]);
  const supabase = await createClient();
  const { data: staff } = await supabase.from("staff").select("name, role").order("created_at");

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <h1 className="page-title">Settings</h1>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="label">Appearance</div>
        <ThemeSwitch />
      </section>

      <form action={saveSettings} className="stack">
        <div className="label section-h" style={{ marginTop: 0 }}>Business</div>
        <label className="field">Business name<input name="biz_name" defaultValue={s.biz_name} /></label>
        <label className="field">Address<input name="address" defaultValue={s.address ?? ""} /></label>
        <div className="grid2">
          <label className="field">Phone<input name="phone" defaultValue={s.phone ?? ""} /></label>
          <label className="field">Social handle<input name="handle" defaultValue={s.handle ?? ""} /></label>
        </div>

        <div className="label section-h">On invoices</div>
        <label className="field">Bank<input name="bank_name" defaultValue={s.bank_name ?? ""} /></label>
        <div className="grid2">
          <label className="field">Account number<input name="account_number" inputMode="numeric" defaultValue={s.account_number ?? ""} /></label>
          <label className="field">Account name<input name="account_name" defaultValue={s.account_name ?? ""} /></label>
        </div>
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
