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
      <div className="flex items-center gap-x-4 text-xs text-slate-600 dark:text-gray-400">
        <time dateTime={aboutUsDateTime}>{aboutUsUpdatedAt}</time>
      </div>
      <Link href="/about-us">
        <div className="group relative grow">
          <h3 className="mt-3 font-semibold text-slate-700 dark:text-white">
            <span className="absolute inset-0"></span>
            {aboutUsTitle}
          </h3>
          <p className="mt-5 line-clamp-3 text-slate-600 dark:text-gray-400">{aboutUsIntro[0]}</p>
        </div>
      </Link>
    </article>
  )
}
