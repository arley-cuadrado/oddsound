interface DataArtist {
  artist?: string
}

const heroCards = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  artist: `ARTISTA #${index + 1}`,
}))

export default function HeaderHome({ artist }: DataArtist) {
  const fallbackArtist = artist || 'ARTISTA #1'

  return (
    <section className="w-full overflow-hidden">
      <div className="overflow-x-auto pb-4">
        <div className="flex w-max min-w-full gap-4 px-4 md:px-6">
          {heroCards.map((card) => (
            <article
              key={card.id}
              className="relative h-56 w-[18rem] shrink-0 overflow-hidden rounded-2xl bg-[url('/home-images/hero.jpeg')] bg-cover bg-center sm:w-[22rem] lg:w-[26rem]"
            >
              <div className="absolute inset-0 bg-black/45" />
              <div className="relative flex h-full items-end p-5 sm:p-6">
                <h1 className="max-w-[14ch] text-xl font-bold uppercase leading-tight text-white sm:text-2xl lg:text-3xl">
                  New album out now
                  <br />
                  {card.artist || fallbackArtist}
                </h1>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
