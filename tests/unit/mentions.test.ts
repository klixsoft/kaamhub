import { describe, expect, it } from "vitest"
import { mentionedIn, mentionToken } from "@/lib/mentions"

const people = [
  { id: "sita", name: "Sita Gurung" },
  { id: "sita-rai", name: "Sita Rai" },
  { id: "bikash", name: "Bikash Tamang" },
  { id: "asha", name: "Asha" },
]

describe("mentions", () => {
  it("finds people mentioned by full name, ignoring case", () => {
    expect(mentionedIn("Thanks @sita gurung and @Bikash Tamang!", people).sort()).toEqual(["bikash", "sita"])
  })

  it("does not match partial words or names without the @", () => {
    expect(mentionedIn("Bikash Tamang and @Ashaa reviewed it; email asha@example.com", people)).toEqual([])
  })

  it("prefers the longest name so similar names are told apart", () => {
    expect(mentionedIn("Over to @Sita Rai", people)).toEqual(["sita-rai"])
  })

  it("writes the mention token the comment box inserts", () => {
    expect(mentionToken("Bikash Tamang")).toBe("@Bikash Tamang")
  })
})
