export const POSITION_STEP = 1024
export const MIN_POSITION_GAP = 1e-6

export function positionBetween(before: number | null, after: number | null): number {
  if (before !== null && after !== null) return (before + after) / 2
  if (before !== null) return before + POSITION_STEP
  if (after !== null) return after - POSITION_STEP
  return POSITION_STEP
}

export function needsRebalance(before: number | null, after: number | null): boolean {
  return before !== null && after !== null && Math.abs(after - before) < MIN_POSITION_GAP
}
