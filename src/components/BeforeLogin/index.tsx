import React from 'react'
import AdminLoginPasswordToggle from '@/components/AdminLoginPasswordToggle'

const BeforeLogin: React.FC = () => {
  return (
    <div className="space-y-3">
      <AdminLoginPasswordToggle />
      <p>
        Bienvenid@ a <strong>tu</strong> espacio, inicia sesión aquí.
      </p>
    </div>
  )
}

export default BeforeLogin
