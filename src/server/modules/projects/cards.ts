import "server-only"
import { asc, eq, max, sql } from "drizzle-orm"
import type { Transaction } from "@/server/db"
import { boardColumns, projects, tasks } from "@/server/db/schema"
import { AppError } from "@/server/lib/errors"
import { POSITION_STEP } from "./positions"

type CardValues = Omit<typeof tasks.$inferInsert, "id" | "number" | "position" | "createdAt" | "updatedAt">

/*
 * Every new card takes the project's next number and goes to the bottom of
 * its column; staff cards and client requests share this so numbering stays
 * gap-free and race-safe.
 */
export async function insertCard(tx: Transaction, values: CardValues): Promise<{ id: string; number: number }> {
  const [sequence] = await tx
    .update(projects)
    .set({ taskSequence: sql`${projects.taskSequence} + 1` })
    .where(eq(projects.id, values.projectId))
    .returning({ value: projects.taskSequence })
  const [last] = await tx.select({ value: max(tasks.position) }).from(tasks).where(eq(tasks.columnId, values.columnId))
  const [card] = await tx
    .insert(tasks)
    .values({ ...values, number: sequence?.value ?? 1, position: (last?.value ?? 0) + POSITION_STEP })
    .returning({ id: tasks.id, number: tasks.number })
  if (!card) throw new Error("Task insert returned no row")
  return card
}

export async function firstColumn(tx: Transaction, projectId: string): Promise<string> {
  const [column] = await tx.select({ id: boardColumns.id }).from(boardColumns).where(eq(boardColumns.projectId, projectId)).orderBy(asc(boardColumns.position)).limit(1)
  if (!column) throw new AppError("This project has no board columns yet.")
  return column.id
}
