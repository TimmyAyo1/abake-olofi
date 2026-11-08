import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CLIENT_STEPS, bankFor, linesTotal, stageIndex } from "@/lib/orders";
import { longDate, naira, shortDate, waLink } from "@/lib/format";
import type { Bank, Media, Order, OrderUpdate, Payment, Settings } from "@/lib/types";
import { CopyButton } from "@/components/Client";
import { SubmitButton } from "@/components/SubmitButton";
import { sendFeedback } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your order", robots: { index: false, follow: false } };

const HEADLINE: Record<string, string> = {
  enquiry: "We're putting your order together",
  invoiced: "Your invoice is ready",
  deposit: "Your order is confirmed",
  weaving: "Your aso-oke is on the loom",
  ready: "Your aso-oke is ready",
  delivered: "Enjoy your aso-oke",
};

export default async function TrackPage(props: { params: Promise<{ token: string }>; searchParams: Promise<{ thanks?: string }> }) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  if (!/^[a-f0-9]{16,64}$/.test(params.token)) notFound();
  const db = createAdminClient();

  // Only the fields a client may see. Never the weaver, costs or private notes.
  const { data: o } = await db
    .from("orders")
    .select("id, ref, client_name, title, colourway, lines, discount, bank_account_id, stage, cancelled, deposit_at, weaving_at, ready_at, delivered_at, client_promised, client_date_note, cover_path, feedback_at")
    .eq("track_token", params.token)
    .maybeSingle();
  if (!o || o.cancelled) notFound();
  const order = o as Pick<Order, "id" | "ref" | "client_name" | "title" | "colourway" | "lines" | "discount" | "bank_account_id" | "stage" | "cancelled" | "deposit_at" | "weaving_at" | "ready_at" | "delivered_at" | "client_promised" | "client_date_note" | "cover_path" | "feedback_at">;

  const [{ data: ups }, { data: pays }, { data: settings }] = await Promise.all([
    db.from("order_updates").select("id, body, media, created_at").eq("order_id", order.id).eq("shared", true).order("created_at", { ascending: false }),
    db.from("payments").select("amount, direction").eq("order_id", order.id).eq("direction", "in"),
    db.from("settings").select("biz_name, address, phone, handle, bank_name, account_name, account_number").eq("id", 1).maybeSingle(),
  ]);
  const updates = (ups ?? []) as Pick<OrderUpdate, "id" | "body" | "media" | "created_at">[];
  const { data: bankRows } = await db.from("bank_accounts").select("id, bank_name, account_name, account_number, is_default").order("created_at");
  const bank = bankFor(order, (bankRows ?? []) as Bank[]);
  const s = { ...((settings ?? {}) as Partial<Settings>), ...(bank ? { bank_name: bank.bank_name, account_name: bank.account_name, account_number: bank.account_number } : {}) };

  const paths = [order.cover_path, ...updates.flatMap((u) => (u.media as Media[]).map((m) => m.path))].filter((p): p is string => !!p);
  const urls: Record<string, string> = {};
  if (paths.length) {
    const { data } = await db.storage.from("media").createSignedUrls(Array.from(new Set(paths)), 3600);
    (data ?? []).forEach((d) => { if (d.path && d.signedUrl) urls[d.path] = d.signedUrl; });
  }

  const total = linesTotal(order.lines) - (Number(order.discount) || 0);
  const paid = ((pays ?? []) as Pick<Payment, "amount">[]).reduce((a, p) => a + Number(p.amount), 0);
  const balance = Math.max(0, total - paid);
  const si = stageIndex(order.stage);
  const reached = CLIENT_STEPS.map((step) => step.reached(order.stage));
  const current = reached.lastIndexOf(true);
  const firstName = order.client_name.split(" ")[0];
  const hero = order.cover_path ? urls[order.cover_path] : null;
  const wa = waLink(s.phone);
  const stepDates = [order.deposit_at, order.weaving_at, order.ready_at, order.ready_at, order.delivered_at];

  return (
    <main className="track">
      <header className="track-head">
        <span className="logo"><><img src="/logo.svg" alt="Àbáké Olófì" className="logo-img logo-light" /><img src="/logo-dark.svg" alt="" aria-hidden="true" className="logo-img logo-dark" /></></span>
        <span className="label mut">{order.ref}</span>
      </header>

      {hero ? <div className="track-hero" style={{ backgroundImage: `url("${hero}")` }} role="img" aria-label={order.title ?? "Your aso-oke"} /> : null}

      <div className="track-body">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="label mut">Hello {firstName}</div>
          <h1 className="track-title">{HEADLINE[order.stage]}</h1>
          {order.stage === "delivered" ? (
            <div className="mut">Delivered {longDate(order.delivered_at)}</div>
          ) : order.client_promised ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span className="mut">Ready by</span>
              <span className="display" style={{ fontSize: 30 }}>{longDate(order.client_promised)}</span>
            </div>
          ) : null}
          {order.client_date_note && order.stage !== "delivered" ? <p style={{ margin: 0 }}><span className="dot" style={{ marginRight: 8 }} />{order.client_date_note}</p> : null}
          {order.title ? <div className="mut small">{order.title}</div> : null}
        </div>

        {si >= stageIndex("deposit") ? (
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {CLIENT_STEPS.map((step, k) => {
              const done = step.reached(order.stage);
              const now = k === current;
              return (
                <li key={step.label} className="cstep">
                  <span className={`sq ${now && order.stage !== "delivered" ? "now" : done ? "done" : ""}`} aria-hidden="true" />
                  <span style={{ fontWeight: now ? 600 : 400, color: done || now ? "var(--ink)" : "var(--mut)" }}>{step.label}</span>
                  <span className="mut small">{done && stepDates[k] ? shortDate(stepDates[k]) : ""}</span>
                </li>
              );
            })}
          </ol>
        ) : null}

        {updates.length ? (
          <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 className="display" style={{ margin: 0, fontSize: 26, fontWeight: 400 }}>From the loom</h2>
            {updates.map((u) => (
              <article key={u.id} className="post">
                <span className="mut small">{new Date(u.created_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" })}</span>
                {u.body ? <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55 }}>{u.body}</p> : null}
                {(u.media as Media[]).length ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 6 }}>
                    {(u.media as Media[]).map((m) => urls[m.path] ? (
                      m.type === "video"
                        ? <video key={m.path} src={urls[m.path]} controls playsInline preload="metadata" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 4 }} />
                        : <img key={m.path} src={urls[m.path]} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 4 }} />
                    ) : null)}
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}

        {total > 0 ? (
          <section>
            <h2 className="display" style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 400 }}>Payment</h2>
            <div className="kv"><span>Total</span><span className="num">{naira(total)}</span></div>
            <div className="kv"><span>Paid</span><span className="num">{naira(paid)}</span></div>
            <div className="kv"><strong>{balance > 0 ? "Balance before delivery" : "Balance"}</strong><strong className="num">{balance > 0 ? naira(balance) : "Paid in full"}</strong></div>
            {order.stage !== "enquiry" ? <a className="btn quiet" style={{ marginTop: 12, width: "100%" }} href={`/t/${params.token}/invoice.pdf`} target="_blank" rel="noopener noreferrer">View invoice (PDF)</a> : null}
            {balance > 0 && s.account_number ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                <div className="small">Pay to <strong>{s.bank_name} · {s.account_number}</strong><br />{s.account_name}</div>
                <CopyButton text={s.account_number} label="Copy account number" className="btn quiet" />
              </div>
            ) : null}
          </section>
        ) : null}

        {order.stage === "delivered" ? (
          order.feedback_at || searchParams.thanks ? (
            <section className="box"><strong>Thank you for your feedback.</strong><span className="mut">It helps Abake keep getting better.</span></section>
          ) : (
            <section className="box">
              <h2 className="display" style={{ margin: 0, fontSize: 24, fontWeight: 400 }}>How did we do?</h2>
              <form action={sendFeedback} className="stack">
                <input type="hidden" name="token" value={params.token} />
                <Feel name="product" label="The aso-oke itself" />
                <Feel name="service" label="Our service and timing" />
                <label className="field">What could we do better? <span className="hint">Only Abake sees this</span><textarea name="better" /></label>
                <label className="field">A few words for others <span className="hint">optional</span><textarea name="public" /></label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}><input type="checkbox" name="share" defaultChecked /> Abake can share my words and photos</label>
                <SubmitButton className="btn block" pendingText="Sending…">Send</SubmitButton>
              </form>
            </section>
          )
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {wa ? <a className="btn block" href={`${wa}?text=${encodeURIComponent(`Hello Abake, it's ${order.client_name} about order ${order.ref}.`)}`} target="_blank" rel="noopener noreferrer">Chat with Abake on WhatsApp</a> : null}
          <div className="mut small" style={{ textAlign: "center" }}>{[s.address, s.handle].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
    </main>
  );
}

function Feel({ name, label }: { name: string; label: string }) {
  return (
    <div className="field">
      {label}
      <div className="chips">
        {[["loved", "Loved it"], ["okay", "It's okay"], ["unhappy", "Not happy"]].map(([v, l]) => (
          <label className="chip" key={v}><input type="radio" name={name} value={v} required defaultChecked={v === "loved"} /><span>{l}</span></label>
        ))}
      </div>
    </div>
  );
}
