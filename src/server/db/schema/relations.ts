import { relations } from "drizzle-orm"
import { accounts, sessions, users } from "./auth"
import { clientContacts, clients } from "./clients"
import { githubAccessGrants, githubRepositories, projectRepositories } from "./github"
import { departments, designations, memberProfiles } from "./people"
import { invoiceItems, invoicePayments, invoices, invoiceTaxes, managedServices } from "./finance"
import { boardColumns, projectEnvironments, projectMembers, projects, taskAssignees, tasks } from "./projects"

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(memberProfiles, { fields: [users.id], references: [memberProfiles.userId], relationName: "profile_user" }),
  sessions: many(sessions),
  accounts: many(accounts),
  projectMemberships: many(projectMembers),
  clientContacts: many(clientContacts),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}))

export const memberProfilesRelations = relations(memberProfiles, ({ one }) => ({
  user: one(users, { fields: [memberProfiles.userId], references: [users.id], relationName: "profile_user" }),
  department: one(departments, { fields: [memberProfiles.departmentId], references: [departments.id] }),
  designation: one(designations, { fields: [memberProfiles.designationId], references: [designations.id] }),
  manager: one(users, { fields: [memberProfiles.managerId], references: [users.id], relationName: "profile_manager" }),
}))

export const clientsRelations = relations(clients, ({ many }) => ({
  contacts: many(clientContacts),
  projects: many(projects),
}))

export const clientContactsRelations = relations(clientContacts, ({ one }) => ({
  client: one(clients, { fields: [clientContacts.clientId], references: [clients.id] }),
  user: one(users, { fields: [clientContacts.userId], references: [users.id] }),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  members: many(projectMembers),
  columns: many(boardColumns),
  tasks: many(tasks),
  repositories: many(projectRepositories),
  services: many(managedServices),
  environments: many(projectEnvironments),
}))

export const projectEnvironmentsRelations = relations(projectEnvironments, ({ one }) => ({
  project: one(projects, { fields: [projectEnvironments.projectId], references: [projects.id] }),
}))

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}))

export const boardColumnsRelations = relations(boardColumns, ({ one, many }) => ({
  project: one(projects, { fields: [boardColumns.projectId], references: [projects.id] }),
  tasks: many(tasks),
}))

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  column: one(boardColumns, { fields: [tasks.columnId], references: [boardColumns.id] }),
  assignees: many(taskAssignees),
}))

export const taskAssigneesRelations = relations(taskAssignees, ({ one }) => ({
  task: one(tasks, { fields: [taskAssignees.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskAssignees.userId], references: [users.id] }),
}))

export const githubRepositoriesRelations = relations(githubRepositories, ({ many }) => ({
  projects: many(projectRepositories),
  grants: many(githubAccessGrants),
}))

export const projectRepositoriesRelations = relations(projectRepositories, ({ one }) => ({
  project: one(projects, { fields: [projectRepositories.projectId], references: [projects.id] }),
  repository: one(githubRepositories, {
    fields: [projectRepositories.repositoryId],
    references: [githubRepositories.id],
  }),
}))

export const githubAccessGrantsRelations = relations(githubAccessGrants, ({ one }) => ({
  user: one(users, { fields: [githubAccessGrants.userId], references: [users.id] }),
  repository: one(githubRepositories, {
    fields: [githubAccessGrants.repositoryId],
    references: [githubRepositories.id],
  }),
}))

export const managedServicesRelations = relations(managedServices, ({ one }) => ({
  project: one(projects, { fields: [managedServices.projectId], references: [projects.id] }),
}))

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
  service: one(managedServices, { fields: [invoices.serviceId], references: [managedServices.id] }),
  items: many(invoiceItems),
  taxes: many(invoiceTaxes),
  payments: many(invoicePayments),
}))

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}))

export const invoicePaymentsRelations = relations(invoicePayments, ({ one }) => ({
  invoice: one(invoices, { fields: [invoicePayments.invoiceId], references: [invoices.id] }),
}))

export const invoiceTaxesRelations = relations(invoiceTaxes, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceTaxes.invoiceId], references: [invoices.id] }),
}))
