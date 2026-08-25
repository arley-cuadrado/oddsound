import Link from 'next/link'
import React from 'react'

const CreatorRegisterLink: React.FC = () => {
  return (
    <div className="flex flex-col items-center space-y-3 text-center">
      <Link href="/creator/register">Regístrate como artista</Link>
      <Link href="/fan/login">Inicia sesión como fan</Link>
    </div>
  )
}

export default CreatorRegisterLink
