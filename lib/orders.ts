import type { CSSProperties } from "react";
import type { Line, OrderFull, Stage } from "./types";
import { daysBetween, today } from "./format";

export const STAGES: { id: Stage; label: string; action: string | null }[] = [
  { id: "enquiry", label: "Talking", action: "Send invoice" },
  { id: "invoiced", label: "Waiting for deposit", action: "Deposit received" },
  { id: "deposit", label: "Deposit paid", action: "Hand over to weaver" },
  { id: "weaving", label: "With weaver", action: "Weaver delivered it" },
  { id: "ready", label: "Ready to deliver", action: "Delivered to client" },
  { id: "delivered", label: "Delivered", action: null },
];

export const stageIndex = (s: Stage) => STAGES.findIndex((x) => x.id === s);
export const stageLabel = (s: Stage) => STAGES[stageIndex(s)]?.label ?? s;

/** What the client sees. */
export const CLIENT_STEPS = [
  { label: "Order confirmed", reached: (s: Stage) => stageIndex(s) >= stageIndex("deposit") },
  { label: "On the loom", reached: (s: Stage) => stageIndex(s) >= stageIndex("weaving") },
  { label: "Finishing and checks", reached: (s: Stage) => stageIndex(s) >= stageIndex("ready") },
  { label: "Ready for you", reached: (s: Stage) => stageIndex(s) >= stageIndex("ready") },
  { label: "Delivered", reached: (s: Stage) => s === "delivered" },
];

export const SOURCES = ["TikTok", "Instagram", "Referral", "WhatsApp", "Walk-in", "Other"];

export const COLOURWAYS: Record<string, [string, string, string]> = {
  "Royal blue": ["#1F3A7A", "#C9CED8", "#2B4C99"],
  Wine: ["#6E1A2C", "#C9A24A", "#5A1524"],
  Emerald: ["#11604A", "#D9C88F", "#0C4C3A"],
  Coral: ["#E4572E", "#F5D3B8", "#C9441F"],
  Ivory: ["#E8DCC4", "#8A6D3B", "#DCCDAF"],
  Plum: ["#4B2448", "#D7B46A", "#3A1B38"],
  Gold: ["#B8892E", "#F3E3B5", "#9C7322"],
  Black: ["#1A1716", "#C9A24A", "#2B2725"],
  Silver: ["#9EA3AB", "#ECEEF1", "#7E838C"],
  Peach: ["#F2A07B", "#FBE3D3", "#E08A63"],
};

export function swatchStyle(colourway: string | null | undefined): CSSProperties {
  const c = COLOURWAYS[colourway ?? ""] ?? ["#D9D3CE", "#F1EDEA", "#CDC6C0"];
  return {
    background: `repeating-linear-gradient(90deg, ${c[0]} 0 7px, ${c[1]} 7px 9px, ${c[2]} 9px 15px, ${c[1]} 15px 16px)`,
  };
}

export const linesTotal = (lines: Line[] | null | undefined) =>
  (lines ?? []).reduce((a, l) => a + (Number(l.qty) || 1) * (Number(l.unit) || 0), 0);

export function money(o: OrderFull) {
  const subtotal = linesTotal(o.lines);
  const discount = Number(o.discount) || 0;
  const total = subtotal - discount;
  const depositDue = o.deposit_due != null ? Number(o.deposit_due) : Math.round(total / 2);
  const paidIn = o.payments.filter((p) => p.direction === "in").reduce((a, p) => a + Number(p.amount), 0);
  const paidOut = o.payments.filter((p) => p.direction === "out").reduce((a, p) => a + Number(p.amount), 0);
  const weaverCost = Number(o.weaver_cost) || 0;
  return {
    subtotal,
    discount,
    depositDue,
    total,
    paidIn,
    balance: total - paidIn,
    weaverCost,
    paidOut,
    owedToWeaver: Math.max(0, weaverCost - paidOut),
    kept: total - weaverCost - (Number(o.other_costs) || 0),
    invoiceNo: o.invoice_no ? String(o.invoice_no).padStart(5, "0") : null,
  };
}

export type Group = { key: string; label: string; hot?: boolean; orders: OrderFull[] };

/** Splits live orders into the sections on the Orders screen. */
export function groupOrders(orders: OrderFull[]): Group[] {
  const t = today();
  const live = orders.filter((o) => !o.cancelled);
  const callToday = live.filter((o) => o.stage === "weaving" && o.next_call && o.next_call <= t);
  const callIds = new Set(callToday.map((o) => o.id));
  const byDate = (a: OrderFull, b: OrderFull) =>
    (a.client_promised ?? "9999").localeCompare(b.client_promised ?? "9999");

  return [
    { key: "talking", label: "Still talking", orders: live.filter((o) => o.stage === "enquiry") },
    { key: "deposit", label: "Waiting for deposit", orders: live.filter((o) => o.stage === "invoiced") },
    { key: "call", label: "Weavers to call today", hot: true, orders: callToday.sort((a, b) => (a.next_call ?? "").localeCompare(b.next_call ?? "")) },
    { key: "handover", label: "Deposit paid · hand to weaver", orders: live.filter((o) => o.stage === "deposit") },
    { key: "weaving", label: "With weaver", orders: live.filter((o) => o.stage === "weaving" && !callIds.has(o.id)).sort(byDate) },
    { key: "ready", label: "Ready to deliver", orders: live.filter((o) => o.stage === "ready").sort(byDate) },
    { key: "owed", label: "Delivered · balance owed", orders: live.filter((o) => o.stage === "delivered" && money(o).balance > 0) },
  ].filter((g) => g.orders.length > 0);
}

export function daysSince(d: string | null | undefined): number | null {
  return d ? daysBetween(d, today()) : null;
}

export const isLive = (o: OrderFull) => !o.cancelled && o.stage !== "delivered";
