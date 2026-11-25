"use client"

import { type ReactElement, type ReactNode, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface FormDialogProps {
  trigger: ReactElement
  title: string
  description?: string
  className?: string
  children: (close: () => void) => ReactNode
}

export function FormDialog({ trigger, title, description, className, children }: FormDialogProps) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className={cn("max-h-[90svh] overflow-y-auto sm:max-w-2xl", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {open ? children(() => setOpen(false)) : null}
      </DialogContent>
    </Dialog>
  )
}
