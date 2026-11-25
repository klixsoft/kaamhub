"use client"

import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { Button } from "@/components/ui/button"
import type { UserStatus } from "@/config/domain"
import { useServerAction } from "@/hooks/use-server-action"
import { resendInvitation, setMemberStatus } from "@/server/modules/people/actions"

export function MemberStatusActions({ userId, name, status }: { userId: string; name: string; status: UserStatus }) {
  const { isPending, run } = useServerAction()
  const isActive = status === "active"

  return (
    <div className="flex flex-wrap gap-2">
      {isActive ? (
        <Button variant="outline" disabled={isPending} onClick={() => run(() => resendInvitation({ userId }), "Password setup email sent")}>
          Send password link
        </Button>
      ) : null}
      <ConfirmDialog
        trigger={
          <Button variant={isActive ? "destructive" : "outline"} disabled={isPending}>
            {isActive ? "Deactivate" : "Reactivate"}
          </Button>
        }
        title={isActive ? `Deactivate ${name}?` : `Reactivate ${name}?`}
        description={
          isActive
            ? "They will be signed out immediately and their GitHub repository access will be removed."
            : "They will be able to sign in again and regain GitHub access for their assigned projects."
        }
        confirmLabel={isActive ? "Deactivate" : "Reactivate"}
        destructive={isActive}
        onConfirm={() =>
          run(
            () => setMemberStatus({ userId, status: isActive ? "inactive" : "active" }),
            isActive ? `${name} has been deactivated` : `${name} can sign in again`,
          )
        }
      />
    </div>
  )
}
