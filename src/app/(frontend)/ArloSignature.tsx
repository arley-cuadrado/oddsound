import Image from 'next/image'
import Link from 'next/link'

export function ArloSignature() {
  return (
    <Link
      className="not-prose no-underline hover:no-underline focus:no-underline active:no-underline"
      href="https://www.instagram.com/arlo_cuadrado/"
      target="_blank"
    >
      <span className="relative mt-8 flex items-center gap-x-4 pb-2">
        <Image
          src="/home-images/arlo_cuadrado.png"
          alt="Arlo Cuadrado"
          width={40}
          height={40}
          className="size-10 rounded-full"
        />
        <span className="text-sm/6">
          <span>
            <span className="block">
              <span className="text-red title">@arlo_cuadrado</span>
            </span>
            <span className="block text-xs text-black dark:text-white">
              Founder / &quot;Content Creator&quot;
            </span>
          </span>
        </span>
      </span>
    </Link>
  )
}
