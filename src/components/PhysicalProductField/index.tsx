'use client'
import React from 'react'
import { SelectField, useAuth } from '@payloadcms/ui'
import type { SelectFieldClientComponent } from 'payload'
import { isAdminUser } from '@/utilities/isAdminUser'

const PhysicalProductField: SelectFieldClientComponent = (props) => {
  const { user } = useAuth()
  if (isAdminUser(user)) return <SelectField {...props} />
  return (
    <div className="field-type">
      <label className="field-label">Tipo de producto</label>
      <p>Físico</p>
    </div>
  )
}
export default PhysicalProductField
