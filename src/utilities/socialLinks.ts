type SocialLink = {
  id?: number | string
  platform?: null | string
  url?: null | string
}

type LayoutBlock = {
  blockType?: null | string
  socialLinks?: null | SocialLink[]
}

function normalizeSocialLink(link: SocialLink) {
  const platform = link.platform?.trim()
  const url = link.url?.trim()

  if (!platform || !url) {
    return null
  }

  return {
    ...link,
    platform,
    url,
  }
}

export function extractLegacySocialLinks(layout?: LayoutBlock[] | null) {
  if (!Array.isArray(layout) || layout.length === 0) {
    return []
  }

  const deduped = new Map<string, ReturnType<typeof normalizeSocialLink>>()

  for (const block of layout) {
    if (block?.blockType !== 'socialMediaBlock' || !Array.isArray(block.socialLinks)) {
      continue
    }

    for (const item of block.socialLinks) {
      const normalized = normalizeSocialLink(item || {})

      if (!normalized) {
        continue
      }

      deduped.set(`${normalized.platform.toLowerCase()}::${normalized.url.toLowerCase()}`, normalized)
    }
  }

  return Array.from(deduped.values()).filter((item): item is NonNullable<typeof item> => Boolean(item))
}

export function normalizeSocialLinksWithLegacy<T extends { layout?: LayoutBlock[] | null; socialLinks?: null | SocialLink[] }>(
  doc: T,
) {
  if (!doc || typeof doc !== 'object') {
    return doc
  }

  const currentSocialLinks =
    Array.isArray(doc.socialLinks) && doc.socialLinks.length > 0
      ? doc.socialLinks
          .map((item) => normalizeSocialLink(item || {}))
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
      : []

  if (currentSocialLinks.length > 0) {
    return {
      ...doc,
      socialLinks: currentSocialLinks,
    }
  }

  const legacySocialLinks = extractLegacySocialLinks(doc.layout)

  if (legacySocialLinks.length === 0) {
    return doc
  }

  return {
    ...doc,
    socialLinks: legacySocialLinks,
  }
}
