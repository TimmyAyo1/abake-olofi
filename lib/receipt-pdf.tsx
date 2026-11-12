import "server-only";
import { Document, Image, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { INK, dmy, n, readLogo, s, setup } from "./invoice-pdf";
import { buyer, lineTotal, perLabel, receiptNo, saleMoney } from "./sales";
import type { Sale, Settings } from "./types";

// Same look as the invoice, but for something already paid for in full.

function ReceiptDoc({ sale, settings, logo }: { sale: Sale; settings: Settings; logo: Buffer | null }) {
  const m = saleMoney(sale);
  const no = receiptNo(sale);
  return (
    <Document title={`Receipt ${no} · ${buyer(sale)}`} author={settings.biz_name} creator={settings.biz_name}>
      <Page size="A4" style={s.page}>
        <View style={s.top}>
          <Text style={s.title}>RECEIPT</Text>
          {logo ? <Image style={s.logo} src={{ data: logo, format: "png" }} /> : <Text style={s.label}>{settings.biz_name}</Text>}
        </View>

        <View style={s.meta}>
          <View>
            <Text style={s.label}>SOLD TO:</Text>
            <Text style={s.client}>{buyer(sale).toUpperCase()}</Text>
          </View>
          <View style={s.metaRight}>
            <View style={s.metaLine}><Text style={s.label}>RECEIPT NO:</Text><Text style={s.label}>{no}</Text></View>
            <View style={s.metaLine}><Text style={[s.item, { letterSpacing: 1 }]}>DATE:</Text><Text style={[s.item, { letterSpacing: 1 }]}>{dmy(sale.sold_on)}</Text></View>
          </View>
        </View>

        <View style={s.head}>
          <Text style={[s.label, { width: "44%", paddingRight: 10 }]}>DESCRIPTION</Text>
          <Text style={[s.label, { width: "18%", textAlign: "center" }]}>RATE (NGN)</Text>
          <Text style={[s.label, { width: "18%", textAlign: "center" }]}>QTY</Text>
          <Text style={[s.label, s.cTotal]}>TOTAL (NGN)</Text>
        </View>

        {sale.lines.map((l, i) => (
          <View key={i} style={s.row} wrap={false}>
            <Text style={[s.item, { width: "44%", paddingRight: 10 }]}>{l.desc}</Text>
            <Text style={[s.item, { width: "18%", textAlign: "center" }]}>{n(Number(l.unit) || 0)}</Text>
            <Text style={[s.item, { width: "18%", textAlign: "center" }]}>{perLabel(l.qty, l.per)}</Text>
            <Text style={[s.item, s.cTotal]}>{n(lineTotal(l))}</Text>
          </View>
        ))}

        <View style={s.rule} />

        <View wrap={false}>
          <View style={[s.tRow, { justifyContent: "space-between" }]}>
            <Text style={[s.label, { letterSpacing: 1.4 }]}>SUBTOTAL</Text>
            <Text style={s.tValue}>{n(m.subtotal)}</Text>
          </View>
          {m.discount ? <View style={s.tRow}><Text style={s.tLabel}>DISCOUNT</Text><Text style={s.tValue}>−{n(m.discount)}</Text></View> : null}
          <View style={[s.tRow, { marginTop: 10, paddingTop: 8, borderTopWidth: 0.6, borderTopColor: INK, alignSelf: "flex-end", width: 310 }]}>
            <Text style={[s.tLabel, { width: 200 }]}>AMOUNT PAID</Text><Text style={[s.tValue, { fontWeight: 700 }]}>{n(m.total)}</Text>
          </View>
          <View style={s.tRow}><Text style={s.tLabel}>BALANCE</Text><Text style={s.tValue}>PAID</Text></View>

          {settings.account_number ? (
            <View style={s.pay}>
              <Text style={[s.label, { marginBottom: 3 }]}>PAID INTO:</Text>
              <Text style={s.payText}>{[settings.bank_name, settings.account_name].filter(Boolean).join(" · ")}</Text>
            </View>
          ) : null}
          <Text style={[s.payText, { marginTop: 26, fontSize: 9.5, color: INK, letterSpacing: 1 }]}>THANK YOU FOR SHOPPING WITH US.</Text>
        </View>

        <Text style={s.foot} fixed>{[settings.address, settings.phone, settings.handle].filter(Boolean).join("  ·  ")}</Text>
      </Page>
    </Document>
  );
}

export async function receiptPdf(sale: Sale, settings: Settings): Promise<Buffer> {
  setup();
  return renderToBuffer(<ReceiptDoc sale={sale} settings={settings} logo={readLogo()} />);
}
