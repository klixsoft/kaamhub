"use client"

import { format, isValid, parseISO } from "date-fns"
import { CalendarIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  id?: string
  name?: string
  defaultValue?: string | null
  value?: string | null
  onChange?: (value: string | null) => void
  placeholder?: string
  required?: boolean
  invalid?: boolean
  disabled?: boolean
  className?: string
}

const ISO_DATE = "yyyy-MM-dd"

function parse(value: string | null | undefined): Date | undefined {
  if (!value) return undefined
  const date = parseISO(value)
  return isValid(date) ? date : undefined
}

export function DatePicker({
  id,
  name,
  defaultValue,
  value,
  onChange,
  placeholder = "Pick a date",
  required,
  invalid,
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [internal, setInternal] = useState<string | null>(defaultValue ?? null)
  const current = value !== undefined ? value : internal
  const selected = parse(current)

  function update(next: string | null) {
    setInternal(next)
    onChange?.(next)
  }

  return (
    <div className={cn("relative flex w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              aria-invalid={invalid || undefined}
              className={cn("w-full justify-start font-normal", !selected && "text-muted-foreground")}
            />
          }
        >
          <CalendarIcon aria-hidden />
          {selected ? format(selected, "d MMM yyyy") : placeholder}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            captionLayout="dropdown"
            onSelect={(date) => {
              update(date ? format(date, ISO_DATE) : null)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
      {selected && !required && !disabled ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute top-1/2 right-1.5 -translate-y-1/2"
          onClick={() => update(null)}
          aria-label="Clear date"
        >
          <XIcon />
        </Button>
      ) : null}
      {name ? <input type="hidden" name={name} value={current ?? ""} /> : null}
    </div>
  )
}
