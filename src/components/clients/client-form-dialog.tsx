"use client"

import { PencilIcon, PlusIcon } from "lucide-react"
import { FormDialog } from "@/components/forms/form-dialog"
import { Button } from "@/components/ui/button"
import type { ClientInput } from "@/server/modules/clients/schema"
import { ClientForm } from "./client-form"

export function ClientFormDialog({ client }: { client?: ClientInput & { id: string } }) {
  return (
    <FormDialog
      title={client ? "Edit client" : "Add client"}
      trigger={
        <Button variant={client ? "outline" : "default"}>
          {client ? <PencilIcon aria-hidden /> : <PlusIcon aria-hidden />}
          {client ? "Edit" : "Add client"}
        </Button>
      }
    >
      {(close) => <ClientForm defaults={client} onSaved={close} />}
    </FormDialog>
  )
}
