import { ButtonLink } from "@/components/layout/button-link"

export default function Forbidden() {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">403</p>
      <h1 className="text-xl font-semibold">You do not have access to this page</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Ask an administrator if you think you should have access.</p>
      <ButtonLink href="/" variant="outline">
        Go to home
      </ButtonLink>
    </div>
  )
}
