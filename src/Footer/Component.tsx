import { getCachedGlobal } from '@/utilities/getGlobals'
import Link from 'next/link'
import React from 'react'

import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'

export async function Footer() {
  const footerData = await getCachedGlobal('footer', 1)()

  const navItems = footerData?.navItems || []

  return (
    <footer className="mt-auto bg-white dark:bg-card text-dark">
      {/* border-t border-border */}
      <div className="container py-8 gap-8 flex flex-col md:flex-col items-center">
        <div>
          <div className="flex flex-col-reverse">
            {/*
            <nav className="flex flex-col md:flex-row gap-4">
              {navItems.map(({ link }, i) => {
                return <CMSLink className="text-white" key={i} {...link} />
              })}
            </nav>
            */}
          </div>
        </div>
        <div>
          <Link href="https://www.instagram.com/arlo_cuadrado/" target="_blank">
            <p>
              © 2026 | <span className="text-red title">@arlo_cuadrado</span>
            </p>
            {/*<Logo />*/}
          </Link>
          <p>Made with love and lots of Coffee</p>
        </div>
      </div>
    </footer>
  )
}
