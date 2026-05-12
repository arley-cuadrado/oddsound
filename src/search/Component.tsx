'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import React, { useState, useEffect } from 'react'
import { useDebounce } from '@/utilities/useDebounce'
import { useRouter, useSearchParams } from 'next/navigation'

export const Search: React.FC = () => {
  const searchParams = useSearchParams()
  // Keep the current query visible in the input after navigation.
  const initialQuery = searchParams.get('q') || ''
  const [value, setValue] = useState('')
  const router = useRouter()

  const debouncedValue = useDebounce(value)

  useEffect(() => {
    // Only sync from the URL when navigation changes the query externally.
    if (initialQuery !== value) {
      setValue(initialQuery)
    }
  }, [initialQuery])

  useEffect(() => {
    // Update the URL from the debounced value so the server page can filter release pages.
    router.replace(`/search${debouncedValue ? `?q=${debouncedValue}` : ''}`)
  }, [debouncedValue, router])

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <Label htmlFor="search" className="sr-only">
          Search
        </Label>
        <Input
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          id="search"
          onChange={(event) => {
            setValue(event.target.value)
          }}
          placeholder="Enter the music genre, country, band, or album name..."
          spellCheck={false}
          value={value}
        />
        <button type="submit" className="sr-only">
          submit
        </button>
      </form>
    </div>
  )
}
