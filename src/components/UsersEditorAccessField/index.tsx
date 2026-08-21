'use client'

import { CheckboxField, useField } from '@payloadcms/ui'
import type { CheckboxFieldClientProps } from 'payload'
import { useEffect, useMemo } from 'react'

import { isEditorialUsersAdminRoute } from '@/utilities/editorialUsersAdminRoute'

export default function UsersEditorAccessField(props: CheckboxFieldClientProps) {
  const editorAccessField = useField<boolean>({
    path: props.path,
  })

  const isEditorialRoute = useMemo(() => {
    if (typeof window === 'undefined') return false

    return isEditorialUsersAdminRoute({
      pathname: window.location.pathname,
      search: window.location.search,
    })
  }, [])

  useEffect(() => {
    if (!isEditorialRoute || editorAccessField.value === true) return

    editorAccessField.setValue(true, true)
  }, [editorAccessField, isEditorialRoute])

  if (isEditorialRoute || Boolean(editorAccessField.value)) {
    return null
  }

  return <CheckboxField {...props} checked={Boolean(editorAccessField.value)} />
}
