import { redirect } from "next/navigation"
import { Suspense } from "react"
import { homePathFor } from "@/config/navigation"
import { requireUser } from "@/server/auth/session"

async function RedirectHome(): Promise<null> {
  const user = await requireUser()
  redirect(homePathFor(user.role))
}

export default function RootPage() {
  return (
    <Suspense fallback={null}>
      <RedirectHome />
    </Suspense>
  )
}
