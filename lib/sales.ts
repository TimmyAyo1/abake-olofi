import type { Sale, SaleLine } from "./types";

export const UNITS = ["piece", "bundle", "yard", "set"] as const;
export const CHANNELS = ["Walk-in", "WhatsApp", "Instagram", "TikTok", "Online", "Other"] as const;

export const lineTotal = (l: SaleLine) => (Number(l.qty) || 1) * (Number(l.unit) || 0);

/** "3 yards", "1 bundle" */
export function perLabel(qty: number, per: string) {
  const q = Number(qty) || 1;
  return `${q} ${per || "piece"}${q === 1 ? "" : "s"}`;
}

export function saleMoney(s: Pick<Sale, "lines" | "discount">) {
  const subtotal = (s.lines ?? []).reduce((a, l) => a + lineTotal(l), 0);
  const discount = Math.min(Number(s.discount) || 0, subtotal);
  return { subtotal, discount, total: subtotal - discount };
}

export const receiptNo = (s: Pick<Sale, "receipt_no">) => (s.receipt_no ? `R${String(s.receipt_no).padStart(5, "0")}` : "R-----");

export const buyer = (s: Pick<Sale, "customer_name">) => s.customer_name?.trim() || "Walk-in customer";

/** What was bought, in one line: "Aso-oke × 3 yards, Fila" */
export function saleSummary(s: Pick<Sale, "lines">) {
  return (s.lines ?? []).map((l) => ((Number(l.qty) || 1) > 1 ? `${l.desc} × ${perLabel(l.qty, l.per)}` : l.desc)).join(", ");
}

export function receiptFileName(s: Sale) {
  return `Receipt ${receiptNo(s)} - ${buyer(s)}.pdf`.replace(/[\\/:*?"<>|]/g, "");
}
