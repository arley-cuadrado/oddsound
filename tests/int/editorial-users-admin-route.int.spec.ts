import { describe, expect, it } from 'vitest'

import { isEditorialUsersAdminRoute } from '@/utilities/editorialUsersAdminRoute'

describe('isEditorialUsersAdminRoute', () => {
  it('detects the dedicated editors admin route', () => {
    expect(
      isEditorialUsersAdminRoute({
        pathname: '/dashboard/collections/users',
        search: '?where[editorAccess][equals]=true&editors=1',
      }),
    ).toBe(true)
  })

  it('rejects the generic users route', () => {
    expect(
      isEditorialUsersAdminRoute({
        pathname: '/dashboard/collections/users',
        search: '',
      }),
    ).toBe(false)
  })

  it('rejects unrelated collection routes', () => {
    expect(
      isEditorialUsersAdminRoute({
        pathname: '/dashboard/collections/profiles/create',
        search: '?editors=1',
      }),
    ).toBe(false)
  })
})
