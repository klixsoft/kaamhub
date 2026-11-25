export const MODULES = ["clients", "invoices", "services", "environments", "github"] as const
export type ModuleKey = (typeof MODULES)[number]

export type ModuleState = Record<ModuleKey, boolean>

export const MODULE_INFO: Record<ModuleKey, { label: string; description: string; requires?: ModuleKey }> = {
  clients: { label: "Clients and portal", description: "Client companies, portal access and client-visible tasks." },
  invoices: { label: "Invoices", description: "Invoices with tax lines, payments and PDF delivery.", requires: "clients" },
  services: { label: "Recurring services", description: "Subscriptions, retainers and renewals billed on a schedule.", requires: "invoices" },
  environments: { label: "Websites and environments", description: "Development, staging and production URLs with domain and hosting renewals and uptime checks." },
  github: { label: "GitHub", description: "Link repositories to projects and grant access by project role. For software teams." },
}

export const DEFAULT_MODULES: ModuleState = { clients: true, invoices: true, services: true, environments: true, github: false }

export function effectiveModules(state: ModuleState): ModuleState {
  const clients = state.clients
  const invoices = clients && state.invoices
  return { clients, invoices, services: invoices && state.services, environments: state.environments, github: state.github }
}
