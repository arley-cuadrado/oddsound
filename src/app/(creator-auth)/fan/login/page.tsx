import type { Metadata } from 'next'

import { LOGIN_DESCRIPTION, SITE_NAME } from '@/seo/site'

export { default } from '@/app/(frontend)/consumer/login/view'

export const metadata: Metadata = {
  title: `${SITE_NAME} Fan Login`,
  description: LOGIN_DESCRIPTION,
  alternates: {
    canonical: '/fan/login',
  },
  robots: {
    follow: true,
    index: true,
  },
}
