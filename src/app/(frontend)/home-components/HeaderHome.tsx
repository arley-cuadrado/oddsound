'use client'

import { useEffect, useRef, useState } from 'react'

interface DataArtist {
  artist?: string
}

const AUTO_SCROLL_MS = 5000
const DESKTOP_VISIBLE_CARDS = 4
const COMPACT_VISIBLE_CARDS = 3
const PEEK_RATIO = 0.35

const heroCards = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  artist: `ARTISTA #${index + 1}`,
}))

export default function SliderHeader({ artist }: DataArtist) {
  const fallbackArtist = artist || 'ARTISTA #1'
  const [activeIndex, setActiveIndex] = useState(0)
  const [visibleCards, setVisibleCards] = useState(DESKTOP_VISIBLE_CARDS)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Array<HTMLElement | null>>([])
  const maxStartIndex = Math.max(heroCards.length - visibleCards, 0)

  useEffect(() => {
    const updateVisibleCards = () => {
      setVisibleCards(window.innerWidth < 1024 ? COMPACT_VISIBLE_CARDS : DESKTOP_VISIBLE_CARDS)
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
            <article
              key={card.id}
              ref={(node) => {
                cardRefs.current[index] = node
              }}
              className="relative h-24 overflow-hidden rounded-0xl bg-[url('/home-images/hero.jpeg')] bg-cover bg-center"
            >
              <div className="absolute inset-0 bg-black/45" />
              <div className="relative flex h-full items-end p-5 sm:p-6">
                <h1 className="max-w-[14ch] text-24 font-bold uppercase leading-tight text-white">
                  New album out now
                  <br />
                  {card.artist || fallbackArtist}
                </h1>
              </div>
            </article>
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
