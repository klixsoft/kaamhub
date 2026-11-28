import "server-only"
import { sendMail } from "@/server/services/mailer"
import { getCompanyName } from "@/server/modules/settings/queries"
import { letterFileName, renderLetterPdf } from "./pdf"
import { getLetter } from "./queries"

export async function sendLetterEmail(letterId: string): Promise<void> {
  const letter = await getLetter(letterId)
  if (!letter || letter.revokedAt) return
  const [pdf, companyName] = await Promise.all([renderLetterPdf({ ...letter, revoked: false }), getCompanyName()])
  await sendMail({
    to: letter.recipientEmail,
    subject: `${letter.title} from ${companyName}`,
    text: `Hello ${letter.recipientName},\n\nPlease find your letter "${letter.title}" (${letter.number}) attached. You can also find it any time under My profile → My letters.\n\n${companyName}`,
    attachments: [{ filename: letterFileName(letter), content: pdf, contentType: "application/pdf" }],
  })
}
