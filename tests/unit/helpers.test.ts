import { describe, expect, it } from "vitest"
import { roleHasPermission, isAssignableRole } from "@/config/roles"
import { parseListParams } from "@/lib/list-params"
import { passwordProblem } from "@/lib/password-policy"
import { safeRedirectPath } from "@/lib/safe-redirect"
import { compareVersions, isSemver } from "@/lib/semver"
import { describeDevice } from "@/lib/user-agent"

describe("safe redirects", () => {
  it("keeps paths on this site", () => {
    expect(safeRedirectPath("/projects?status=active")).toBe("/projects?status=active")
  })

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null])("rejects %s", (value) => {
    expect(safeRedirectPath(value, "/dashboard")).toBe("/dashboard")
  })
})

describe("password policy", () => {
  it("requires length, both cases and a number", () => {
    expect(passwordProblem("short1A")).toMatch(/10 and 128/)
    expect(passwordProblem("alllowercase1")).toMatch(/uppercase/)
    expect(passwordProblem("ALLUPPERCASE1")).toMatch(/lowercase/)
    expect(passwordProblem("NoNumbersHere")).toMatch(/number/)
    expect(passwordProblem("Valid-Pass-2027")).toBeNull()
  })
})

describe("list parameters", () => {
  const config = { filters: ["status"] as const, sorts: ["name"] as const, defaultSort: { id: "name" as const, desc: false } }

  it("only accepts whitelisted sorts and page sizes", () => {
    const params = parseListParams({ sort: "password.desc", perPage: "5000", page: "-3", status: "active,active,paused" }, config)
    expect(params.sort).toEqual({ id: "name", desc: false })
    expect(params.perPage).toBe(20)
    expect(params.page).toBe(1)
    expect(params.filters.status).toEqual(["active", "paused"])
  })
})

describe("versions", () => {
  it("compares semantic versions, with pre-releases before releases", () => {
    expect(isSemver("v0.2.0")).toBe(true)
    expect(isSemver("latest")).toBe(false)
    expect(compareVersions("0.10.0", "0.9.9")).toBe(1)
    expect(compareVersions("1.0.0-beta.1", "1.0.0")).toBe(-1)
    expect(compareVersions("v1.2.3", "1.2.3")).toBe(0)
  })
})

describe("roles", () => {
  it("keeps system updates and super admin creation with super admins", () => {
    expect(roleHasPermission("super_admin", "system:update")).toBe(true)
    expect(roleHasPermission("admin", "system:update")).toBe(false)
    expect(roleHasPermission("client", "dashboard:view")).toBe(false)
    expect(isAssignableRole("admin", "super_admin")).toBe(false)
  })
})

describe("device names", () => {
  it("describes common browsers", () => {
    expect(describeDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15")).toEqual({ label: "Safari on macOS", mobile: false })
    expect(describeDevice("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36")).toEqual({ label: "Chrome on Android", mobile: true })
    expect(describeDevice(null).label).toBe("Unknown device")
  })
})
