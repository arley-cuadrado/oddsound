import type { Metadata } from 'next'

import { REGISTER_DESCRIPTION, SITE_NAME } from '@/seo/site'

export { default } from '@/app/(frontend)/creator/register/view'

export const metadata: Metadata = {
  title: `${SITE_NAME} Register`,
  description: REGISTER_DESCRIPTION,
  alternates: {
    canonical: '/creator/register',
  },
  robots: {
    follow: true,
    index: true,
  },
}
