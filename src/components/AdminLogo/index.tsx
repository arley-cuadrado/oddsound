import Link from 'next/link'
import React from 'react'

const AdminLogo: React.FC = () => {
  return (
    <Link href="/">
      <span
        aria-label="oddsound"
        style={{
          background: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab) 0 0 / 400% 400%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'oddsound-admin-gradient 15s ease infinite',
          display: 'inline-block',
          fontSize: '3rem',
          fontWeight: 700,
          letterSpacing: '0.02em',
          lineHeight: 1,
        }}
      >
        oddsound
        <style>{`
          @keyframes oddsound-admin-gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
      </span>
    </Link>
  )
}

export default AdminLogo
