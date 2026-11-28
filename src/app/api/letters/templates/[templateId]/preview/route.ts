import { NextResponse } from "next/server"
import { todayIso } from "@/lib/dates"
import { customPlaceholderLabel, fillPlaceholders, LETTER_PLACEHOLDERS, placeholdersIn } from "@/lib/letter-placeholders"
import { can, getCurrentUser } from "@/server/auth/session"
import { logger } from "@/server/lib/logger"
import { isUuid } from "@/server/lib/query"
import { renderLetterPdf } from "@/server/modules/letters/pdf"
import { getTemplate } from "@/server/modules/letters/queries"
import { companyValues, currentLayout } from "@/server/modules/letters/values"

export async function GET(_request: Request, context: RouteContext<"/api/letters/templates/[templateId]/preview">) {
  const { templateId } = await context.params
  const user = await getCurrentUser()
  if (!user || !can(user, "letters:manage")) return new NextResponse("Not found", { status: 404 })
  if (!isUuid(templateId)) return new NextResponse("Not found", { status: 404 })

  try {
    const template = await getTemplate(templateId)
    if (!template) return new NextResponse("Not found", { status: 404 })
    const [company, layout] = await Promise.all([companyValues(), currentLayout()])
    const sample = (text: string) => {
      const labels = Object.fromEntries(
        placeholdersIn(text).map((key) => [key, `[${key in LETTER_PLACEHOLDERS ? LETTER_PLACEHOLDERS[key as keyof typeof LETTER_PLACEHOLDERS] : customPlaceholderLabel(key)}]`]),
      )
      return fillPlaceholders(text, { ...labels, ...Object.fromEntries(Object.entries(company).filter(([, value]) => Boolean(value))) })
    }
    const pdf = await renderLetterPdf({ number: "PREVIEW", letterDate: todayIso(), title: sample(template.title), body: sample(template.body), layout, revoked: false })
    return new NextResponse(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="template-preview.pdf"', "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    logger.error("Template preview failed", { error, templateId })
    return new NextResponse("We couldn’t create the preview. Please try again.", { status: 500 })
  }
}
