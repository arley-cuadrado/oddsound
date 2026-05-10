'use client'

import React, { createContext, useCallback, use, useEffect, useState } from 'react'

import type { Theme, ThemeContextType } from './types'

import canUseDOM from '@/utilities/canUseDOM'
import {
  defaultTheme,
  getImplicitPreference,
  themeDesktopBreakpoint,
  themeLocalStorageKey,
} from './shared'
import { themeIsValid } from './types'

const initialContext: ThemeContextType = {
  setTheme: () => null,
  theme: undefined,
}

const ThemeContext = createContext(initialContext)

const getViewportTheme = (): Theme => {
  const implicitPreference = getImplicitPreference()

  if (window.innerWidth <= themeDesktopBreakpoint) {
    return implicitPreference || defaultTheme
  }

  const preference = window.localStorage.getItem(themeLocalStorageKey)

  if (themeIsValid(preference)) {
    return preference
  }

  return implicitPreference || defaultTheme
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme | undefined>(
    canUseDOM ? (document.documentElement.getAttribute('data-theme') as Theme) : undefined,
  )

  const setTheme = useCallback((themeToSet: Theme | null) => {
    if (themeToSet === null) {
      window.localStorage.removeItem(themeLocalStorageKey)
      const implicitPreference = getImplicitPreference()
      document.documentElement.setAttribute('data-theme', implicitPreference || '')
      if (implicitPreference) setThemeState(implicitPreference)
    } else {
      setThemeState(themeToSet)
      window.localStorage.setItem(themeLocalStorageKey, themeToSet)
      document.documentElement.setAttribute('data-theme', themeToSet)
    }
  }, [])

  useEffect(() => {
    const syncTheme = () => {
      const themeToSet = getViewportTheme()

      document.documentElement.setAttribute('data-theme', themeToSet)
      setThemeState(themeToSet)
    }

    const mql = window.matchMedia('(prefers-color-scheme: dark)')

    syncTheme()
    window.addEventListener('resize', syncTheme)
    mql.addEventListener('change', syncTheme)

    return () => {
      window.removeEventListener('resize', syncTheme)
      mql.removeEventListener('change', syncTheme)
    }
  }, [])

  return <ThemeContext value={{ setTheme, theme }}>{children}</ThemeContext>
}

export const useTheme = (): ThemeContextType => use(ThemeContext)
