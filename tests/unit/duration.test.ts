import { describe, expect, it } from "vitest"
import { formatMinutes, minutesToHours, parseDuration } from "@/lib/duration"

describe("durations", () => {
  it.each([
    ["1.5", 90],
    ["1,5", 90],
    ["2", 120],
    ["1h 30m", 90],
    ["1h30", 90],
    ["1h", 60],
    ["45m", 45],
    ["45 min", 45],
    ["2 hours", 120],
    ["1:30", 90],
    ["0:15", 15],
  ])("reads %s as %i minutes", (input, minutes) => {
    expect(parseDuration(input)).toBe(minutes)
  })

  it.each(["", "abc", "0", "-1", "25", "1:75", "h", "1.5.2"])("rejects %j", (input) => {
    expect(parseDuration(input)).toBeNull()
  })

  it("formats minutes for people and for exports", () => {
    expect(formatMinutes(90)).toBe("1h 30m")
    expect(formatMinutes(120)).toBe("2h")
    expect(formatMinutes(15)).toBe("15m")
    expect(minutesToHours(90)).toBe("1.50")
  })
})
