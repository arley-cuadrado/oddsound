import type { Metadata } from 'next'

import { LOGIN_DESCRIPTION, SITE_NAME } from '@/seo/site'

export { default } from '@/app/(frontend)/creator/login/view'

export const metadata: Metadata = {
  title: `${SITE_NAME} Login`,
  description: LOGIN_DESCRIPTION,
  alternates: {
    canonical: '/creator/login',
  },
  robots: {
    follow: true,
    index: true,
  },
}
