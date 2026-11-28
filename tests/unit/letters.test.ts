import { describe, expect, it } from "vitest"
import { parseLetter } from "@/lib/letter-format"
import { customPlaceholderLabel, customPlaceholders, fillPlaceholders, placeholdersIn } from "@/lib/letter-placeholders"

describe("letter placeholders", () => {
  const text = "Dear {{recipient.name}}, your salary is {{ salary }} from {{START_DATE}}. Ref {{letter.number}}"

  it("finds every placeholder once, ignoring spaces and case", () => {
    expect(placeholdersIn(`${text} {{salary}}`)).toEqual(["recipient.name", "salary", "start_date", "letter.number"])
  })

  it("separates custom placeholders from built-in ones", () => {
    expect(customPlaceholders(text)).toEqual(["salary", "start_date"])
    expect(customPlaceholderLabel("probation_period")).toBe("Probation period")
  })

  it("fills known values and leaves the rest for later", () => {
    expect(fillPlaceholders(text, { "recipient.name": "Sita Gurung", salary: "NPR 90,000", start_date: "" })).toBe(
      "Dear Sita Gurung, your salary is NPR 90,000 from {{START_DATE}}. Ref {{letter.number}}",
    )
  })
})

describe("letter format", () => {
  it("turns plain text into paragraphs, headings, bullets and bold runs", () => {
    const blocks = parseLetter("Dear Sita,\nWelcome aboard.\n\n# Terms\n- Salary: **NPR 90,000**\n- Start: Monday\n\nRegards")
    expect(blocks.map((block) => block.kind)).toEqual(["paragraph", "heading", "bullet", "bullet", "paragraph"])
    expect(blocks[0]?.lines).toHaveLength(2)
    expect(blocks[2]?.lines[0]).toEqual([
      { text: "Salary: ", bold: false },
      { text: "NPR 90,000", bold: true },
    ])
  })

  it("ignores extra blank lines and Windows line endings", () => {
    expect(parseLetter("One\r\n\r\n\r\n\r\nTwo").map((block) => block.kind)).toEqual(["paragraph", "paragraph"])
  })
})
