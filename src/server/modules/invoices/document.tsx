import { PDF_FONT } from "@/server/pdf/fonts"
import { Document, Page, Image as PdfImage, StyleSheet, Text, View } from "@react-pdf/renderer"
import type { Calendar } from "@/config/finance"
import { balanceDue, taxLabel } from "@/lib/invoice-math"
import { amountInWords, formatMoney } from "@/lib/money"
import { toBsDate } from "@/lib/nepali-date"
import type { InvoiceView } from "./view"

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: PDF_FONT, color: "#111827", lineHeight: 1.4 },
  row: { flexDirection: "row" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  seller: { maxWidth: "55%" },
  logo: { maxWidth: 160, maxHeight: 48, objectFit: "contain", marginBottom: 8 },
  sellerName: { fontSize: 15, fontWeight: 700, marginBottom: 4 },
  muted: { color: "#6b7280" },
  title: { fontSize: 16, fontWeight: 700, textAlign: "right", marginBottom: 6, letterSpacing: 1 },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  metaLabel: { color: "#6b7280", width: 80, textAlign: "right" },
  metaValue: { width: 150, textAlign: "right", fontWeight: 700 },
  section: { marginBottom: 18 },
  sectionLabel: { fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  bold: { fontWeight: 700 },
  table: { borderTopWidth: 1, borderColor: "#111827" },
  th: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#111827", paddingVertical: 5, fontWeight: 700 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#d1d5db", paddingVertical: 5 },
  cSn: { width: "6%" },
  cDesc: { width: "44%", paddingRight: 6 },
  cQty: { width: "10%", textAlign: "right" },
  cUnit: { width: "10%", textAlign: "center" },
  cRate: { width: "15%", textAlign: "right" },
  cAmount: { width: "15%", textAlign: "right" },
  totals: { marginLeft: "auto", width: "45%", marginTop: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grandTotal: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderColor: "#111827", marginTop: 4, paddingTop: 5, fontSize: 11, fontWeight: 700 },
  words: { marginTop: 12, padding: 8, backgroundColor: "#f3f4f6" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  signature: { width: 160, borderTopWidth: 0.5, borderColor: "#111827", paddingTop: 4, textAlign: "center" },
  watermark: { position: "absolute", top: 330, left: 0, right: 0, textAlign: "center", fontSize: 72, color: "#ef4444", opacity: 0.12, transform: "rotate(-30deg)", fontWeight: 700 },
})

function formatInvoiceDate(isoDate: string | null, calendar: Calendar): string {
  if (!isoDate) return "—"
  return calendar === "bikram_sambat" ? `${isoDate} (${toBsDate(isoDate)} BS)` : isoDate
}

export interface PdfLogo {
  data: Buffer
  format: "png" | "jpg"
}

export function InvoiceDocument({ invoice, logo }: { invoice: InvoiceView; logo: PdfLogo | null }) {
  const money = (value: number) => formatMoney(value, invoice.currency)
  const watermark = invoice.status === "draft" ? "DRAFT" : invoice.status === "cancelled" ? "CANCELLED" : null

  return (
    <Document title={invoice.number ?? "Draft invoice"} author={invoice.seller.name} subject="Invoice">
      <Page size="A4" style={styles.page}>
        {watermark ? <Text style={styles.watermark}>{watermark}</Text> : null}
        <View style={styles.header}>
          <View style={styles.seller}>
            {logo ? <PdfImage src={logo} style={styles.logo} /> : null}
            <Text style={styles.sellerName}>{invoice.seller.name}</Text>
            {invoice.seller.address ? <Text style={styles.muted}>{invoice.seller.address}</Text> : null}
            {invoice.seller.contact ? <Text style={styles.muted}>{invoice.seller.contact}</Text> : null}
            {invoice.seller.taxNumber ? <Text style={styles.bold}>{invoice.seller.taxLabel}: {invoice.seller.taxNumber}</Text> : null}
          </View>
          <View>
            <Text style={styles.title}>{invoice.title.toUpperCase()}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{invoice.kind === "credit_note" ? "Credit note no." : "Invoice no."}</Text>
              <Text style={styles.metaValue}>{invoice.number ?? "Not issued"}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{formatInvoiceDate(invoice.issueDate, invoice.calendar)}</Text>
            </View>
            {invoice.dueDate ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due date</Text>
                <Text style={styles.metaValue}>{formatInvoiceDate(invoice.dueDate, invoice.calendar)}</Text>
              </View>
            ) : null}
            {invoice.fiscalYear ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Fiscal year</Text>
                <Text style={styles.metaValue}>{invoice.fiscalYear}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bill to</Text>
          <Text style={styles.bold}>{invoice.buyer.name}</Text>
          {invoice.buyer.address ? <Text>{invoice.buyer.address}</Text> : null}
          {invoice.buyer.taxNumber ? (
            <Text>
              {invoice.seller.taxLabel}: {invoice.buyer.taxNumber}
            </Text>
          ) : null}
          {invoice.projectName ? <Text style={styles.muted}>Project: {invoice.projectName}</Text> : null}
        </View>

        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={styles.cSn}>S.N.</Text>
            <Text style={styles.cDesc}>Description</Text>
            <Text style={styles.cQty}>Qty</Text>
            <Text style={styles.cUnit}>Unit</Text>
            <Text style={styles.cRate}>Rate</Text>
            <Text style={styles.cAmount}>Amount</Text>
          </View>
          {invoice.items.map((item, index) => (
            <View key={item.id} style={styles.tr} wrap={false}>
              <Text style={styles.cSn}>{index + 1}</Text>
              <Text style={styles.cDesc}>{item.description}</Text>
              <Text style={styles.cQty}>{item.quantity}</Text>
              <Text style={styles.cUnit}>{item.unit ?? ""}</Text>
              <Text style={styles.cRate}>{money(item.rate)}</Text>
              <Text style={styles.cAmount}>{money(item.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals} wrap={false}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{money(invoice.subtotal)}</Text>
          </View>
          {invoice.discount > 0 ? (
            <View style={styles.totalRow}>
              <Text>Discount</Text>
              <Text>- {money(invoice.discount)}</Text>
            </View>
          ) : null}
          {invoice.taxes.length > 0 ? (
            <View style={styles.totalRow}>
              <Text>Taxable amount</Text>
              <Text>{money(invoice.taxableAmount)}</Text>
            </View>
          ) : null}
          {invoice.taxes.map((tax, index) => (
            <View key={`${tax.name}-${index}`} style={styles.totalRow}>
              <Text>{taxLabel(tax)}</Text>
              <Text>{money(tax.amount)}</Text>
            </View>
          ))}
          <View style={styles.grandTotal}>
            <Text>{invoice.kind === "credit_note" ? "Total credit" : "Total"}</Text>
            <Text>{money(invoice.total)}</Text>
          </View>
          {invoice.amountPaid > 0 ? (
            <View style={styles.totalRow}>
              <Text>Paid</Text>
              <Text>{money(invoice.amountPaid)}</Text>
            </View>
          ) : null}
          {invoice.amountCredited > 0 ? (
            <View style={styles.totalRow}>
              <Text>Credited</Text>
              <Text>{money(invoice.amountCredited)}</Text>
            </View>
          ) : null}
          {invoice.amountPaid > 0 || invoice.amountCredited > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.bold}>Balance due</Text>
              <Text style={styles.bold}>{money(balanceDue(invoice))}</Text>
            </View>
          ) : null}
        </View>

        {invoice.showAmountInWords ? (
          <View style={styles.words} wrap={false}>
            <Text>
              <Text style={styles.bold}>In words: </Text>
              {amountInWords(invoice.total, invoice.currency)}
            </Text>
          </View>
        ) : null}

        {invoice.bankDetails ? (
          <View style={[styles.section, { marginTop: 16 }]} wrap={false}>
            <Text style={styles.sectionLabel}>Payment details</Text>
            <Text>{invoice.bankDetails}</Text>
          </View>
        ) : null}
        {invoice.notes ? (
          <View style={[styles.section, { marginTop: invoice.bankDetails ? 0 : 16 }]} wrap={false}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        ) : null}
        {invoice.cancelReason ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Cancelled</Text>
            <Text>{invoice.cancelReason}</Text>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text style={[styles.muted, { maxWidth: "60%" }]}>{invoice.footer}</Text>
          <Text style={styles.signature}>Authorised signature</Text>
        </View>
      </Page>
    </Document>
  )
}
