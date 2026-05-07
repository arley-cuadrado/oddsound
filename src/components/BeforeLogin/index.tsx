import React from 'react'

const BeforeLogin: React.FC = () => {
  return (
    <div className="space-y-3">
      <p>
        <b>Welcome to ODDSOUND Admin.</b>
        {' Admins, artists, bands, and labels all sign in here.'}
      </p>
      <p>
        Need a creator account first?
        {' '}
        <a href="/creator/register">creator register</a>
      </p>
    </div>
  )
}

export default BeforeLogin
