import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getOrder, getSettings, getUpdates, getWeavers, signMedia, weaverLoad } from "@/lib/data";
import { STAGES, money, stageIndex, stageLabel } from "@/lib/orders";
import { addDays, daysLeft, longDate, naira, relativeDay, shortDate, timeAgo, today, waLink } from "@/lib/format";
import type { OrderFull, OrderUpdate, Settings } from "@/lib/types";
import { Sheet } from "@/components/Sheet";
import { Swatch } from "@/components/Swatch";
import { SubmitButton } from "@/components/SubmitButton";
import { MediaPicker } from "@/components/MediaPicker";
import { CopyButton, DatePair, Reveal, SharePdf } from "@/components/Client";
import { addPayment, advance, deleteOrders, logUpdate, saveInvoiceTerms, toggleCancelled, toggleShared, undoStep } from "../actions";

type Search = { step?: string; log?: string; pay?: string; invoice?: string; more?: string; delete?: string; err?: string; saved?: string };

export default async function OrderPage(props: { params: Promise<{ id: string }>; searchParams: Promise<Search> }) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  // One round of requests in parallel instead of three in a row.
  const [o, updates, settings] = await Promise.all([getOrder(params.id), getUpdates(params.id), getSettings()]);
  if (!o) notFound();
  const paths = [...updates.flatMap((u) => u.media.map((m) => m.path)), ...(o.cover_path ? [o.cover_path] : [])];
  const urls = await signMedia(paths);
  const m = money(o);
  const i = stageIndex(o.stage);
  const st = STAGES[i];
  const self = `/orders/${o.id}`;
  // The client link uses NEXT_PUBLIC_SITE_URL if set, otherwise the address the app is being opened on.
  const h = await headers();
  const site = process.env.NEXT_PUBLIC_SITE_URL || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host") ?? ""}`;
  const trackUrl = `${site}/t/${o.track_token}`;
  const gallery = updates.flatMap((u) => u.media).filter((x) => urls[x.path]);
  const wa = waLink(o.client_phone);

  return (
    <div className="od">
      <div className="od-main">
        <Link href="/orders" className="mut small" style={{ alignSelf: "flex-start" }}>‹ Orders</Link>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="mut small">{o.ref}{o.source ? ` · came from ${o.source}` : ""}{o.cancelled ? " · cancelled" : ""}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Swatch name={o.client_name} src={o.cover_path ? urls[o.cover_path] : null} size={56} />
            <h1 className="od-title">{o.client_name}</h1>
          </div>
          <div className="mut">{o.title ?? ""}</div>
        </div>

        {gallery.length ? (
          <div className="gallery">
            {gallery.slice(0, 8).map((g) =>
              g.type === "video" ? <video key={g.path} src={urls[g.path]} controls playsInline preload="metadata" /> : <img key={g.path} src={urls[g.path]} alt="" />
            )}
          </div>
        ) : null}

        <div className="statusbox">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <span className="label">{o.cancelled ? "Cancelled" : st.label}</span>
            <span className="mut small">{sinceText(o)}</span>
          </div>
          <div className="steps" aria-label={`Step ${i + 1} of ${STAGES.length}`}>
            {STAGES.map((s, k) => <i key={s.id} className={k <= i ? "on" : ""} />)}
          </div>
          <Facts o={o} />
          {!o.cancelled ? (
            <div className="row-btns">
              {o.stage === "weaving" ? <Link href={`${self}?log=weaver`} className="btn" scroll={false}>I&apos;ve called the weaver</Link> : null}
              {st.action ? <Link href={`${self}?step=1`} className={o.stage === "weaving" ? "btn ghost" : "btn"} scroll={false}>{st.action}</Link> : null}
            </div>
          ) : null}
        </div>

        <div className="row-btns">
          <CopyButton text={trackUrl} label="Copy client link" />
          {wa ? <a className="btn quiet" href={`${wa}?text=${encodeURIComponent(`Hello ${o.client_name}! You can follow your order here: ${trackUrl}`)}`} target="_blank" rel="noopener noreferrer">Send link on WhatsApp</a> : null}
          <Link href={`${self}?invoice=1`} className="btn quiet" scroll={false}>Invoice</Link>
        </div>

        <section className="feed" aria-label="Updates">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8 }}>
            <span className="label">Updates</span>
            <Link href={`${self}?log=note`} className="linkbtn" scroll={false}>+ Add update</Link>
          </div>
          {updates.length === 0 ? <p className="mut">Calls, photos and notes will show here.</p> : null}
          {updates.map((u) => <Post key={u.id} u={u} urls={urls} orderId={o.id} />)}
        </section>
      </div>

      <aside className="od-side">
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8 }}>
            <span className="label">Money</span>
            <Link href={`${self}?pay=1`} className="linkbtn" scroll={false}>+ Payment</Link>
          </div>
          <div className="kv"><span>Invoice{m.invoiceNo ? ` ${m.invoiceNo}` : ""}</span><span className="num">{naira(m.total)}</span></div>
          {m.discount ? <div className="kv"><span className="mut">incl. discount</span><span className="num mut">−{naira(m.discount)}</span></div> : null}
          <div className="kv"><span>Paid</span><span className="num">{naira(m.paidIn)}</span></div>
          <div className="kv"><strong>Balance</strong><strong className={`num ${m.balance > 0 && o.stage === "delivered" ? "hot" : ""}`}>{m.balance > 0 ? naira(m.balance) : "Paid in full"}</strong></div>
          {m.weaverCost ? <div className="kv"><span>Weaver</span><span className="num">{naira(m.paidOut)} of {naira(m.weaverCost)}</span></div> : null}
          {m.weaverCost ? <div className="kv"><span>You keep</span><span className="num">{naira(m.kept)}</span></div> : null}
        </div>

        <div>
          <span className="label">Client</span>
          <div className="kv" style={{ marginTop: 8 }}><span>WhatsApp</span>{wa ? <a href={wa} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>{o.client_phone}</a> : <span className="mut">—</span>}</div>
          {o.client_promised ? <div className="kv"><span>Delivery date</span><span>{shortDate(o.client_promised)}</span></div> : null}
          {o.specs ? <p style={{ whiteSpace: "pre-wrap", margin: "10px 0 0" }}>{o.specs}</p> : null}
        </div>

        {o.weaver ? (
          <div>
            <span className="label">Weaver</span>
            <div className="kv" style={{ marginTop: 8 }}><span>{o.weaver.name}</span>{waLink(o.weaver.phone) ? <a href={waLink(o.weaver.phone)!} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>WhatsApp</a> : null}</div>
          </div>
        ) : null}

        {o.feedback_at ? (
          <div>
            <span className="label">Client feedback</span>
            <div className="kv" style={{ marginTop: 8 }}><span>The aso-oke</span><span>{feel(o.feedback_product)}</span></div>
            <div className="kv"><span>Service and timing</span><span>{feel(o.feedback_service)}</span></div>
            {o.feedback_better ? <p style={{ margin: "10px 0 0" }}><span className="mut small">Could do better: </span>{o.feedback_better}</p> : null}
            {o.feedback_public ? <p style={{ margin: "10px 0 0" }}>“{o.feedback_public}”{o.feedback_share ? <span className="mut small"> · OK to share</span> : null}</p> : null}
          </div>
        ) : null}

        <div className="side-actions">
          <Link href={`${self}/edit`} className="btn quiet sm">Edit details</Link>
          <Link href={`/orders/new?repeat=${o.id}`} className="btn quiet sm">Repeat this order</Link>
          {i > 0 && !o.cancelled ? (
            <form action={undoStep}><input type="hidden" name="id" value={o.id} /><SubmitButton className="btn quiet sm block" pendingText="Undoing…">Undo last step</SubmitButton></form>
          ) : null}
          <form action={toggleCancelled}>
            <input type="hidden" name="id" value={o.id} />
            <input type="hidden" name="cancel" value={o.cancelled ? "0" : "1"} />
            <SubmitButton className="btn danger sm block">{o.cancelled ? "Restore order" : "Cancel order"}</SubmitButton>
          </form>
          <Link href={`${self}?delete=1`} className="btn quiet sm" scroll={false}>Delete order</Link>
        </div>
      </aside>

      {searchParams.step && st.action && !o.cancelled ? <StepSheet o={o} settings={settings} closeHref={self} /> : null}
      {searchParams.log ? <LogSheet o={o} kind={searchParams.log} settings={settings} closeHref={self} /> : null}
      {searchParams.pay ? <PaySheet o={o} closeHref={self} /> : null}
      {searchParams.invoice ? <InvoiceSheet o={o} settings={settings} closeHref={self} err={searchParams.err} saved={!!searchParams.saved} /> : null}
      {searchParams.delete ? (
        <Sheet title="Delete this order?" kicker={o.client_name} closeHref={self}>
          <p style={{ margin: 0 }}>It&apos;s removed for good, with its updates, photos and payments. To keep it on record instead, use Cancel order.</p>
          <form action={deleteOrders} className="row-btns">
            <input type="hidden" name="ids" value={o.id} />
            <Link href={self} className="btn quiet" scroll={false}>Keep it</Link>
            <SubmitButton className="btn danger" pendingText="Deleting…">Delete for good</SubmitButton>
          </form>
        </Sheet>
      ) : null}
    </div>
  );
}

function sinceText(o: OrderFull) {
  const d = { enquiry: o.created_at.slice(0, 10), invoiced: o.invoiced_at, deposit: o.deposit_at, weaving: o.weaving_at, ready: o.ready_at, delivered: o.delivered_at }[o.stage];
  return d ? `since ${shortDate(d)}` : "";
}

function feel(v: string | null) {
  return v === "loved" ? "Loved it" : v === "okay" ? "It's okay" : v === "unhappy" ? "Not happy" : "—";
}

function Facts({ o }: { o: OrderFull }) {
  if (o.stage === "weaving") {
    const due = o.next_call && o.next_call <= today();
    return (
      <div className="facts">
        <div className="fact"><div className="k">Weaver promised</div><div className="v">{shortDate(o.weaver_promised)}</div></div>
        <div className="fact"><div className="k">Client told</div><div className="v">{shortDate(o.client_promised)}</div></div>
        <div className="fact"><div className="k">Next call</div><div className={`v ${due ? "hot" : ""}`}>{o.next_call ? relativeDay(o.next_call) : "—"}</div></div>
      </div>
    );
  }
  if (o.stage === "ready") {
    return (
      <div className="facts">
        <div className="fact"><div className="k">Received</div><div className="v">{shortDate(o.ready_at)}</div></div>
        <div className="fact"><div className="k">Client told</div><div className="v">{shortDate(o.client_promised)}</div></div>
        <div className="fact"><div className="k">Time left</div><div className="v">{daysLeft(o.client_promised) || "—"}</div></div>
      </div>
    );
  }
  if (o.stage === "delivered") {
    const late = o.client_promised && o.delivered_at && o.delivered_at > o.client_promised;
    return (
      <div className="facts">
        <div className="fact"><div className="k">Delivered</div><div className="v">{shortDate(o.delivered_at)}</div></div>
        <div className="fact"><div className="k">Promised</div><div className="v">{shortDate(o.client_promised)}</div></div>
        <div className="fact"><div className="k">On time?</div><div className={`v ${late ? "hot" : ""}`}>{o.client_promised ? (late ? "Late" : "Yes") : "—"}</div></div>
      </div>
    );
  }
  return null;
}

function Post({ u, urls, orderId }: { u: OrderUpdate; urls: Record<string, string>; orderId: string }) {
  const title = { weaver: "Weaver call", client: "To the client", note: "Note", stage: "Step", payment: "Payment" }[u.kind];
  return (
    <article className="post">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <span style={{ fontWeight: 600 }}>{title}</span>
        <span className="mut small">{timeAgo(u.created_at)}</span>
      </div>
      {u.body ? <div style={{ whiteSpace: "pre-wrap" }}>{u.body}</div> : null}
      {u.media.length ? (
        <div className="post-media">
          {u.media.map((x) => urls[x.path] ? (x.type === "video" ? <video key={x.path} src={urls[x.path]} controls playsInline preload="metadata" /> : <a key={x.path} href={urls[x.path]} target="_blank" rel="noopener noreferrer"><img src={urls[x.path]} alt="" /></a>) : null)}
        </div>
      ) : null}
      {u.kind !== "stage" && u.kind !== "payment" ? (
        <form action={toggleShared} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="hidden" name="id" value={orderId} />
          <input type="hidden" name="update_id" value={u.id} />
          <input type="hidden" name="shared" value={u.shared ? "0" : "1"} />
          <span className={`pill ${u.shared ? "shared" : ""}`}>{u.shared ? "Shown to client" : "Private"}</span>
          <button className="linkbtn small" style={{ fontWeight: 500 }}>{u.shared ? "Hide from client" : "Show to client"}</button>
        </form>
      ) : null}
    </article>
  );
}

// ───────── Sheets

function StepSheet({ o, settings, closeHref }: { o: OrderFull; settings: Settings; closeHref: string }) {
  const m = money(o);
  const t = today();
  const st = STAGES[stageIndex(o.stage)];
  const kicker = `${o.client_name}${o.title ? ` · ${o.title}` : ""}`;
  return (
    <Sheet title={st.action ?? ""} kicker={kicker} closeHref={closeHref}>
      <form action={advance} className="stack">
        <input type="hidden" name="id" value={o.id} />
        <input type="hidden" name="from" value={o.stage} />

        {o.stage === "enquiry" ? (
          <>
            <div className="kv"><span>Invoice total</span><strong className="num">{naira(m.total)}</strong></div>
            {!m.total ? <p className="error">No prices yet. Edit the order to add items first.</p> : null}
            <label className="field">Date sent<input type="date" name="date" defaultValue={t} required /></label>
            <SubmitButton className="btn block">Mark invoice sent</SubmitButton>
            <Link href={`${closeHref}?invoice=1`} className="btn quiet block" scroll={false}>See the invoice</Link>
          </>
        ) : null}

        {o.stage === "invoiced" ? (
          <>
            <p className="mut" style={{ margin: 0 }}>The order becomes official when the deposit lands. Match the amount to the bank alert.</p>
            <div className="grid2">
              <label className="field">Deposit amount<input name="amount" inputMode="numeric" required defaultValue={m.total ? Math.round(m.total / 2) : ""} /></label>
              <label className="field">Date received<input type="date" name="date" defaultValue={t} required /></label>
            </div>
            <div className="field">Bank alert screenshot <span className="hint">optional</span><MediaPicker folder={`orders/${o.id}/payments`} label="Screenshot" max={1} /></div>
            <SubmitButton className="btn block">Record deposit</SubmitButton>
          </>
        ) : null}

        {o.stage === "deposit" ? <HandOver o={o} settings={settings} /> : null}

        {o.stage === "weaving" ? (
          <>
            <label className="field">Date received from the weaver<input type="date" name="date" defaultValue={t} required /></label>
            {m.owedToWeaver > 0 ? (
              <label className="field">Paid to the weaver now <span className="hint">{naira(m.owedToWeaver)} still owed</span><input name="paid_now" inputMode="numeric" defaultValue={m.owedToWeaver} /></label>
            ) : null}
            <div className="field">Photos of the finished piece<MediaPicker folder={`orders/${o.id}`} /></div>
            <label className="field">Note <span className="hint">optional, e.g. quality check</span><input name="note" /></label>
            <label className="toggle"><span><strong>Show the photos to the client</strong></span><input type="checkbox" name="shared" defaultChecked /></label>
            <SubmitButton className="btn block">Mark ready</SubmitButton>
          </>
        ) : null}

        {o.stage === "ready" ? (
          <>
            <label className="field">Date delivered<input type="date" name="date" defaultValue={t} required /></label>
            <div className="grid2">
              <label className="field">Balance received<input name="amount" inputMode="numeric" defaultValue={m.balance > 0 ? m.balance : ""} /></label>
              <label className="field">Date received<input type="date" name="paid_on" defaultValue={t} /></label>
            </div>
            <div className="field">Delivery photo <span className="hint">optional, shown to the client</span><MediaPicker folder={`orders/${o.id}`} /></div>
            <p className="mut small" style={{ margin: 0 }}>The client&apos;s page will ask how they found the aso-oke and the service.</p>
            <SubmitButton className="btn block">Mark delivered</SubmitButton>
          </>
        ) : null}
      </form>
    </Sheet>
  );
}

async function HandOver({ o, settings }: { o: OrderFull; settings: Settings }) {
  const [weavers, load] = await Promise.all([getWeavers(), weaverLoad()]);
  const wDefault = o.weaver_promised ?? addDays(today(), 21);
  return (
    <>
      <div className="field">
        Which weaver?
        {weavers.length ? (
          <div className="chips">
            {weavers.map((w) => (
              <label className="chip" key={w.id}>
                <input type="radio" name="weaver_id" value={w.id} defaultChecked={o.weaver_id === w.id} />
                <span>{w.name} <span style={{ opacity: 0.6, fontWeight: 400 }}>· {load[w.id] ?? 0}</span></span>
              </label>
            ))}
          </div>
        ) : null}
        <span className="hint">The number is how many orders each one is weaving now.</span>
      </div>
      <label className="field">Or a new weaver <span className="hint">added to her list</span><input name="weaver_new" placeholder="Name" autoComplete="off" /></label>
      <DatePair weaver={wDefault} client={o.client_promised ?? ""} buffer={settings.buffer_days} />
      <label className="field">First check-in call<input type="date" name="next_call" defaultValue={addDays(today(), settings.call_every_days)} /></label>
      <SubmitButton className="btn block">Start weaving</SubmitButton>
      <p className="mut small" style={{ margin: 0, textAlign: "center" }}>The client&apos;s page will say &ldquo;On the loom&rdquo; with the client date.</p>
    </>
  );
}

function LogSheet({ o, kind, settings, closeHref }: { o: OrderFull; kind: string; settings: Settings; closeHref: string }) {
  const k = ["weaver", "client", "note"].includes(kind) ? kind : "note";
  const t = today();
  const every = settings.call_every_days;
  const options = [
    { v: addDays(t, 1), l: "Tomorrow" },
    { v: addDays(t, 2), l: "In 2 days" },
    { v: addDays(t, 3), l: "In 3 days" },
  ];
  const defaultNext = addDays(t, Math.min(Math.max(every, 1), 3));
  return (
    <Sheet title={k === "weaver" ? "Called the weaver" : k === "client" ? "Sent to the client" : "Add an update"} kicker={`${o.client_name}${o.weaver ? ` · ${o.weaver.name}` : ""}`} closeHref={closeHref}>
      <form action={logUpdate} className="stack">
        <input type="hidden" name="id" value={o.id} />
        <div className="chips" role="radiogroup" aria-label="Kind of update">
          {[["weaver", "Called weaver"], ["client", "Sent to client"], ["note", "Note"]].map(([v, l]) => (
            <Link key={v} href={`${closeHref}?log=${v}`} scroll={false} replace className="chip"><span style={k === v ? { background: "var(--btn)", color: "var(--on-btn)", borderColor: "var(--btn)" } : undefined}>{l}</span></Link>
          ))}
        </div>
        <input type="hidden" name="kind" value={k} />
        <label className="field">{k === "weaver" ? "What did the weaver say?" : k === "client" ? "What did you send?" : "Note"}
          <textarea name="body" placeholder={k === "weaver" ? "e.g. Half done, on track" : ""} />
        </label>
        <div className="field">Photos or videos<MediaPicker folder={`orders/${o.id}`} /></div>

        {k === "weaver" ? (
          <div className="box">
            <strong>When will you call next?</strong>
            <div className="chips">
              {options.map((x) => (
                <label className="chip" key={x.v}><input type="radio" name="next_call" value={x.v} defaultChecked={x.v === defaultNext} /><span>{x.l}</span></label>
              ))}
            </div>
            <label className="field">Or pick a date<input type="date" name="next_call_pick" min={t} /></label>
            <span className="mut small">The order shows under “Weavers to call today” on that day.</span>
          </div>
        ) : null}

        {o.stage === "weaving" || o.stage === "ready" ? (
          <Reveal name="date_changed" label="The date changed" hint={`Now: weaver ${shortDate(o.weaver_promised)} · client ${shortDate(o.client_promised)}`}>
            <div className="grid2">
              <label className="field">Weaver&apos;s new date<input type="date" name="weaver_promised" defaultValue={o.weaver_promised ?? ""} /></label>
              <label className="field">Tell the client<input type="date" name="client_promised" defaultValue={o.client_promised ?? ""} /></label>
            </div>
            <label className="field">Note for the client <span className="hint">only if their date moves</span><input name="client_date_note" placeholder="e.g. We're adding extra detail to the border" /></label>
          </Reveal>
        ) : null}

        <label className="toggle">
          <span><strong>Show on the client&apos;s page</strong><span className="mut small" style={{ display: "block" }}>Your words and photos. Never the weaver&apos;s name or prices.</span></span>
          <input type="checkbox" name="shared" defaultChecked={k !== "note"} />
        </label>
        <SubmitButton className="btn block">Save</SubmitButton>
      </form>
    </Sheet>
  );
}

function PaySheet({ o, closeHref }: { o: OrderFull; closeHref: string }) {
  const m = money(o);
  return (
    <Sheet title="Add a payment" kicker={o.client_name} closeHref={closeHref}>
      <form action={addPayment} className="stack">
        <input type="hidden" name="id" value={o.id} />
        <input type="hidden" name="direction" value="in" />
        <div className="grid2">
          <label className="field">Amount<input name="amount" inputMode="numeric" required /></label>
          <label className="field">Date<input type="date" name="paid_on" defaultValue={today()} required /></label>
        </div>
        <div className="field">Bank alert screenshot <span className="hint">optional</span><MediaPicker folder={`orders/${o.id}/payments`} label="Screenshot" max={1} /></div>
        <p className="mut small" style={{ margin: 0 }}>Client balance {naira(m.balance)}{m.weaverCost ? ` · owed to weaver ${naira(m.owedToWeaver)}` : ""}</p>
        <SubmitButton className="btn block">Save payment</SubmitButton>
      </form>
    </Sheet>
  );
}

function InvoiceSheet({ o, settings, closeHref, err, saved }: { o: OrderFull; settings: Settings; closeHref: string; err?: string; saved?: boolean }) {
  const m = money(o);
  const st = settings;
  const no = m.invoiceNo ?? o.ref;
  const fmt = (v: number) => Math.round(v).toLocaleString("en-NG");
  const text = [
    `*${st.biz_name}* · Invoice ${no}`,
    `Date: ${longDate(o.invoiced_at ?? today())}`,
    `For: ${o.client_name}`,
    "",
    ...o.lines.map((l) => (l.heading && !l.unit ? `\n*${l.desc}*` : `• ${l.desc}${(l.qty || 1) > 1 ? ` × ${l.qty}` : ""}: ${naira((l.qty || 1) * l.unit)}`)),
    "",
    `Subtotal: ${naira(m.subtotal)}`,
    m.discount ? `Discount: −${naira(m.discount)}` : "",
    m.discount ? `Total: ${naira(m.total)}` : "",
    m.paidIn ? `Paid: ${naira(m.paidIn)}` : `Deposit due: ${naira(m.depositDue)}`,
    m.paidIn ? `Balance due: ${naira(m.balance)}` : `Balance on delivery: ${naira(m.total - m.depositDue)}`,
    "",
    st.account_number ? `Pay to: ${st.bank_name} · ${st.account_name} · ${st.account_number}` : "",
  ].filter((x, k, a) => x !== "" || a[k - 1] !== "").join("\n");
  const pdfUrl = `/orders/${o.id}/invoice.pdf`;
  const filename = `Invoice ${no} - ${o.client_name}.pdf`.replace(/[\\/:*?"<>|]/g, "");

  return (
    <Sheet title={`Invoice ${no}`} kicker={o.client_name} closeHref={closeHref}>
      {err ? <p className="error" style={{ margin: 0, fontWeight: 600 }}>{err}</p> : null}
      {saved && !err ? <p className="mut" style={{ margin: 0 }}>Updated.</p> : null}
      {!st.account_number ? <p className="error" style={{ margin: 0 }}>Add the bank details in Settings so they print on the invoice.</p> : null}
      {!m.subtotal ? <p className="error" style={{ margin: 0 }}>No items yet. Use Edit details to add them.</p> : null}

      <div className="invoice-preview">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div className="inv-title">INVOICE</div>
          <img src="/logo.png" alt="Àbáké Olófì" width={64} height={64} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div><div className="inv-label">Issued to</div><div style={{ fontWeight: 600, letterSpacing: ".08em" }}>{o.client_name.toUpperCase()}</div></div>
          <div style={{ textAlign: "right" }}><div className="inv-label">Invoice no {no}</div><div className="mut small">{shortDate(o.invoiced_at ?? today())}</div></div>
        </div>
        <div>
          {o.lines.map((l, k) =>
            l.heading && !l.unit ? (
              <div key={k} style={{ fontWeight: 700, paddingTop: 12 }}>{l.desc}</div>
            ) : (
              <div className="kv" key={k} style={l.heading ? { fontWeight: 700 } : undefined}>
                <span>{l.desc}{(l.qty || 1) > 1 ? <span className="mut"> × {l.qty}</span> : null}</span>
                <span className="num">{fmt((l.qty || 1) * l.unit)}</span>
              </div>
            )
          )}
          <div className="kv"><strong className="inv-label">Subtotal</strong><strong className="num">{fmt(m.subtotal)}</strong></div>
          {m.discount ? (
            <>
              <div className="kv"><span className="inv-label">Discount</span><span className="num">−{fmt(m.discount)}</span></div>
              <div className="kv"><strong className="inv-label">Total</strong><strong className="num">{fmt(m.total)}</strong></div>
            </>
          ) : null}
          {m.paidIn ? (
            <>
              <div className="kv"><span className="inv-label">Amount paid</span><span className="num">{fmt(m.paidIn)}</span></div>
              <div className="kv"><strong className="inv-label">Balance due</strong><strong className="num">{fmt(m.balance)}</strong></div>
            </>
          ) : (
            <>
              <div className="kv"><span className="inv-label">Deposit due</span><span className="num">{fmt(m.depositDue)}</span></div>
              <div className="kv"><strong className="inv-label">Balance on delivery</strong><strong className="num">{fmt(m.total - m.depositDue)}</strong></div>
            </>
          )}
        </div>
      </div>

      <form action={saveInvoiceTerms} className="grid2" style={{ alignItems: "end" }}>
        <input type="hidden" name="id" value={o.id} />
        <label className="field">Discount (₦)<input name="discount" inputMode="numeric" defaultValue={m.discount || ""} /></label>
        <label className="field">Deposit due (₦) <span className="hint">empty = half</span><input name="deposit_due" inputMode="numeric" defaultValue={o.deposit_due ?? ""} placeholder={fmt(Math.round(m.total / 2))} /></label>
        <SubmitButton className="btn quiet" pendingText="Updating…">Update</SubmitButton>
      </form>

      <div className="row-btns">
        <SharePdf url={pdfUrl} filename={filename} label="Share PDF" />
        <a className="btn quiet" href={`${pdfUrl}?download=1`}>Download PDF</a>
      </div>
      <div className="row-btns">
        <a className="btn quiet sm" href={pdfUrl} target="_blank" rel="noopener noreferrer">Open PDF</a>
        <CopyButton text={text} label="Copy as text" className="btn quiet sm" />
      </div>
      <p className="mut small" style={{ margin: 0 }}>On a phone, Share PDF opens the share sheet so she can send it straight to WhatsApp.</p>
    </Sheet>
  );
}
