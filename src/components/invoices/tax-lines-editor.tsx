"use client"

import { PlusIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TAX_KIND_LABELS, TAX_KINDS, type TaxKind } from "@/config/finance"
import type { CalculatedTax } from "@/lib/invoice-math"

export interface TaxLineState {
  key: string
  name: string
  kind: TaxKind
  value: string
}

interface TaxLinesEditorProps {
  lines: TaxLineState[]
  calculated: CalculatedTax[]
  onChange: (lines: TaxLineState[]) => void
  formatAmount: (value: number) => string
  createLine: () => TaxLineState
}

export function TaxLinesEditor({ lines, calculated, onChange, formatAmount, createLine }: TaxLinesEditorProps) {
  const update = (key: string, patch: Partial<TaxLineState>) => onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)))

  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, index) => (
        <div key={line.key} className="grid grid-cols-[1fr_7.5rem_5.5rem_auto] items-center gap-2">
          <Input
            aria-label={`Tax ${index + 1} name`}
            placeholder="Tax name, e.g. VAT"
            value={line.name}
            onChange={(event) => update(line.key, { name: event.target.value })}
          />
          <Select value={line.kind} onValueChange={(value) => update(line.key, { kind: value as TaxKind })}>
            <SelectTrigger aria-label={`Tax ${index + 1} type`} className="w-full">
              <SelectValue>{(value: TaxKind) => (value === "percentage" ? "%" : "Fixed")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TAX_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {TAX_KIND_LABELS[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            aria-label={line.kind === "percentage" ? `Tax ${index + 1} rate in percent` : `Tax ${index + 1} amount`}
            type="number"
            min={0}
            step="any"
            className="text-right"
            placeholder={line.kind === "percentage" ? "0" : "0.00"}
            value={line.value}
            onChange={(event) => update(line.key, { value: event.target.value })}
          />
          <div className="flex items-center gap-1">
            <span className="w-24 text-right tabular-nums">{formatAmount(calculated[index]?.amount ?? 0)}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onChange(lines.filter((item) => item.key !== line.key))}
              aria-label={`Remove tax ${index + 1}`}
            >
              <XIcon />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => onChange([...lines, createLine()])}>
        <PlusIcon aria-hidden />
        Add tax
      </Button>
    </div>
  )
}
