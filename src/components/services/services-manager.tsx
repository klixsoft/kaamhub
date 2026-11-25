"use client"

import { FileTextIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { FormDialog } from "@/components/forms/form-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BILLING_CYCLE_LABELS, type CurrencyFormat, SERVICE_STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/config/finance"
import { useServerAction } from "@/hooks/use-server-action"
import { formatDate } from "@/lib/format"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import { deleteService, invoiceServiceNow } from "@/server/modules/services/actions"
import type { ServiceRow } from "@/server/modules/services/queries"
import { ServiceForm } from "./service-form"

interface ServicesManagerProps {
  projectId: string
  services: ServiceRow[]
  canManage: boolean
  hasClient: boolean
  currency: CurrencyFormat
  defaultTreatment: string
  today: string
}

export function ServicesManager({ projectId, services, canManage, hasClient, currency, defaultTreatment, today }: ServicesManagerProps) {
  const router = useRouter()
  const { isPending, run } = useServerAction()
  const formProps = { projectId, currencySymbol: currency.symbol, defaultTreatment, today }

  return (
    <div className="flex flex-col gap-4">
      {!hasClient ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Link this project to a client to bill its services.</p>
      ) : null}
      {canManage ? (
        <div className="flex justify-end">
          <FormDialog
            title="Add managed service"
            trigger={
              <Button>
                <PlusIcon aria-hidden />
                Add service
              </Button>
            }
          >
            {(close) => <ServiceForm {...formProps} onSaved={close} />}
          </FormDialog>
        </div>
      ) : null}
      {services.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No services yet. Add the domain, hosting or maintenance plan you manage for this client.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {services.map((service) => {
            const expired = service.expiresOn !== null && service.expiresOn < today
            return (
              <li key={service.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{service.name}</span>
                    <Badge variant="secondary">{SERVICE_TYPE_LABELS[service.type]}</Badge>
                    {service.status !== "active" ? <Badge variant="outline">{SERVICE_STATUS_LABELS[service.status]}</Badge> : null}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(service.amount, currency)} · {BILLING_CYCLE_LABELS[service.billingCycle]}
                    {service.provider ? ` · ${service.provider}` : ""}
                  </p>
                  <p className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                    <span>Next bill {formatDate(service.nextBillingOn)}</span>
                    {service.expiresOn ? (
                      <span className={cn(expired && "font-medium text-destructive")}>
                        {expired ? "Expired" : "Expires"} {formatDate(service.expiresOn)}
                      </span>
                    ) : null}
                  </p>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <ConfirmDialog
                      trigger={
                        <Button variant="outline" size="sm" disabled={isPending || !hasClient || service.status !== "active"}>
                          <FileTextIcon aria-hidden />
                          Bill next period
                        </Button>
                      }
                      title="Create the next invoice now?"
                      description={`A draft invoice for the period starting ${formatDate(service.nextBillingOn)} is created and the next billing date moves forward one cycle.`}
                      confirmLabel="Create draft"
                      onConfirm={() =>
                        run(() => invoiceServiceNow({ serviceId: service.id }), "Draft invoice created", (invoice) => {
                          if (invoice) router.push(`/invoices/${invoice.id}`)
                        })
                      }
                    />
                    <FormDialog
                      title="Edit service"
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${service.name}`}>
                          <PencilIcon />
                        </Button>
                      }
                    >
                      {(close) => <ServiceForm {...formProps} service={service} onSaved={close} />}
                    </FormDialog>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon-sm" disabled={isPending} aria-label={`Delete ${service.name}`}>
                          <Trash2Icon />
                        </Button>
                      }
                      title={`Delete ${service.name}?`}
                      description="Existing invoices stay. Future recurring drafts stop. To keep the history, set the status to Cancelled instead."
                      confirmLabel="Delete"
                      destructive
                      onConfirm={() => run(() => deleteService({ serviceId: service.id }), "Service deleted")}
                    />
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
