import "server-only";
import fs from "node:fs";
import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { money } from "./orders";
import { today } from "./format";
import type { OrderFull, Settings } from "./types";

// Laid out after Abake's own invoice (THE OJOS INV): wide-tracked capitals, logo top right,
// sections such as "Loom Asooke", then subtotal → discount → deposit due → balance on delivery.

const fontPath = (f: string) => path.join(process.cwd(), "app", "fonts", f);
let ready = false;
export function setup() {
  if (ready) return;
  Font.register({
    family: "Inter",
    fonts: [
      { src: fontPath("Inter-Regular.otf"), fontWeight: 400 },
      { src: fontPath("Inter-Medium.otf"), fontWeight: 500 },
      { src: fontPath("Inter-SemiBold.otf"), fontWeight: 600 },
      { src: fontPath("Inter-Bold.otf"), fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((w) => [w]);
  ready = true;
}

export const INK = "#3a3a3a";
export const SOFT = "#5a5a5a";

export const s = StyleSheet.create({
  page: { fontFamily: "Inter", color: INK, paddingTop: 64, paddingBottom: 56, paddingHorizontal: 58, fontSize: 9 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 32, fontWeight: 700, letterSpacing: 5 },
  logo: { width: 96, height: 106 }, // Asset 10 is 1526 × 1683
  meta: { flexDirection: "row", justifyContent: "space-between", marginTop: 34 },
  label: { fontSize: 8, fontWeight: 700, letterSpacing: 1.2 },
  client: { fontSize: 12.5, fontWeight: 600, letterSpacing: 1.6, marginTop: 4 },
  metaRight: { alignItems: "flex-end", gap: 8 },
  metaLine: { flexDirection: "row", gap: 18 },
  head: { flexDirection: "row", marginTop: 38, paddingBottom: 9, borderBottomWidth: 1, borderBottomColor: INK },
  row: { flexDirection: "row", paddingVertical: 7 },
  cDesc: { width: "48%", paddingRight: 10 },
  cRate: { width: "20%", textAlign: "center" },
  cQty: { width: "12%", textAlign: "center" },
  cTotal: { width: "20%", textAlign: "right" },
  item: { fontSize: 9, letterSpacing: 0.7, color: SOFT, lineHeight: 1.5 },
  bold: { fontSize: 9, letterSpacing: 0.7, fontWeight: 700, color: INK },
  section: { fontSize: 11, fontWeight: 600, letterSpacing: 0.8, marginTop: 16, marginBottom: 2 },
  rule: { borderBottomWidth: 0.8, borderBottomColor: INK, marginTop: 14 },
  tRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "baseline", marginTop: 8 },
  tLabel: { fontSize: 8.5, fontWeight: 700, letterSpacing: 1.4, width: 200, textAlign: "right", paddingRight: 24 },
  tValue: { fontSize: 13, fontWeight: 600, letterSpacing: 1, width: 110, textAlign: "right" },
  pay: { marginTop: 30, gap: 3 },
  payText: { fontSize: 9, letterSpacing: 0.6, color: SOFT },
  foot: { position: "absolute", bottom: 30, left: 58, right: 58, fontSize: 7.5, color: "#8a8a8a", textAlign: "center", letterSpacing: 0.6 },
});

export const n = (v: number) => Math.round(v).toLocaleString("en-NG");
export const dmy = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;

function InvoiceDoc({ o, settings, logo }: { o: OrderFull; settings: Settings; logo: Buffer | null }) {
  const m = money(o);
  const paid = m.paidIn;
  return (
    <Document title={`Invoice ${m.invoiceNo ?? o.ref} · ${o.client_name}`} author={settings.biz_name} creator={settings.biz_name}>
      <Page size="A4" style={s.page}>
        <View style={s.top}>
          <Text style={s.title}>INVOICE</Text>
          {logo ? <Image style={s.logo} src={{ data: logo, format: "png" }} /> : <Text style={s.label}>{settings.biz_name}</Text>}
        </View>

        <View style={s.meta}>
          <View>
            <Text style={s.label}>ISSUED TO:</Text>
            <Text style={s.client}>{o.client_name.toUpperCase()}</Text>
          </View>
          <View style={s.metaRight}>
            <View style={s.metaLine}><Text style={s.label}>INVOICE NO:</Text><Text style={s.label}>{m.invoiceNo ?? o.ref}</Text></View>
            <View style={s.metaLine}><Text style={[s.item, { letterSpacing: 1 }]}>DATE:</Text><Text style={[s.item, { letterSpacing: 1 }]}>{dmy(o.invoiced_at ?? today())}</Text></View>
          </View>
        </View>

        <View style={s.head}>
          <Text style={[s.label, s.cDesc]}>DESCRIPTION</Text>
          <Text style={[s.label, s.cRate]}>RATE (NGN)</Text>
          <Text style={[s.label, s.cQty]}>QTY</Text>
          <Text style={[s.label, s.cTotal]}>TOTAL (NGN)</Text>
        </View>

        {o.lines.map((l, i) => {
          const qty = Number(l.qty) || 1;
          const unit = Number(l.unit) || 0;
          if (l.heading && !unit) return <Text key={i} style={s.section}>{l.desc}</Text>;
          const st = l.heading ? s.bold : s.item;
          return (
            <View key={i} style={[s.row, l.heading ? { marginTop: 8 } : {}]} wrap={false}>
              <Text style={[st, s.cDesc]}>{l.desc}</Text>
              <Text style={[st, s.cRate]}>{n(unit)}</Text>
              <Text style={[st, s.cQty]}>{qty}</Text>
              <Text style={[st, s.cTotal]}>{n(qty * unit)}</Text>
            </View>
          );
        })}

        <View style={s.rule} />

        <View wrap={false}>
          <View style={[s.tRow, { justifyContent: "space-between" }]}>
            <Text style={[s.label, { letterSpacing: 1.4 }]}>SUBTOTAL</Text>
            <Text style={s.tValue}>{n(m.subtotal)}</Text>
          </View>
          {m.discount ? (
            <>
              <View style={s.tRow}><Text style={s.tLabel}>DISCOUNT</Text><Text style={s.tValue}>−{n(m.discount)}</Text></View>
              <View style={[s.tRow, { marginTop: 10, paddingTop: 8, borderTopWidth: 0.6, borderTopColor: INK, alignSelf: "flex-end", width: 310 }]}><Text style={[s.tLabel, { width: 200 }]}>TOTAL</Text><Text style={[s.tValue, { fontWeight: 700 }]}>{n(m.total)}</Text></View>
            </>
          ) : null}
          {paid > 0 ? (
            <>
              <View style={s.tRow}><Text style={s.tLabel}>{o.payments.filter((p) => p.direction === "in").every((p) => p.kind === "deposit") ? "DEPOSIT PAID" : "AMOUNT PAID"}</Text><Text style={s.tValue}>{n(paid)}</Text></View>
              <View style={s.tRow}><Text style={s.tLabel}>{m.balance > 0 ? "BALANCE DUE" : "BALANCE"}</Text><Text style={s.tValue}>{m.balance > 0 ? n(m.balance) : "PAID"}</Text></View>
            </>
          ) : (
            <>
              <View style={s.tRow}><Text style={s.tLabel}>DEPOSIT DUE</Text><Text style={s.tValue}>{n(m.depositDue)}</Text></View>
              <View style={s.tRow}><Text style={s.tLabel}>BALANCE ON DELIVERY</Text><Text style={s.tValue}>{n(m.total - m.depositDue)}</Text></View>
            </>
          )}

          {settings.account_number ? (
            <View style={s.pay}>
              <Text style={[s.label, { marginBottom: 3 }]}>PAYMENT INFO:</Text>
              {settings.bank_name ? <Text style={s.payText}>{settings.bank_name}</Text> : null}
              {settings.account_name ? <Text style={s.payText}>Account Name: {settings.account_name}</Text> : null}
              <Text style={s.payText}>Account No.: <Text style={{ fontWeight: 700, color: INK }}>{settings.account_number}</Text></Text>
            </View>
          ) : null}
          {settings.terms ? <Text style={[s.payText, { marginTop: 18, fontSize: 8 }]}>{settings.terms}</Text> : null}
        </View>

        <Text style={s.foot} fixed>{[settings.address, settings.phone, settings.handle].filter(Boolean).join("  ·  ")}</Text>
      </Page>
    </Document>
  );
}

export async function invoicePdf(o: OrderFull, settings: Settings): Promise<Buffer> {
  setup();
  let logo: Buffer | null = null;
  try { logo = fs.readFileSync(path.join(process.cwd(), "public", "logo.png")); } catch {}
  return renderToBuffer(<InvoiceDoc o={o} settings={settings} logo={logo} />);
}

export function invoiceFileName(o: OrderFull) {
  const no = o.invoice_no ? String(o.invoice_no).padStart(5, "0") : o.ref;
  return `Invoice ${no} - ${o.client_name}.pdf`.replace(/[\\/:*?"<>|]/g, "");
}

export function readLogo(): Buffer | null {
  try { return fs.readFileSync(path.join(process.cwd(), "public", "logo.png")); } catch { return null; }
}
