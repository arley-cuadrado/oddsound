'use client'
import { Input } from '@/components/ui/input'
import React, { FormEvent } from 'react'

type SearchProps = {
  onValueChange: (value: string) => void
  value: string
}

export const SEARCH_PLACEHOLDER = 'Champeta, Cartagena, Keke Minowa …'

/**
 * Controlled discovery input. Filtering happens as the visitor types, so the
 * form only exists to keep Enter and assistive tech behaving; the owner of the
 * value decides what to do with it.
 */
export const Search: React.FC<SearchProps> = ({ onValueChange, value }) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    // Results are already live; submitting must not trigger a navigation.
    event.preventDefault()
  }

  return (
    <form className="w-full" onSubmit={handleSubmit} role="search">
      <div className="flex h-[50px] w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs">
        <Input
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          className="h-full border-0 bg-transparent px-4 text-base placeholder:text-base shadow-none focus-visible:ring-0 focus-visible:outline-none md:text-[13px] md:placeholder:text-[13px]"
          id="search"
          onChange={(event) => {
            onValueChange(event.target.value)
          }}
          placeholder={SEARCH_PLACEHOLDER}
          spellCheck={false}
          value={value}
        />
        {value ? (
          <button
            aria-label="Limpiar búsqueda"
            className="h-full shrink-0 cursor-pointer border-l border-input px-5 text-[13px] font-medium text-foreground/60 transition hover:text-foreground dark:text-white/60 dark:hover:text-white"
            onClick={() => {
              onValueChange('')
            }}
            type="button"
          >
            Limpiar
          </button>
        ) : null}
      </div>
    </form>
  )
}
