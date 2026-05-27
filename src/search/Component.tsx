'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import React, { FormEvent, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export const Search: React.FC = () => {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  // Keep the current query visible in the input after navigation.
  const initialQuery = searchParams.get('q') || ''
  const [value, setValue] = useState(initialQuery)

  useEffect(() => {
    setValue(initialQuery)
  }, [initialQuery])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextValue = value.trim()
    const params = new URLSearchParams(searchParams.toString())

    if (nextValue) {
      params.set('q', nextValue)
    } else {
      params.delete('q')
    }

    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }

  return (
    <form className="w-full" onSubmit={handleSubmit}>
      <div className="flex h-[50px] w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs">
        <Input
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          className="h-full border-0 bg-transparent px-4 text-[13px] placeholder:text-[13px] shadow-none focus-visible:ring-0 focus-visible:outline-none"
          id="search"
          onChange={(event) => {
            setValue(event.target.value)
          }}
          placeholder="Comienza a descubrir ;)"
          spellCheck={false}
          value={value}
        />
        <Button
          className="h-full min-w-[88px] cursor-pointer rounded-none rounded-r-md border-l border-input bg-white px-5 text-[13px] font-medium text-black hover:bg-white/95 sm:min-w-[96px]"
          size="clear"
          type="submit"
        >
          Buscar
        </Button>
      </div>
    </form>
  )
}
