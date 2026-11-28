"use client"

import { BanIcon, DownloadIcon, ExternalLinkIcon, MailIcon, MoreHorizontalIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { FormField } from "@/components/forms/form-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { letterPdfUrl } from "@/config/letters"
import { useServerAction } from "@/hooks/use-server-action"
import { emailLetter, revokeLetter } from "@/server/modules/letters/actions"

interface LetterActionsProps {
  letter: { id: string; number: string; revokedAt: Date | null }
  canManage: boolean
}

export function LetterActions({ letter, canManage }: LetterActionsProps) {
  const router = useRouter()
  const { isPending, run } = useServerAction()
  const [revoking, setRevoking] = useState(false)
  const [reason, setReason] = useState("")

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${letter.number}`} disabled={isPending} />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<a href={letterPdfUrl(letter.id)} target="_blank" rel="noopener" />}>
            <ExternalLinkIcon aria-hidden />
            Open PDF
          </DropdownMenuItem>
          <DropdownMenuItem render={<a href={`${letterPdfUrl(letter.id)}?download`} download />}>
            <DownloadIcon aria-hidden />
            Download
          </DropdownMenuItem>
          {canManage && !letter.revokedAt ? (
            <>
              <DropdownMenuItem onClick={() => run(() => emailLetter({ letterId: letter.id }), "Letter emailed")}>
                <MailIcon aria-hidden />
                Email again
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setRevoking(true)}>
                <BanIcon aria-hidden />
                Revoke
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={revoking} onOpenChange={setRevoking}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke {letter.number}?</DialogTitle>
            <DialogDescription>The letter stays on record, marked as revoked, and disappears from the person&apos;s My letters. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <FormField id={`revoke-reason-${letter.id}`} label="Reason" required>
            <Textarea id={`revoke-reason-${letter.id}`} value={reason} onChange={(event) => setReason(event.target.value)} rows={3} />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRevoking(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPending || reason.trim().length < 3}
              onClick={() =>
                run(() => revokeLetter({ letterId: letter.id, reason }), "Letter revoked", () => {
                  setRevoking(false)
                  router.refresh()
                })
              }
            >
              Revoke letter
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
