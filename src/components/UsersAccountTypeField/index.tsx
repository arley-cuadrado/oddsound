'use client'

import { SelectField, useField, useFormFields } from '@payloadcms/ui'
import type { SelectFieldClientProps } from 'payload'
import { useEffect, useMemo } from 'react'

import { isEditorialUsersAdminRoute } from '@/utilities/editorialUsersAdminRoute'

export default function UsersAccountTypeField(props: SelectFieldClientProps) {
  const accountTypeField = useField<string | string[] | null>({
    path: props.path,
  })
  const editorAccessValue = useFormFields(([fields]) => {
    return Boolean(fields?.editorAccess?.value)
  })

  const isEditorialRoute = useMemo(() => {
    if (typeof window === 'undefined') return false

    return isEditorialUsersAdminRoute({
      pathname: window.location.pathname,
      search: window.location.search,
    })
  }, [])

  const shouldHide = isEditorialRoute || editorAccessValue

  useEffect(() => {
    if (!shouldHide || accountTypeField.value == null) return

    accountTypeField.setValue(null, true)
  }, [accountTypeField, shouldHide])

  if (shouldHide) {
    return null
  }

  return (
    <SelectField
      {...props}
      onChange={(value) => {
        accountTypeField.setValue(value, false)
        props.onChange?.(value)
      }}
      value={typeof accountTypeField.value === 'string' ? accountTypeField.value : undefined}
    />
  )
}
