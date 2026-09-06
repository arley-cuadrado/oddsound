'use client'

import { LogOutIcon, useAuth, useTranslation } from '@payloadcms/ui'
import React, { useState } from 'react'
import { getUserLoginPath } from '@/utilities/isEditorialUser'

type AuthUser = {
  role?: null | string
  userType?: null | string
}

type Props = {
  tabIndex?: number
}

const baseClass = 'nav'

const AdminLogoutButton: React.FC<Props> = ({ tabIndex = 0 }) => {
  const { logOut, user } = useAuth<AuthUser>()
  const { t } = useTranslation()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleClick = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)

    try {
      await logOut()
    } finally {
      window.location.href = getUserLoginPath(user)
    }
  }

  return (
    <button
      aria-label={t('authentication:logOut')}
      className={`${baseClass}__log-out`}
      onClick={handleClick}
      tabIndex={tabIndex}
      title={t('authentication:logOut')}
      type="button"
    >
      <LogOutIcon />
    </button>
  )
}

export default AdminLogoutButton
