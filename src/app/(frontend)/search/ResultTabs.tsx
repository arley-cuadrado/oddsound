'use client'

import React from 'react'

import { cn } from '@/utilities/ui'
import type { DiscoveryTab } from './discovery/types'

const TABS: { label: string; value: DiscoveryTab }[] = [
  { label: 'Todo', value: 'all' },
  { label: 'Lanzamientos', value: 'releases' },
  { label: 'Artistas', value: 'artists' },
  { label: 'Escenas', value: 'scenes' },
]

export const ResultTabs: React.FC<{
  activeTab: DiscoveryTab
  counts: Record<DiscoveryTab, number>
  onChange: (tab: DiscoveryTab) => void
}> = ({ activeTab, counts, onChange }) => {
  return (
    <div
      className="flex gap-5 overflow-x-auto border-b border-border pb-0 [scrollbar-width:none] dark:border-white/10 [&::-webkit-scrollbar]:hidden"
      role="tablist"
    >
      {TABS.map((tab) => {
        const isActive = tab.value === activeTab

        return (
          <button
            aria-selected={isActive}
            className={cn(
              'shrink-0 cursor-pointer border-b-2 pb-2 text-[12px] font-medium transition',
              isActive
                ? 'border-foreground text-foreground dark:border-white dark:text-white'
                : 'border-transparent text-foreground/55 hover:text-foreground dark:text-white/55 dark:hover:text-white',
            )}
            key={tab.value}
            onClick={() => onChange(tab.value)}
            role="tab"
            type="button"
          >
            {tab.label}
            <span className="ml-1.5 text-[10px] text-foreground/40 dark:text-white/40">
              {counts[tab.value]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
