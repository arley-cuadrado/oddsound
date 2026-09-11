import React from 'react'
import Script from 'next/script'

import { defaultTheme, themeLocalStorageKey } from '../ThemeSelector/types'
import { themeDesktopBreakpoint } from '../shared'

export const InitTheme: React.FC = () => {
  return (
    <Script
      id="theme-script"
      strategy="beforeInteractive"
    >{`
  (function () {
    function getImplicitPreference() {
      var mediaQuery = '(prefers-color-scheme: dark)'
      var mql = window.matchMedia(mediaQuery)
      var hasImplicitPreference = typeof mql.matches === 'boolean'

      if (hasImplicitPreference) {
        return mql.matches ? 'dark' : 'light'
      }

      return null
    }

    function themeIsValid(theme) {
      return theme === 'light' || theme === 'dark'
    }

    var themeToSet = '${defaultTheme}'
    var implicitPreference = getImplicitPreference()
    var isDesktop = window.innerWidth > ${themeDesktopBreakpoint}
    var preference = isDesktop ? window.localStorage.getItem('${themeLocalStorageKey}') : null

    if (themeIsValid(preference)) {
      themeToSet = preference
    } else if (implicitPreference) {
      themeToSet = implicitPreference
    }

    document.documentElement.setAttribute('data-theme', themeToSet)
  })();
  `}</Script>
  )
}
