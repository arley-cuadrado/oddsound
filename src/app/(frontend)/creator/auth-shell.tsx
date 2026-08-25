import type { ReactNode } from 'react'

import AdminLogo from '@/components/AdminLogo'
import { cn } from '@/utilities/ui'

type CreatorAuthShellProps = {
  children: ReactNode
  footer?: ReactNode
  intro?: ReactNode
  maxWidthClassName?: string
}

export function CreatorAuthShell({
  children,
  footer,
  intro,
  maxWidthClassName = 'max-w-[30rem]',
}: CreatorAuthShellProps) {
  return (
    <main className="min-h-screen px-6 py-16">
      <div
        className={cn(
          'mx-auto flex min-h-[calc(100vh-8rem)] flex-col justify-center',
          maxWidthClassName,
        )}
      >
        <div className="mb-12 text-center">
          <div className="inline-flex">
            <AdminLogo />
          </div>
        </div>

        {intro ? <div className="mb-8">{intro}</div> : null}

        {children}

        {footer ? <div className="mt-8 text-[13px] text-foreground/80">{footer}</div> : null}
      </div>
    </main>
  )
}
