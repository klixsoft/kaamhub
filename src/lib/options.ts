export interface Option {
  value: string
  label: string
  description?: string
}

export const OPTION_RESOURCES = ["people", "clients", "departments", "designations", "repositories", "project-members"] as const
export type OptionResource = (typeof OPTION_RESOURCES)[number]

export type OptionParams = Partial<Record<"projectId", string>>

export function toOptions<TValue extends string>(labels: Record<TValue, string>): Option[] {
  return (Object.entries(labels) as Array<[TValue, string]>).map(([value, label]) => ({ value, label }))
}
