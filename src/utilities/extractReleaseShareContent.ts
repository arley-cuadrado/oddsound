import type { Page } from '@/payload-types'

import { extractLexicalPlainText } from './extractLexicalPlainText'

export function extractReleaseShareContent(page: Pick<Page, 'hero' | 'layout'>): string {
  const textParts: string[] = []

  const heroText = extractLexicalPlainText(page.hero?.richText)

  if (heroText) {
    textParts.push(heroText)
  }

  if (Array.isArray(page.layout)) {
    for (const block of page.layout) {
      if (!block || typeof block !== 'object') continue

      if (block.blockType === 'content' && Array.isArray(block.columns)) {
        for (const column of block.columns) {
          const text = extractLexicalPlainText(column?.richText)

          if (text) textParts.push(text)
        }
      }

      if (block.blockType === 'cta') {
        const text = extractLexicalPlainText(block.richText)

        if (text) textParts.push(text)
      }
    }
  }

  return textParts.join('\n').trim()
}
