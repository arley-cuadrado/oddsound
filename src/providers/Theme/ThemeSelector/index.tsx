'use client'

import React, { useState } from 'react'

import type { Theme } from './types'

import { useTheme } from '..'
import { themeLocalStorageKey } from './types'

export const ThemeSelector: React.FC = () => {
  const { setTheme } = useTheme()
  const [value, setValue] = useState<Theme>('light')

  const onThemeChange = (themeToSet: Theme) => {
    setTheme(themeToSet)
    setValue(themeToSet)
  }

  React.useEffect(() => {
    const preference = window.localStorage.getItem(themeLocalStorageKey)
    if (preference === 'dark' || preference === 'light') {
      setValue(preference)
      return
    }

    setValue('light')
  }, [])

  return (
    <button
      type="button"
      aria-label={`Switch to ${value === 'dark' ? 'light' : 'dark'} mode`}
      aria-pressed={value === 'dark'}
      className="inline-flex cursor-pointer items-center gap-2"
      onClick={() => onThemeChange(value === 'dark' ? 'light' : 'dark')}
    >
      <span
        className={`relative flex h-6 w-10 rounded-full border transition-colors ${
          value === 'dark' ? 'border-border bg-[#262626]' : 'border-border bg-white'
        }`}
      >
        <span
          className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-[#8a8a8a] transition-transform ${
            value === 'dark' ? 'translate-x-0.5' : 'translate-x-[1.1rem]'
          }`}
        />
      </span>
      <span className="text-sm text-primary">{value === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  )
}
