"use client"

import { useMemo, useState } from "react"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import { useAsyncOptions } from "@/hooks/use-async-options"
import type { Option, OptionParams, OptionResource } from "@/lib/options"

interface SharedProps {
  id?: string
  name?: string
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  className?: string
  options?: Option[]
  resource?: OptionResource
  resourceParams?: OptionParams
}

interface SingleProps extends SharedProps {
  multiple?: false
  value?: Option | null
  defaultValue?: Option | null
  onChange?: (value: Option | null) => void
}

interface MultipleProps extends SharedProps {
  multiple: true
  value?: Option[]
  defaultValue?: Option[]
  onChange?: (value: Option[]) => void
}

export type OptionComboboxProps = SingleProps | MultipleProps

const optionLabel = (option: Option) => option.label
const optionValue = (option: Option) => option.value
const sameOption = (a: Option, b: Option) => a.value === b.value

function mergeOptions(primary: Option[], selected: Option[]): Option[] {
  const seen = new Set(primary.map((option) => option.value))
  return [...primary, ...selected.filter((option) => !seen.has(option.value))]
}

function useOptionSource(props: OptionComboboxProps, selected: Option[]) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const remote = useAsyncOptions(props.resource, props.resourceParams, query, open)
  const isRemote = Boolean(props.resource)
  const items = useMemo(
    () => mergeOptions(isRemote ? remote.options : (props.options ?? []), selected),
    [isRemote, remote.options, props.options, selected],
  )
  const emptyText = remote.error
    ? "Could not load options."
    : remote.isLoading
      ? "Searching…"
      : (props.emptyText ?? "No results found.")

  return { items, query, setQuery, open, setOpen, isRemote, emptyText }
}

function OptionList({ emptyText }: { emptyText: string }) {
  return (
    <>
      <ComboboxEmpty>{emptyText}</ComboboxEmpty>
      <ComboboxList>
        {(option: Option) => (
          <ComboboxItem key={option.value} value={option}>
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{option.label}</span>
              {option.description ? <span className="truncate text-xs text-muted-foreground">{option.description}</span> : null}
            </span>
          </ComboboxItem>
        )}
      </ComboboxList>
    </>
  )
}

function SingleCombobox(props: SingleProps) {
  const [internal, setInternal] = useState<Option | null>(props.defaultValue ?? null)
  const value = props.value !== undefined ? props.value : internal
  const selected = useMemo(() => (value ? [value] : []), [value])
  const source = useOptionSource(props, selected)

  return (
    <>
      <Combobox<Option>
        items={source.items}
        value={value}
        onValueChange={(next) => {
          setInternal(next)
          props.onChange?.(next)
        }}
        itemToStringLabel={optionLabel}
        itemToStringValue={optionValue}
        isItemEqualToValue={sameOption}
        filter={source.isRemote ? null : undefined}
        onInputValueChange={source.setQuery}
        onOpenChange={source.setOpen}
        disabled={props.disabled}
      >
        <ComboboxInput
          id={props.id}
          placeholder={props.placeholder}
          aria-invalid={props.invalid || undefined}
          className={props.className ?? "w-full"}
          showClear={!props.required && Boolean(value)}
          required={props.required}
          disabled={props.disabled}
        />
        <ComboboxContent>
          <OptionList emptyText={source.emptyText} />
        </ComboboxContent>
      </Combobox>
      {props.name ? <input type="hidden" name={props.name} value={value?.value ?? ""} /> : null}
    </>
  )
}

function MultipleCombobox(props: MultipleProps) {
  const anchor = useComboboxAnchor()
  const [internal, setInternal] = useState<Option[]>(props.defaultValue ?? [])
  const value = props.value ?? internal
  const source = useOptionSource(props, value)

  return (
    <>
      <Combobox<Option, true>
        multiple
        items={source.items}
        value={value}
        onValueChange={(next) => {
          setInternal(next)
          props.onChange?.(next)
        }}
        itemToStringLabel={optionLabel}
        itemToStringValue={optionValue}
        isItemEqualToValue={sameOption}
        filter={source.isRemote ? null : undefined}
        onInputValueChange={source.setQuery}
        onOpenChange={source.setOpen}
        disabled={props.disabled}
      >
        <ComboboxChips ref={anchor} className={props.className ?? "w-full"} aria-invalid={props.invalid || undefined}>
          <ComboboxValue>
            {(selected: Option[]) =>
              selected.map((option) => <ComboboxChip key={option.value}>{option.label}</ComboboxChip>)
            }
          </ComboboxValue>
          <ComboboxChipsInput id={props.id} placeholder={value.length === 0 ? props.placeholder : undefined} />
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <OptionList emptyText={source.emptyText} />
        </ComboboxContent>
      </Combobox>
      {props.name
        ? value.map((option) => <input key={option.value} type="hidden" name={`${props.name}[]`} value={option.value} />)
        : null}
    </>
  )
}

export function OptionCombobox(props: OptionComboboxProps) {
  return props.multiple ? <MultipleCombobox {...props} /> : <SingleCombobox {...props} />
}
