import Link from "next/link";
import { SplitView, RowLink } from "@/components/SplitView";
import { Swatch } from "@/components/Swatch";
import { Filtered, type FItem } from "@/components/Filters";
import { getOrders, signMedia } from "@/lib/data";
import { groupOrders, money } from "@/lib/orders";
import { daysLeft, lagosDay, naira, relativeDay, shortDate, waLink, today } from "@/lib/format";
import type { OrderFull } from "@/lib/types";

export default async function OrdersLayout({ children }: { children: React.ReactNode }) {
  const orders = await getOrders();
  const covers = await signMedia(orders.map((o) => o.cover_path).filter((p): p is string => !!p));
  const groups = groupOrders(orders);
  const live = orders.filter((o) => !o.cancelled && o.stage !== "delivered");
  const toCall = groups.find((g) => g.key === "call")?.orders.length ?? 0;
  const owed = orders.filter((o) => !o.cancelled && o.stage === "delivered" && money(o).balance > 0).length;

  // Every order once, with what it can be filtered by. Finished and cancelled ones only show when asked for.
  const groupOf = new Map<string, string>();
  groups.forEach((g) => g.orders.forEach((o) => groupOf.set(o.id, g.key)));
  const ordered = [...groups.flatMap((g) => g.orders), ...orders.filter((o) => !groupOf.has(o.id))]; // keeps each group's own order
  const items: FItem[] = ordered.map((o) => {
    const m = money(o);
    const group = o.cancelled ? "cancelled" : groupOf.get(o.id) ?? "done";
    const tags: string[] = [group];
    if (o.cancelled || group === "done") tags.push("_archive");
    if (group === "call") tags.push("weaving");
    if (o.stage === "delivered" && !o.cancelled) tags.push("delivered");
    if (!o.cancelled && o.stage !== "enquiry" && m.total > 0) tags.push(m.balance > 0 ? "balance" : "paid");
    const text = [o.client_name, o.ref, o.title, o.client_phone, m.invoiceNo, o.weaver?.name, ...(o.assignments ?? []).map((a) => a.weaver?.name)].filter(Boolean).join(" ");
    return { id: o.id, group, tags, text, date: lagosDay(o.created_at), amount: m.balance, node: <Row o={o} group={group} cover={o.cover_path ? covers[o.cover_path] : null} /> };
  });

  const list = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div className="page-head">
        <h1 className="page-title">Orders</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/manage" className="btn quiet">Select</Link>
          <Link href="/orders/new" className="btn">New order</Link>
        </div>
      </div>
      <p className="mut" style={{ margin: "10px 0 0", fontSize: 14 }}>
        {live.length} live{toCall ? ` · ${toCall} weaver${toCall > 1 ? "s" : ""} to call` : ""}{owed ? ` · ${owed} balance${owed > 1 ? "s" : ""} owed` : ""}
      </p>

      {orders.length === 0 ? (
        <div className="empty" style={{ marginTop: 24 }}>
          <strong style={{ color: "var(--ink)" }}>No orders yet</strong>
          When a client gets in touch on TikTok, Instagram or WhatsApp, add them here. Every step from first chat to delivery is tracked.
          <Link href="/orders/new" className="btn">Add the first order</Link>
        </div>
      ) : null}

      {orders.length ? (
        <Filtered
          store="orders"
          items={items}
          groups={[...groups.map((g) => ({ key: g.key, label: g.label, hot: g.hot })), { key: "done", label: "Delivered · paid in full" }, { key: "cancelled", label: "Cancelled" }]}
          chips={[
            { key: "all", label: "All" },
            { key: "ready", label: "In the shop" },
            { key: "call", label: "To call" },
            { key: "weaving", label: "With weaver" },
            { key: "handover", label: "To hand over" },
            { key: "deposit", label: "Awaiting deposit" },
            { key: "talking", label: "Talking" },
            { key: "balance", label: "Owes balance" },
            { key: "paid", label: "Fully paid" },
            { key: "delivered", label: "Delivered" },
            { key: "cancelled", label: "Cancelled" },
          ]}
          search="Search client, order or weaver"
          dates="Added"
          noun={["order", "orders"]}
          empty="No orders match."
        />
      ) : null}
    </div>
  );

  return <SplitView list={list}>{children}</SplitView>;
}

function Row({ o, group, cover }: { o: OrderFull; group: string; cover: string | null }) {
  const href = `/orders/${o.id}`;
  let sub = o.title ?? "";
  let end: React.ReactNode = null;

  if (group === "talking") {
    sub = [o.title, `added ${relativeDay(lagosDay(o.created_at))}`].filter(Boolean).join(" · ");
  } else if (group === "deposit") {
    sub = `Invoice sent ${relativeDay(o.invoiced_at)}`;
    const wa = waLink(o.client_phone);
    const text = encodeURIComponent(
      `Hello ${o.client_name}, this is Abake from Àbáké Olófì. A gentle reminder about the invoice for your ${o.title ?? "order"} (${o.ref}). Once the deposit is in, we start weaving. Thank you!`
    );
    end = wa ? <a className="btn ghost sm" href={`${wa}?text=${text}`} target="_blank" rel="noopener noreferrer">Remind</a> : null;
  } else if (group === "call") {
    const dueShares = (o.assignments ?? []).filter((a) => !a.received_at && a.next_call && a.next_call <= today());
    const names = dueShares.length ? dueShares.map((a) => a.weaver?.name ?? "Weaver").join(" & ") : o.weaver?.name ?? "Weaver";
    sub = `${names} · ${o.last_call ? `last call ${relativeDay(o.last_call)}` : "no call yet"}`;
    end = <Link className="btn ghost sm" href={`${href}?log=weaver`}>Called</Link>;
  } else if (group === "handover") {
    sub = `Deposit paid ${relativeDay(o.deposit_at)}`;
    end = <Link className="btn ghost sm" href={`${href}?step=1`}>Hand over</Link>;
  } else if (group === "ready" && money(o).balance > 0) {
    // Back in the shop: the balance must come in before it goes out.
    sub = `Collect ${naira(money(o).balance)} before delivery`;
    end = <Link className="btn sm" href="/money">Ask for balance</Link>;
  } else if (group === "weaving" || group === "ready") {
    sub = [o.title, group === "weaving" && o.next_call ? `next call ${relativeDay(o.next_call)}` : null].filter(Boolean).join(" · ");
    const late = o.client_promised && o.client_promised < today();
    end = o.client_promised ? (
      <div>
        <div className="date-big">{shortDate(o.client_promised)}</div>
        <div className={`small ${late ? "hot" : "mut"}`}>{daysLeft(o.client_promised)}</div>
      </div>
    ) : null;
  } else if (group === "done") {
    sub = [o.title, `delivered ${relativeDay(o.delivered_at)}`].filter(Boolean).join(" · ");
    end = <div className="num mut">{naira(money(o).total)}</div>;
  } else if (group === "cancelled") {
    sub = [o.title, "cancelled"].filter(Boolean).join(" · ");
  } else if (group === "owed") {
    sub = `Delivered ${relativeDay(o.delivered_at)}`;
    end = <div className="num" style={{ fontWeight: 600 }}>{naira(money(o).balance)}</div>;
  }

  return (
    <div className="orow">
      <Swatch name={o.client_name} src={cover} />
      <RowLink href={href}>
        <div className="orow-name">{o.client_name}</div>
        <div className="orow-sub">{sub}</div>
      </RowLink>
      {end ? <div className="orow-end">{end}</div> : null}
    </div>
  );
}
