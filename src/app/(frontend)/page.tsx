import AsideHome from './home-components/AsideHome'
import HeaderHome from './home-components/HeaderHome'

export default function HomePage() {
  return (
    <>
      <HeaderHome />
      <main className='flex flex-row items-center justify-center h-screen'>
        <section className="px-6 py-16 md:px-10 lg:px-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-semibold md:text-4xl">Welcome to ODDSOUND</h2>
            <p className="mt-4 max-w-2xl text-base md:text-lg">
              This root route now has its own structure, separate from the dynamic CMS pages.
            </p>
          </div>
        </section>
        <AsideHome />
      </main>
    </>
  )
}
