// Dates are stored as YYYY-MM-DD strings and read in Lagos time.
export const TZ = "Africa/Lagos";

export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

function parse(d: string): Date {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function addDays(d: string, n: number): string {
  const x = parse(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

/** Whole days from a to b (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);
}

export function shortDate(d: string | null | undefined): string {
  if (!d) return "—";
  return parse(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function longDate(d: string | null | undefined): string {
  if (!d) return "—";
  return parse(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
}

export function weekday(d: string): string {
  return parse(d).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

/** "today", "tomorrow", "Fri", "12 Dec", or "yesterday" / "3 days ago". */
export function relativeDay(d: string | null | undefined): string {
  if (!d) return "—";
  const n = daysBetween(today(), d);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n < -1) return `${-n} days ago`;
  if (n < 7) return weekday(d);
  return shortDate(d);
}

export function daysLeft(d: string | null | undefined): string {
  if (!d) return "";
  const n = daysBetween(today(), d);
  if (n === 0) return "today";
  if (n > 0) return `${n} day${n === 1 ? "" : "s"}`;
  return `${-n} day${n === -1 ? "" : "s"} late`;
}

/** The Lagos calendar day of a timestamp (an order added at 00:30 Lagos time counts for that day, not the day before). */
export function lagosDay(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
}

export function timeAgo(iso: string): string {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
  return relativeDay(d);
}

export function naira(n: number | null | undefined): string {
  return "₦" + Math.round(Number(n) || 0).toLocaleString("en-NG");
}

export function num(v: FormDataEntryValue | string | null | undefined): number {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function str(v: FormDataEntryValue | null | undefined): string {
  return String(v ?? "").trim();
}

/** WhatsApp link for a Nigerian number written as 080… or +234… */
export function waLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0")) d = "234" + d.slice(1);
  return d ? `https://wa.me/${d}` : null;
}
