'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

interface SliderPost {
  id: string
  imageUrl?: string | null
  slug: string
  title: string
}

interface SliderCard {
  href: string
  id: string
  imageUrl?: string | null
  title: string
  variant?: 'default' | 'more'
}

const AUTO_SCROLL_MS = 5000
const DESKTOP_VISIBLE_CARDS = 4
const MOBILE_VISIBLE_CARDS = 2
const PEEK_RATIO = 0.35

const fallbackCards: SliderPost[] = Array.from({ length: 5 }, (_, index) => ({
  id: `fallback-${index + 1}`,
  imageUrl: '/home-images/hero.jpeg',
  slug: 'posts',
  title: `Featured scene ${index + 1}`,
}))

export default function SliderHeader({ posts }: { posts?: SliderPost[] }) {
  const sourceCards = posts?.length ? posts : fallbackCards
  const visiblePosts = sourceCards.slice(0, 5)
  const shouldShowMoreCard = sourceCards.length > 5
  const heroCards: SliderCard[] = shouldShowMoreCard
    ? [
        ...visiblePosts.map((post) => ({
          href: `/posts/${post.slug}`,
          id: post.id,
          imageUrl: post.imageUrl,
          title: post.title,
          variant: 'default' as const,
        })),
        {
          href: '/posts',
          id: 'more-posts-card',
          title: 'Ver más',
          variant: 'more' as const,
        },
      ]
    : visiblePosts.map((post) => ({
        href: `/posts/${post.slug}`,
        id: post.id,
        imageUrl: post.imageUrl,
        title: post.title,
        variant: 'default' as const,
      }))
  const [activeIndex, setActiveIndex] = useState(0)
  const [visibleCards, setVisibleCards] = useState(DESKTOP_VISIBLE_CARDS)
  const [isDesktop, setIsDesktop] = useState(true)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Array<HTMLElement | null>>([])
  const maxStartIndex = Math.max(heroCards.length - visibleCards, 0)
  const enablePeek = isDesktop
    ? heroCards.length > DESKTOP_VISIBLE_CARDS
    : heroCards.length > MOBILE_VISIBLE_CARDS
  const showProgress = isDesktop && heroCards.length > DESKTOP_VISIBLE_CARDS
  useEffect(() => {
    const updateVisibleCards = () => {
      const desktop = window.innerWidth >= 1024
      const maxVisibleCards = desktop ? DESKTOP_VISIBLE_CARDS : MOBILE_VISIBLE_CARDS

      setIsDesktop(desktop)
      setVisibleCards(Math.min(heroCards.length, maxVisibleCards))
    }

    updateVisibleCards()
    window.addEventListener('resize', updateVisibleCards)

    return () => window.removeEventListener('resize', updateVisibleCards)
  }, [heroCards.length])

  useEffect(() => {
    if (!showProgress) return

    const interval = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex >= maxStartIndex ? 0 : currentIndex + 1))
    }, AUTO_SCROLL_MS)

    return () => window.clearInterval(interval)
  }, [maxStartIndex, showProgress])

  useEffect(() => {
    setActiveIndex((currentIndex) => Math.min(currentIndex, maxStartIndex))
  }, [maxStartIndex])

  useEffect(() => {
    const activeCard = cardRefs.current[activeIndex]
    const container = containerRef.current
    const track = trackRef.current

    if (!activeCard || !container || !track) return

    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap || '0')
    const step = activeCard.offsetWidth + gap

    container.scrollTo({
      left: activeIndex === 0 ? 0 : activeIndex * step,
      behavior: 'smooth',
    })
  }, [activeIndex])

  return (
    <section className="mt-4 w-full overflow-hidden max-[975px]:mt-0">
      <div
        ref={containerRef}
        className="w-full overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          ref={trackRef}
          className="grid w-full grid-flow-col gap-4"
          style={{
            gridAutoColumns: `calc(100% / ${visibleCards + (enablePeek ? PEEK_RATIO : 0)})`,
          }}
        >
          {heroCards.map((card, index) => (
            <Link
              key={card.id}
              href={card.href}
              ref={(node) => {
                cardRefs.current[index] = node
              }}
              className={
                card.variant === 'more'
                  ? 'relative flex h-24 items-center justify-center overflow-hidden rounded-lg border border-dashed border-black/20 bg-[#f3efe8] px-4 text-center transition hover:bg-[#ebe3d5] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10'
                  : 'relative block h-24 overflow-hidden rounded-lg bg-cover bg-center'
              }
              style={
                card.variant === 'more'
                  ? undefined
                  : {
                      backgroundImage: `url('${card.imageUrl || '/home-images/hero.jpeg'}')`,
                    }
              }
            >
              {card.variant === 'more' ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/45 dark:text-white/45">
                    Editorial
                  </span>
                  <span className="text-sm font-semibold leading-tight text-foreground dark:text-white sm:text-base">
                    {card.title}
                  </span>
                </div>
              ) : (
                <>
                  <div className="absolute inset-0 bg-black/45" />
                  <div className="relative flex h-full items-end p-3 sm:p-4">
                    <h2 className="max-w-[18ch] text-sm font-semibold leading-tight text-white sm:text-base">
                      {card.title}
                    </h2>
                  </div>
                </>
              )}
            </Link>
          ))}
        </div>
      </div>
      {showProgress ? (
        <div className="mx-auto mt-5 h-1.5 w-40 overflow-hidden rounded-full bg-black/10">
          <div
            key={activeIndex}
            className="h-full rounded-full bg-black"
            style={{
              animation: `header-home-progress ${AUTO_SCROLL_MS}ms linear forwards`,
            }}
          />
        </div>
      ) : null}
    </section>
  )
}
