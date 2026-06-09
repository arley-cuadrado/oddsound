import React, { Fragment } from 'react'

import type { Page } from '@/payload-types'

import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { EventsBlock } from '@/blocks/Events/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { SocialMediaBlock } from '@/blocks/SocialMediaBlock/Component'
import { SpotifyBlock } from '@/blocks/SpotifyBlock/Component'
import { VideoBlock } from '@/blocks/VideoBlock/Component'

const blockComponents = {
  archive: ArchiveBlock,
  content: ContentBlock,
  cta: CallToActionBlock,
  events: EventsBlock,
  formBlock: FormBlock,
  mediaBlock: MediaBlock,
  socialMediaBlock: SocialMediaBlock,
  spotifyBlock: SpotifyBlock,
  videoBlock: VideoBlock,
}

export const RenderBlocks: React.FC<{
  blocks: Page['layout'][0][]
  disableInnerContainer?: boolean
  linkClassName?: string
}> = (props) => {
  const { blocks, disableInnerContainer = false, linkClassName } = props

  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  if (hasBlocks) {
    return (
      <Fragment>
        {blocks.map((block, index) => {
          const { blockType } = block

          if (blockType && blockType in blockComponents) {
            const Block = blockComponents[blockType] as React.ComponentType<any>

            if (Block) {
              return (
                <div className="my-8" key={index}>
                  <Block
                    {...block}
                    disableInnerContainer={disableInnerContainer}
                    linkClassName={linkClassName}
                  />
                </div>
              )
            }
          }
          return null
        })}
      </Fragment>
    )
  }

  return null
}
