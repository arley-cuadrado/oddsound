import { describe, expect, it } from 'vitest'

import { shouldHideCommentsEmptyState } from '@/components/CommentsListEmptyStateGuard'

describe('comments list empty state guard', () => {
  it('hides the empty state on the comments list when there is no search term', () => {
    expect(
      shouldHideCommentsEmptyState(
        '/dashboard/collections/comments',
        new URLSearchParams(),
      ),
    ).toBe(true)
  })

  it('shows the empty state on the comments list when a search term exists', () => {
    expect(
      shouldHideCommentsEmptyState(
        '/dashboard/collections/comments',
        new URLSearchParams('search=rock'),
      ),
    ).toBe(false)
  })

  it('does not affect other collection lists', () => {
    expect(
      shouldHideCommentsEmptyState(
        '/dashboard/collections/posts',
        new URLSearchParams(),
      ),
    ).toBe(false)
  })
})
