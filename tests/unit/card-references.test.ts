import { describe, expect, it } from "vitest"
import { findCardReferences } from "@/lib/card-references"

describe("findCardReferences", () => {
  it("finds references in any case and removes duplicates", () => {
    expect(findCardReferences("Fix login (BRF-4)", "brf-4: tidy up; closes OPS-12")).toEqual([
      { code: "BRF", number: 4 },
      { code: "OPS", number: 12 },
    ])
  })

  it("keeps dashes that belong to the project code", () => {
    expect(findCardReferences("ACME-WEB-7 add footer")).toEqual([{ code: "ACME-WEB", number: 7 }])
  })

  it("ignores text that only looks like a reference", () => {
    expect(findCardReferences("x-2", "BRF-0", "abcBRF-4x", "release 2026-11-28", null)).toEqual([])
  })
})
