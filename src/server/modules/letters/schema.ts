import { z } from "zod"

const templateFields = {
  name: z.string().trim().min(2, "Name the template, e.g. Offer letter").max(80),
  title: z.string().trim().min(2, "Enter the heading printed on the letter").max(160),
  body: z.string().trim().min(10, "Write the letter text").max(20000),
}

export const templateSchema = z.object(templateFields)
export const templateUpdateSchema = z.object({ templateId: z.uuid(), ...templateFields })
export const templateIdSchema = z.object({ templateId: z.uuid() })

export const issueLetterSchema = z.object({
  recipientId: z.string().min(1),
  templateId: z.uuid().nullable(),
  title: templateFields.title,
  body: templateFields.body,
  letterDate: z.iso.date("Choose the letter date"),
  sendEmail: z.boolean(),
})

export type IssueLetterInput = z.infer<typeof issueLetterSchema>

export const letterIdSchema = z.object({ letterId: z.uuid() })
export const revokeLetterSchema = z.object({ letterId: z.uuid(), reason: z.string().trim().min(3, "Give a reason").max(500) })

const millimetres = (max: number) => z.coerce.number().min(0, "Use 0 or more").max(max, `Use ${max} mm or less`)

export const letterSettingsFormSchema = z.object({
  topMm: millimetres(150),
  bottomMm: millimetres(150),
  leftMm: millimetres(60),
  rightMm: millimetres(60),
  numberPrefix: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9/-]{0,10}$/, "Use up to 10 letters, numbers, dashes or slashes"),
  signatoryName: z.string().trim().max(120),
  signatoryTitle: z.string().trim().max(120),
})
