import Link from 'next/link'

import {
  aboutUsDateTime,
  aboutUsIntro,
  aboutUsTitle,
  aboutUsUpdatedAt,
} from './content'

export function AboutUsTeaser() {
  return (
    <article className="flex max-w-xl flex-col items-start justify-between">
      <div className="flex items-center gap-x-4 text-[13px] text-black dark:text-white">
        <time dateTime={aboutUsDateTime}>{aboutUsUpdatedAt}</time>
      </div>
      <Link href="/about-us">
        <div className="group relative grow">
          <h3 className="mt-3 text-[13px] font-semibold text-black dark:text-white">
            <span className="absolute inset-0"></span>
            {aboutUsTitle}
          </h3>
          <p className="mt-5 line-clamp-3 text-[13px] text-[#777] dark:text-[#858c98]">
            {aboutUsIntro[0]}
          </p>
        </div>
      </Link>
    </article>
  )
}
