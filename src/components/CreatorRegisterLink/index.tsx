import Link from 'next/link'
import React from 'react'

const CreatorRegisterLink: React.FC = () => {
  return (
    <p>
      ¿Necesitas primero una cuenta de creador?{' '}
      <Link href="/creator/register">regístrate aquí</Link>
    </p>
  )
}

export default CreatorRegisterLink
