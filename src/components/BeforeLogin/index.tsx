import React from 'react'
import AdminLoginPasswordToggle from '@/components/AdminLoginPasswordToggle'

const BeforeLogin: React.FC = () => {
  return (
    <div className="space-y-3">
      <AdminLoginPasswordToggle />
      <p>
        Welcome to <strong>your</strong> space, sign in here.
      </p>
    </div>
  )
}

export default BeforeLogin
