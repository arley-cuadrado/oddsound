import Link from 'next/link'
import React from 'react'

import type { SocialMediaBlock as SocialMediaBlockProps } from '@/payload-types'

type Props = SocialMediaBlockProps & {
  disableInnerContainer?: boolean
}

export const SocialMediaBlock: React.FC<Props> = ({ socialLinks }) => {
  const visibleLinks =
    socialLinks?.filter((item): item is NonNullable<typeof socialLinks>[number] =>
      Boolean(item?.platform?.trim() && item?.url?.trim()),
    ) || []

  if (visibleLinks.length === 0) return null

  return (
    <ul className="flex w-auto grid-cols-1 flex-col items-center justify-center gap-8 border-t pt-10 sm:mt-10 md:flex-row lg:mx-0 lg:max-w-none lg:grid-cols-3">
      {visibleLinks.map((item, index) => (
        <li key={item.id || `${item.platform}-${index}`}>
          <Link
            className="text-sm font-medium capitalize text-[#777] underline underline-offset-4 dark:text-[#858c98]"
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
