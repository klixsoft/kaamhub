import type { CurrencyFormat } from "@/config/finance"
import { PAYMENT_METHOD_LABELS } from "@/config/finance"
import { formatDate } from "@/lib/format"
import { formatMoney } from "@/lib/money"
import type { InvoiceDetail } from "@/server/modules/invoices/queries"

export function PaymentsList({ payments, currency, outstanding }: { payments: InvoiceDetail["payments"]; currency: CurrencyFormat; outstanding: number }) {
  return (
    <section aria-labelledby="payments-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="payments-heading" className="font-semibold">
          Payments
        </h2>
        <p className="text-sm text-muted-foreground">
          Balance due <span className="font-medium text-foreground tabular-nums">{formatMoney(outstanding, currency)}</span>
        </p>
      </div>
      {payments.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No payments recorded.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {payments.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span>
                <span className="font-medium">{formatDate(payment.paidOn)}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {PAYMENT_METHOD_LABELS[payment.method]}
                  {payment.reference ? ` · ${payment.reference}` : ""}
                  {payment.recordedBy ? ` · by ${payment.recordedBy}` : ""}
                </span>
              </span>
              <span className="font-medium tabular-nums">{formatMoney(payment.amount, currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
