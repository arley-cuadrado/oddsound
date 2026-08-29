import { describe, expect, it } from 'vitest'

import { getCommentsListEmptyStateMode } from '@/components/CommentsListEmptyStateGuard'

describe('comments list empty state guard', () => {
  it('uses the default empty state on the comments list when there is no search term', () => {
    expect(
      getCommentsListEmptyStateMode(
        '/dashboard/collections/comments',
        new URLSearchParams(),
      ),
    ).toBe('default-empty')
  })

  it('uses the search empty state on the comments list when a search term exists', () => {
    expect(
      getCommentsListEmptyStateMode(
        '/dashboard/collections/comments',
        new URLSearchParams('search=rock'),
      ),
    ).toBe('search-empty')
  })

  it('does not affect other collection lists', () => {
    expect(
      getCommentsListEmptyStateMode(
        '/dashboard/collections/posts',
        new URLSearchParams(),
      ),
    ).toBe('ignore')
  })
})
