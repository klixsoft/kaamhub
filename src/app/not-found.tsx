import { ButtonLink } from "@/components/layout/button-link"

export default function NotFound() {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">The page you are looking for does not exist or you do not have access to it.</p>
      <ButtonLink href="/" variant="outline">
        Go to home
      </ButtonLink>
    </div>
  )
}
