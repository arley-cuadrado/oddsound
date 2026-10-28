import type { AdminViewServerProps, CollectionSlug } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { SetStepNav } from '@payloadcms/ui'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isAdminUser } from '@/utilities/isAdminUser'
import './index.css'

const groups: {
  title: string
  records: { slug: CollectionSlug; label: string; description: string }[]
}[] = [
  {
    title: 'Communication & reputation',
    records: [
      {
        slug: 'commerceConversations',
        label: 'Conversations',
        description: 'Private buyer and seller conversations.',
      },
      { slug: 'commerceMessages', label: 'Messages', description: 'Order conversation history.' },
      {
        slug: 'commerceReviews',
        label: 'Reviews',
        description: 'Ratings and comments from verified deliveries.',
      },
      {
        slug: 'commerceReviewReports',
        label: 'Review reports',
        description: 'Reported reviews awaiting moderation.',
      },
    ],
  },
  {
    title: 'Payments & accounting',
    records: [
      {
        slug: 'commerceJournal',
        label: 'Journals',
        description: 'Immutable financial entries and balances.',
      },
      {
        slug: 'commerceEvents',
        label: 'Payment events',
        description: 'Provider notifications and processing results.',
      },
      {
        slug: 'commercePayouts',
        label: 'Payouts',
        description: 'Seller disbursement orders and their status.',
      },
      {
        slug: 'commerceBanks',
        label: 'Bank accounts',
        description: 'Private payout accounts and verification status.',
      },
      {
        slug: 'commerceRefunds',
        label: 'Refunds',
        description: 'Refund requests and confirmed results.',
      },
    ],
  },
  {
    title: 'Shipping & claims',
    records: [
      {
        slug: 'commerceShipments',
        label: 'Shipments',
        description: 'Tracking numbers, allocations and delivery evidence.',
      },
      {
        slug: 'commerceCarriers',
        label: 'Carriers',
        description: 'Shipping providers and tracking connectors.',
      },
      {
        slug: 'commerceCases',
        label: 'Claims',
        description: 'Formal disputes and administrative decisions.',
      },
      {
        slug: 'commerceAttachments',
        label: 'Attachments',
        description: 'Private evidence submitted with claims.',
      },
      {
        slug: 'commerceIncidents',
        label: 'Incidents',
        description: 'Confirmed seller responsibility by order.',
      },
    ],
  },
  {
    title: 'System & audit',
    records: [
      {
        slug: 'commerceAudits',
        label: 'Audit log',
        description: 'Administrative and financial action history.',
      },
      {
        slug: 'commerceGuestAccess',
        label: 'Guest access',
        description: 'Verified guest access to purchases.',
      },
      {
        slug: 'commerceTasks',
        label: 'Tasks',
        description: 'Queued work, retries and processing status.',
      },
      {
        slug: 'commerceLocks',
        label: 'Locks',
        description: 'Concurrency controls for store operations.',
      },
    ],
  },
]

export default function ShopRegister(props: AdminViewServerProps) {
  const { req, visibleEntities, permissions, locale } = props.initPageResult
  if (!isAdminUser(req.user)) notFound()
  const adminURL = req.payload.config.routes.admin

  return (
    <DefaultTemplate
      {...props}
      i18n={req.i18n}
      locale={locale}
      payload={req.payload}
      permissions={permissions}
      req={req}
      user={req.user || undefined}
      viewType="shop-register"
      visibleEntities={{ collections: visibleEntities.collections, globals: visibleEntities.globals }}
    >
      <SetStepNav nav={[{ label: 'Shop Register' }]} />
      <main className="shop-register gutter--left gutter--right">
        <header className="shop-register__header">
          <h1>Shop Register</h1>
          <p>Store records organized in one place.</p>
          <Link href="/creator/commerce-admin">Manage settlements, shipping and claims →</Link>
        </header>
        {groups.map((group) => (
          <section key={group.title} aria-label={group.title} className="shop-register__section">
            <h2>{group.title}</h2>
            <div className="shop-register__grid">
              {group.records.map((record) => (
                <Link
                  className="shop-register__card"
                  href={`${adminURL}/collections/${record.slug}`}
                  key={record.slug}
                >
                  <h3>
                    {record.label} <span aria-hidden="true">↗</span>
                  </h3>
                  <p>{record.description}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </DefaultTemplate>
  )
}
