import { getCachedGlobal } from '@/utilities/getGlobals'
import Link from 'next/link'

export async function Footer() {
  const footerData = await getCachedGlobal('footer', 1)()
  const currentYear = new Date().getFullYear()

  const navItems = footerData?.navItems || []

  return (
    <footer className="mt-auto bg-white dark:bg-card text-dark">
      {/* border-t border-border */}
      <div className="container gap-8 flex flex-col md:flex-col items-center pt-8">
        <div>
          <Link href="https://www.instagram.com/arlo_cuadrado/" target="_blank">
            <p>
            © {currentYear} | Made with love and lots of Coffee</p>
          </Link>
        </div>
      </div>
    </footer>
  )
}
