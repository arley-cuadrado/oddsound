import { redirect } from 'next/navigation'

export default function LegacyConsumerLoginRedirect() {
  redirect('/fan/login')
}
