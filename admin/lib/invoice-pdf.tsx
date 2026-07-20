import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatRand, invoiceTotalSent } from "@/lib/invoices";

export type InvoiceData = {
  nommer: string;
  uitgereik_op: string;
  status: string;
  notas: string | null;
  workspace: { naam: string; accent: string };
  client: { naam: string; epos: string | null; adres: string | null };
  lines: { beskrywing: string; aantal: number; eenheidsprys_sent: number }[];
  bank_besonderhede: string | null;
};

const s = StyleSheet.create({
  page: { backgroundColor: "#F7F6F2", padding: 48, fontSize: 10, color: "#1A1A1A" },
  reël: { height: 2, backgroundColor: "#1A1A1A", marginVertical: 10 },
  kop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  naam: { fontSize: 24, fontWeight: 700 },
  faktuur: { fontSize: 12, textAlign: "right" },
  ry: { flexDirection: "row", borderBottom: "1 solid #d5d3cd", paddingVertical: 6 },
  kol1: { flex: 5 },
  kol2: { flex: 1, textAlign: "right" },
  kol3: { flex: 2, textAlign: "right" },
  totaal: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12, fontSize: 13 },
});

export function InvoicePdf({ d }: { d: InvoiceData }) {
  const totaal = invoiceTotalSent(d.lines);
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.kop}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={s.naam}>{d.workspace.naam}</Text>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: d.workspace.accent,
                marginLeft: 8,
              }}
            />
          </View>
          <View>
            <Text style={s.faktuur}>FAKTUUR {d.nommer}</Text>
            <Text style={{ textAlign: "right", marginTop: 4, color: "#6b6a66" }}>
              Uitgereik: {d.uitgereik_op}
            </Text>
          </View>
        </View>
        <View style={s.reël} />

        <Text style={{ color: "#6b6a66", marginBottom: 2 }}>AAN</Text>
        <Text style={{ fontSize: 12, fontWeight: 700 }}>{d.client.naam}</Text>
        {d.client.epos ? <Text>{d.client.epos}</Text> : null}
        {d.client.adres ? <Text>{d.client.adres}</Text> : null}

        <View style={{ marginTop: 24 }}>
          <View style={[s.ry, { borderBottom: "2 solid #1A1A1A" }]}>
            <Text style={[s.kol1, { fontWeight: 700 }]}>BESKRYWING</Text>
            <Text style={[s.kol2, { fontWeight: 700 }]}>AANTAL</Text>
            <Text style={[s.kol3, { fontWeight: 700 }]}>BEDRAG</Text>
          </View>
          {d.lines.map((l, i) => (
            <View key={i} style={s.ry}>
              <Text style={s.kol1}>{l.beskrywing}</Text>
              <Text style={s.kol2}>{l.aantal}</Text>
              <Text style={s.kol3}>{formatRand(Math.round(l.aantal * l.eenheidsprys_sent))}</Text>
            </View>
          ))}
          <View style={s.totaal}>
            <Text style={{ fontWeight: 700 }}>TOTAAL  {formatRand(totaal)}</Text>
          </View>
        </View>

        {d.bank_besonderhede ? (
          <View style={{ marginTop: 32 }}>
            <Text style={{ color: "#6b6a66", marginBottom: 2 }}>BANKBESONDERHEDE</Text>
            <Text>{d.bank_besonderhede}</Text>
          </View>
        ) : null}
        {d.notas ? <Text style={{ marginTop: 16, color: "#6b6a66" }}>{d.notas}</Text> : null}
      </Page>
    </Document>
  );
}

export async function invoicePdfBuffer(d: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<InvoicePdf d={d} />);
}
