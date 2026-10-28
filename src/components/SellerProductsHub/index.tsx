'use client'
import React from 'react'
import { useAuth } from '@payloadcms/ui'
import { isMusicalCreatorUser } from '@/utilities/isEditorialUser'
import { CommercePanel } from '@/components/CommercePanel'
import './index.css'

export default function SellerProductsHub() {
  const { user } = useAuth()
  if (!isMusicalCreatorUser(user)) return null
  return (
    <div
      className="seller-products-hub gutter--left gutter--right"
      style={{ paddingBottom: '2rem' }}
    >
      <CommercePanel mode="artist" />
    </div>
  )
}
