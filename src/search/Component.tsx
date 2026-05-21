'use client'
import { Input } from '@/components/ui/input'
import React, { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export const Search: React.FC = () => {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  // Keep the current query visible in the input after navigation.
  const initialQuery = searchParams.get('q') || ''
  const [value, setValue] = useState(initialQuery)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setValue(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const handleChange = (nextValue: string) => {
    setValue(nextValue)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())

      if (nextValue.trim()) {
        params.set('q', nextValue)
      } else {
        params.delete('q')
      }

      const queryString = params.toString()
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
    }, 200)
  }

  return (
    <div>
      <Input
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        className="h-[50px]"
        id="search"
        onChange={(event) => {
          handleChange(event.target.value)
        }}
        placeholder="Write here..."
        spellCheck={false}
        value={value}
      />
    </div>
  )
}
