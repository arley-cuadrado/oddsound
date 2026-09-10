import Link from 'next/link'
import React from 'react'

import type { Biography, SocialMediaBlock as SocialMediaBlockProps } from '@/payload-types'

type SocialLinkItem = NonNullable<
  NonNullable<Biography['socialLinks'] | SocialMediaBlockProps['socialLinks']>
>[number]

type Props = {
  disableInnerContainer?: boolean
  socialLinks?: null | SocialLinkItem[]
}

export const SocialMediaBlock: React.FC<Props> = ({ socialLinks }) => {
  const visibleLinks =
    socialLinks?.filter((item): item is NonNullable<typeof socialLinks>[number] =>
      Boolean(item?.platform?.trim() && item?.url?.trim()),
    ) || []

  if (visibleLinks.length === 0) return null

  return (
    <ul className="flex w-auto flex-wrap items-center justify-center gap-8 border-t pt-4 sm:mt-10 lg:mx-0 lg:max-w-none">
      {visibleLinks.map((item, index) => (
        <li key={item.id || `${item.platform}-${index}`}>
          <Link
            className="text-[13px] font-medium capitalize text-[#777] underline underline-offset-4 dark:text-[#858c98]"
            href={item.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            {item.platform}
          </Link>
        </li>
      ))}
    </ul>
  )
}
