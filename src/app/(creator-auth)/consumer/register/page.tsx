import { redirect } from 'next/navigation'

export default function LegacyConsumerRegisterRedirect() {
  redirect('/fan/login')
}
