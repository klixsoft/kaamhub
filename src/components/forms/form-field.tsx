import type { ReactNode } from "react"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"

interface FormFieldProps {
  id: string
  label: string
  required?: boolean
  description?: string
  errors?: string[]
  className?: string
  children: ReactNode
}

export function FormField({ id, label, required, description, errors, className, children }: FormFieldProps) {
  const hasError = Boolean(errors && errors.length > 0)
  return (
    <Field data-invalid={hasError || undefined} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : (
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        )}
      </FieldLabel>
      {children}
      {description && !hasError ? <FieldDescription>{description}</FieldDescription> : null}
      {hasError ? <FieldError id={`${id}-error`}>{errors?.[0]}</FieldError> : null}
    </Field>
  )
}
