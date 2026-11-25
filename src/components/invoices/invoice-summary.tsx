import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { taxTreatmentLabel } from "@/config/finance"
import { formatDate } from "@/lib/format"
import { amountInWords, formatMoney } from "@/lib/money"
import { toBsDate } from "@/lib/nepali-date"
import type { InvoiceView } from "@/server/modules/invoices/view"

interface PartyProps {
  label: string
  name: string
  address: string | null
  taxNumber: string | null
  taxLabel: string
}

function Party({ label, name, address, taxNumber, taxLabel }: PartyProps) {
  return (
    <div className="space-y-0.5 text-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="font-medium">{name}</p>
      {address ? <p className="whitespace-pre-line text-muted-foreground">{address}</p> : null}
      {taxNumber ? (
        <p>
          {taxLabel}: {taxNumber}
        </p>
      ) : null}
    </div>
  )
}

export function InvoiceSummary({ invoice }: { invoice: InvoiceView }) {
  const money = (value: number) => formatMoney(value, invoice.currency)
  const rows: Array<[string, number, boolean?]> = [
    ["Subtotal", invoice.subtotal],
    ...(invoice.discount > 0 ? [["Discount", -invoice.discount] as [string, number]] : []),
    ["Taxable amount", invoice.taxableAmount],
    [taxTreatmentLabel(invoice.taxTreatment, invoice.taxName, invoice.taxRate), invoice.taxAmount],
    ["Total", invoice.total, true],
  ]

  return (
    <article className="flex flex-col gap-6 rounded-lg border bg-card p-4 sm:p-6" aria-label="Invoice">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <Party
          label="From"
          name={invoice.seller.name}
          address={invoice.seller.address}
          taxNumber={invoice.seller.taxNumber}
          taxLabel={invoice.seller.taxLabel}
        />
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm sm:text-right">
          <dt className="text-muted-foreground">Document</dt>
          <dd className="font-semibold">{invoice.title}</dd>
          <dt className="text-muted-foreground">Invoice no.</dt>
          <dd className="font-mono">{invoice.number ?? "Assigned when issued"}</dd>
          <dt className="text-muted-foreground">Date</dt>
          <dd>
            {formatDate(invoice.issueDate)}
            {invoice.calendar === "bikram_sambat" ? <span className="text-muted-foreground"> ({toBsDate(invoice.issueDate)} BS)</span> : null}
          </dd>
          {invoice.dueDate ? (
            <>
              <dt className="text-muted-foreground">Due</dt>
              <dd>{formatDate(invoice.dueDate)}</dd>
            </>
          ) : null}
        </dl>
      </div>
      <Party
        label="Bill to"
        name={invoice.buyer.name}
        address={invoice.buyer.address}
        taxNumber={invoice.buyer.taxNumber}
        taxLabel={invoice.seller.taxLabel}
      />
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="min-w-48 whitespace-normal">{item.description}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.quantity} {item.unit ?? ""}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(item.rate)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(item.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <dl className="ml-auto grid w-full max-w-sm grid-cols-2 gap-y-1 text-sm">
        {rows.map(([label, value, strong]) => (
          <div key={label} className={strong ? "col-span-2 mt-1 flex justify-between border-t pt-2 text-base font-semibold" : "col-span-2 flex justify-between"}>
            <dt>{label}</dt>
            <dd className="tabular-nums">{money(value)}</dd>
          </div>
        ))}
      </dl>
      {invoice.showAmountInWords ? (
        <p className="rounded-md bg-muted px-3 py-2 text-sm">
          <span className="font-medium">In words: </span>
          {amountInWords(invoice.total, invoice.currency)}
        </p>
      ) : null}
      {invoice.notes ? <p className="text-sm whitespace-pre-line text-muted-foreground">{invoice.notes}</p> : null}
      {invoice.cancelReason ? <p className="text-sm text-destructive">Cancelled: {invoice.cancelReason}</p> : null}
    </article>
  )
}
