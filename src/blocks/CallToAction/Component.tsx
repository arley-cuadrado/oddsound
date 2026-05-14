import React from 'react'

import type { CallToActionBlock as CTABlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { CMSLink } from '@/components/Link'
import { cn } from '@/utilities/ui'

type Props = CTABlockProps & {
  disableInnerContainer?: boolean
}

export const CallToActionBlock: React.FC<Props> = ({ disableInnerContainer, links, richText }) => {
  return (
    <div className={cn({ container: !disableInnerContainer })}>
      <div className="flex flex-col gap-8 bg-[length:400%_400%] bg-[linear-gradient(-45deg,#ee7752,#e73c7e,#23a6d5,#23d5ab)] p-4 [animation:gradient_15s_ease_infinite] md:flex-row md:items-center md:justify-between rounded-lg">
        <div className="max-w-[48rem] flex items-center">
          {richText && (
            <RichText
              className="mb-0 [&_*]:text-white [&_a]:text-white [&_li::marker]:text-white"
              data={richText}
              enableGutter={false}
            />
          )}
        </div>
        <div className="flex flex-col gap-8">
          {(links || []).map(({ link }, i) => {
            return <CMSLink key={i} size="lg" className="border-0 shadow-none" {...link} />
          })}
        </div>
      </div>
    </div>
  )
}
