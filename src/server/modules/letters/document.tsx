import { Document, Page, Image as PdfImage, StyleSheet, Text, View } from "@react-pdf/renderer"
import type { LetterLayout } from "@/config/letters"
import { formatDate } from "@/lib/format"
import { type LetterBlock, parseLetter } from "@/lib/letter-format"

const MM = 72 / 25.4
const A4 = { width: 595.28, height: 841.89 }
const PAGE_NUMBER_SPACE = 16

const styles = StyleSheet.create({
  page: { fontSize: 10.5, fontFamily: "Helvetica", color: "#111827", lineHeight: 1.5 },
  background: { position: "absolute", top: 0, left: 0, width: A4.width, height: A4.height },
  meta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18, fontSize: 9.5 },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 16, textDecoration: "underline" },
  heading: { fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 6, marginBottom: 4 },
  paragraph: { marginBottom: 9 },
  bullet: { flexDirection: "row", marginBottom: 3, paddingLeft: 6 },
  afterList: { marginTop: 6 },
  bulletMark: { width: 12 },
  bulletText: { flex: 1 },
  bold: { fontFamily: "Helvetica-Bold" },
  signature: { marginTop: 36 },
  signatureLine: { width: 170, borderTopWidth: 0.6, borderColor: "#111827", marginBottom: 4 },
  watermark: { position: "absolute", top: 360, left: 0, right: 0, textAlign: "center", fontSize: 80, color: "#ef4444", opacity: 0.14, transform: "rotate(-30deg)", fontFamily: "Helvetica-Bold" },
})

export interface LetterDocumentProps {
  number: string
  letterDate: string
  title: string
  body: string
  layout: LetterLayout
  letterhead: { data: Buffer; format: "png" | "jpg" } | null
  revoked: boolean
  companyName: string
}

function Runs({ line }: { line: LetterBlock["lines"][number] }) {
  return (
    <>
      {line.map((run, index) => (
        <Text key={index} style={run.bold ? styles.bold : undefined}>
          {run.text}
        </Text>
      ))}
    </>
  )
}

function Block({ block, afterList }: { block: LetterBlock; afterList: boolean }) {
  if (block.kind === "bullet") {
    return (
      <View style={styles.bullet} wrap={false}>
        <Text style={styles.bulletMark}>•</Text>
        <Text style={styles.bulletText}>
          <Runs line={block.lines[0] ?? []} />
        </Text>
      </View>
    )
  }
  return (
    <Text style={[block.kind === "heading" ? styles.heading : styles.paragraph, afterList ? styles.afterList : {}]} minPresenceAhead={block.kind === "heading" ? 40 : 0}>
      {block.lines.map((line, index) => (
        <Text key={index}>
          {index > 0 ? "\n" : null}
          <Runs line={line} />
        </Text>
      ))}
    </Text>
  )
}

export function LetterDocument({ number, letterDate, title, body, layout, letterhead, revoked, companyName }: LetterDocumentProps) {
  const padding = {
    paddingTop: layout.topMm * MM,
    paddingBottom: layout.bottomMm * MM + PAGE_NUMBER_SPACE,
    paddingLeft: layout.leftMm * MM,
    paddingRight: layout.rightMm * MM,
  }
  return (
    <Document title={`${number} – ${title}`} author={companyName} subject={title}>
      <Page size="A4" style={[styles.page, padding]}>
        {letterhead ? <PdfImage fixed src={letterhead} style={styles.background} /> : null}
        {revoked ? <Text fixed style={styles.watermark}>REVOKED</Text> : null}
        <View style={styles.meta}>
          <Text>Ref: {number}</Text>
          <Text>Date: {formatDate(letterDate)}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        {parseLetter(body).map((block, index, blocks) => (
          <Block key={index} block={block} afterList={block.kind !== "bullet" && blocks[index - 1]?.kind === "bullet"} />
        ))}
        {layout.signatoryName ? (
          <View style={styles.signature} wrap={false}>
            <View style={styles.signatureLine} />
            <Text style={styles.bold}>{layout.signatoryName}</Text>
            {layout.signatoryTitle ? <Text>{layout.signatoryTitle}</Text> : null}
            <Text>{companyName}</Text>
          </View>
        ) : null}
        <Text
          fixed
          style={{ position: "absolute", top: A4.height - layout.bottomMm * MM - PAGE_NUMBER_SPACE + 4, left: layout.leftMm * MM, right: layout.rightMm * MM, textAlign: "right", fontSize: 8, color: "#6b7280" }}
          render={({ pageNumber, totalPages }) => (totalPages > 1 ? `${number} · Page ${pageNumber} of ${totalPages}` : "")}
        />
      </Page>
    </Document>
  )
}
