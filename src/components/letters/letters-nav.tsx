import { FileSignatureIcon, FileTextIcon, SettingsIcon } from "lucide-react"
import { ButtonLink } from "@/components/layout/button-link"

const LINKS = [
  { href: "/letters", label: "Issued", icon: FileSignatureIcon },
  { href: "/letters/templates", label: "Templates", icon: FileTextIcon },
  { href: "/letters/settings", label: "Letterhead", icon: SettingsIcon },
] as const

export function LettersNav({ current }: { current: (typeof LINKS)[number]["href"] }) {
  return (
    <nav aria-label="Letters" className="flex flex-wrap gap-1">
      {LINKS.map((link) => (
        <ButtonLink key={link.href} href={link.href} variant={link.href === current ? "secondary" : "ghost"} size="sm" aria-current={link.href === current ? "page" : undefined}>
          <link.icon aria-hidden />
          {link.label}
        </ButtonLink>
      ))}
    </nav>
  )
}
