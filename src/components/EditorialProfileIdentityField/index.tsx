'use client'

import { useFormFields } from '@payloadcms/ui'
import type { UIFieldClientProps } from 'payload'

export default function EditorialProfileIdentityField(_props: UIFieldClientProps) {
  const values = useFormFields(([fields]) => {
    const displayName = typeof fields?.displayName?.value === 'string' ? fields.displayName.value : ''
    const profileType =
      typeof fields?.profileType?.value === 'string' ? fields.profileType.value : undefined
    const editorialProfile = Boolean(fields?.editorialProfile?.value)

    return {
      displayName,
      isEditorial: editorialProfile || profileType === 'editorial',
    }
  })

  if (!values.isEditorial) return null

  return (
    <div className="editorial-profile-identity-field">
      <p className="editorial-profile-identity-field__eyebrow">Editor -</p>
      <h2 className="editorial-profile-identity-field__title">
        {values.displayName.trim() || 'Nombre del editor'}
      </h2>
    </div>
  )
}
