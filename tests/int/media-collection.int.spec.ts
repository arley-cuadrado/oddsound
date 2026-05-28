import { describe, expect, it } from 'vitest'

import { rewriteLegacyMediaURL } from '@/collections/Media'

describe('rewriteLegacyMediaURL', () => {
  it('keeps non-legacy urls unchanged', () => {
    expect(rewriteLegacyMediaURL('https://cdn.oddsound.co/media/cover.jpg')).toBe(
      'https://cdn.oddsound.co/media/cover.jpg',
    )
  })

  it('rewrites legacy local media api urls to the local media path', () => {
    expect(rewriteLegacyMediaURL('https://oddsound.co/api/media/file/0429fleetfoxes-1-300x200.jpg')).toBe(
      '/media/0429fleetfoxes-1-300x200.jpg',
    )
  })

  it('preserves legacy blob-backed urls when the file is not in public/media', () => {
    expect(
      rewriteLegacyMediaURL(
        'https://oddsound.co/api/media/file/not-a-local-file-123456789.jpg?token=test',
      ),
    ).toBe('/api/media/file/not-a-local-file-123456789.jpg?token=test')
  })
})
