import { permanentRedirect } from 'next/navigation'

/** The Payload dashboard is the single creator authentication surface. */
export default function LegacyCreatorLoginPage() {
  permanentRedirect('/dashboard/login')
}
