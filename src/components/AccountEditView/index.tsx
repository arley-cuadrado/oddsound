'use client'

import { DefaultEditView } from '@payloadcms/ui'
import type { DocumentViewClientProps } from 'payload'

export default function AccountEditView(props: DocumentViewClientProps) {
  return (
    <div className="oddsound-account-view">
      <DefaultEditView {...props} />
    </div>
  )
}
