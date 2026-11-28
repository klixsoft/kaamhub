import { Badge } from "@/components/ui/badge"
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/config/finance"
import { cn } from "@/lib/utils"

const DOT: Record<InvoiceStatus, string> = {
  draft: "bg-zinc-400",
  issued: "bg-amber-500",
  partially_paid: "bg-sky-500",
  paid: "bg-emerald-500",
  credited: "bg-violet-500",
  cancelled: "bg-red-500",
}

export function InvoiceStatusBadge({ status, overdue }: { status: InvoiceStatus; overdue?: boolean }) {
  return (
    <Badge variant={overdue ? "destructive" : "outline"}>
      <span aria-hidden className={cn("size-1.5 rounded-full", overdue ? "bg-current" : DOT[status])} />
      {overdue ? "Overdue" : INVOICE_STATUS_LABELS[status]}
    </Badge>
  )
}

export function isOverdue(status: InvoiceStatus, dueDate: string | null, today: string): boolean {
  return (status === "issued" || status === "partially_paid") && dueDate !== null && dueDate < today
}
