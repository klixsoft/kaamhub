import { z } from "zod"
import { ENGAGEMENT_TYPES } from "@/config/domain"
import { SYSTEM_ROLES } from "@/config/roles"
import { passwordProblem } from "@/lib/password-policy"

export const passwordSchema = z.string().superRefine((value, context) => {
  const problem = passwordProblem(value)
  if (problem) context.addIssue({ code: "custom", message: problem })
})

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullish()

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .pipe(z.iso.date("Enter a valid date").nullable())
  .nullish()

const optionalId = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .pipe(z.uuid().nullable())
  .nullish()

export const memberSchema = z
  .object({
    name: z.string().trim().min(2, "Enter the full name").max(120),
    email: z.email("Enter a valid email address").max(254),
    role: z.enum(SYSTEM_ROLES).exclude(["client"]),
    engagementType: z.enum(ENGAGEMENT_TYPES),
    employeeCode: optionalText(40),
    phone: optionalText(40),
    departmentId: optionalId,
    designationId: optionalId,
    managerId: optionalText(64),
    joinedOn: optionalDate,
    engagementEndsOn: optionalDate,
    accessExpiresOn: optionalDate,
  })
  .superRefine((value, context) => {
    if (value.joinedOn && value.engagementEndsOn && value.engagementEndsOn < value.joinedOn) {
      context.addIssue({ code: "custom", path: ["engagementEndsOn"], message: "End date must be after the joining date" })
    }
    if (value.role === "freelancer" && value.engagementType !== "freelancer") {
      context.addIssue({ code: "custom", path: ["engagementType"], message: "Freelancers must use the Freelancer engagement type" })
    }
  })

export type MemberInput = z.infer<typeof memberSchema>

export const memberStatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["active", "inactive"]),
})
