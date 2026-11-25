"use client"

import { CheckIcon, PlusCircleIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import type { Facet } from "@/lib/list-params"
import { cn } from "@/lib/utils"

interface FacetFilterProps {
  facet: Facet
  selected: string[]
  onChange: (values: string[]) => void
}

const SEARCHABLE_THRESHOLD = 7

export function FacetFilter({ facet, selected, onChange }: FacetFilterProps) {
  const selectedSet = new Set(selected)

  function toggle(value: string) {
    const next = new Set(selectedSet)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange([...next])
  }

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="h-8 border-dashed" />}>
        <PlusCircleIcon aria-hidden />
        {facet.title}
        {selected.length > 0 ? (
          <>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <Badge variant="secondary" className="lg:hidden">
              {selected.length}
            </Badge>
            <span className="hidden gap-1 lg:flex">
              {selected.length > 2 ? (
                <Badge variant="secondary">{selected.length} selected</Badge>
              ) : (
                facet.options
                  .filter((option) => selectedSet.has(option.value))
                  .map((option) => (
                    <Badge key={option.value} variant="secondary">
                      {option.label}
                    </Badge>
                  ))
              )}
            </span>
          </>
        ) : null}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          {facet.options.length >= SEARCHABLE_THRESHOLD ? <CommandInput placeholder={facet.title} /> : null}
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {facet.options.map((option) => {
                const isSelected = selectedSet.has(option.value)
                return (
                  <CommandItem key={option.value} value={option.label} onSelect={() => toggle(option.value)}>
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-4 items-center justify-center rounded-sm border border-primary",
                        isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <CheckIcon className="size-3" />
                    </span>
                    <span className="flex-1 truncate">{option.label}</span>
                    {option.count !== undefined ? (
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">{option.count}</span>
                    ) : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selected.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange([])} className="justify-center text-center">
                    Clear filter
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
