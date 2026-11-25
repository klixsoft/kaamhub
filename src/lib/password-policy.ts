export const PASSWORD_RULES: ReadonlyArray<{ test: RegExp; message: string }> = [
  { test: /^.{10,128}$/, message: "Use between 10 and 128 characters." },
  { test: /[a-z]/, message: "Include a lowercase letter." },
  { test: /[A-Z]/, message: "Include an uppercase letter." },
  { test: /[0-9]/, message: "Include a number." },
]

export function passwordProblem(password: string): string | null {
  return PASSWORD_RULES.find((rule) => !rule.test.test(password))?.message ?? null
}
