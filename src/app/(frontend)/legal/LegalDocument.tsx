import React from 'react'

type Section = {
  body: React.ReactNode[]
  title: string
}

type LegalDocumentProps = {
  intro: React.ReactNode[]
  introTitle?: string
  sections: Section[]
  title: string
  updatedAt: string
}

export function LegalDocument({
  intro,
  introTitle,
  sections,
  title,
  updatedAt,
}: LegalDocumentProps) {
  return (
    <article className="mx-auto max-w-4xl px-4 pb-24 pt-12 md:px-6">
      <div className="mx-auto max-w-[48rem]">
        <header className="mb-10 border-b border-slate-200 pb-8 dark:border-slate-800">
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-[#777] dark:text-[#858c98]">
            Be heard. Stay odd.
          </p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-[13px] text-[#777] dark:text-[#858c98]">
            Última actualización: {updatedAt}
          </p>
        </header>

        <div className="prose max-w-none text-[#777] prose-headings:text-slate-900 prose-p:text-[13px] prose-p:text-[#777] dark:text-[#858c98] dark:prose-headings:text-white dark:prose-p:text-[#858c98]">
          {introTitle ? <h2>{introTitle}</h2> : null}
          {intro.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}

          {sections.map((section) => (
            <section className="mt-10" key={section.title}>
              {section.title ? <h2>{section.title}</h2> : null}
              {section.body.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </article>
  )
}
