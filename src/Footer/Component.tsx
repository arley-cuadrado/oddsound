import { getCachedGlobal } from '@/utilities/getGlobals'
import Link from 'next/link'

export async function Footer() {
  const footerData = await getCachedGlobal('footer', 1)()
  const currentYear = new Date().getFullYear()
  void footerData

  return (
    <footer className="mt-auto bg-white text-dark dark:bg-card">
      {/* border-t border-border */}
      <div className="flex flex-col gap-8 px-6 md:flex-col">
        <div className="flex flex-col items-start gap-2">
          <p className="text-[10px]">© {currentYear} | Made with love and lots of Coffee</p>
          <div className="flex items-start gap-3 text-[10px] text-[#777] dark:text-[#777]">
            <Link className="underline underline-offset-2" href="/terms-and-conditions">
              Terms and Conditions
            </Link>
            <Link className="underline underline-offset-2" href="/privacy-policy">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
