'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

interface SliderPost {
  id: string
  imageUrl?: string | null
  slug: string
  title: string
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
  const heroCards = posts?.length ? posts : fallbackCards
  const [activeIndex, setActiveIndex] = useState(0)
  const [visibleCards, setVisibleCards] = useState(DESKTOP_VISIBLE_CARDS)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Array<HTMLElement | null>>([])
  const maxStartIndex = Math.max(heroCards.length - visibleCards, 0)

  useEffect(() => {
    const updateVisibleCards = () => {
      setVisibleCards(window.innerWidth < 1024 ? MOBILE_VISIBLE_CARDS : DESKTOP_VISIBLE_CARDS)
    }

    updateVisibleCards()
    window.addEventListener('resize', updateVisibleCards)

    return () => window.removeEventListener('resize', updateVisibleCards)
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex >= maxStartIndex ? 0 : currentIndex + 1))
    }, AUTO_SCROLL_MS)

    return () => window.clearInterval(interval)
  }, [maxStartIndex])

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
    <section className="w-full overflow-hidden">
      <div
        ref={containerRef}
        className="mx-auto w-full max-w-screen-xl overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          ref={trackRef}
          className="grid w-full grid-flow-col gap-4 px-4 md:px-6"
          style={{
            gridAutoColumns: `calc((100% - 4rem) / ${visibleCards + PEEK_RATIO})`,
          }}
        >
          {heroCards.map((card, index) => (
            <Link
              key={card.id}
              href={`/posts/${card.slug}`}
              ref={(node) => {
                cardRefs.current[index] = node
              }}
              className="relative block h-24 overflow-hidden bg-cover bg-center"
              style={{
                backgroundImage: `url('${card.imageUrl || '/home-images/hero.jpeg'}')`,
              }}
            >
              <div className="absolute inset-0 bg-black/45" />
              <div className="relative flex h-full items-end p-3 sm:p-4">
                <h2 className="max-w-[18ch] text-sm font-semibold leading-tight text-white sm:text-base">
                  {card.title}
                </h2>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-5 h-1.5 w-40 overflow-hidden rounded-full bg-black/10">
        <div
          key={activeIndex}
          className="h-full rounded-full bg-black"
          style={{
            animation: `header-home-progress ${AUTO_SCROLL_MS}ms linear forwards`,
          }}
        />
      </div>
    </section>
  )
}
