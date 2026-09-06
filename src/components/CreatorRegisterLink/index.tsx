import Link from 'next/link'
import React from 'react'

const CreatorRegisterLink: React.FC = () => {
  return (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        textAlign: 'center',
      }}
    >
      <Link href="/creator/register" style={{ textDecoration: 'underline' }}>
        Regístrate como artista
      </Link>
      <Link href="/fan/login" style={{ textDecoration: 'underline' }}>
        Inicia sesión como fan
      </Link>
    </div>
  )
}

export default CreatorRegisterLink
