import type { CollectionConfig, Field, GlobalConfig } from 'payload'
import { isAdminUser } from '@/utilities/isAdminUser'

const admin = ({ req }: { req: { user?: unknown } }) => isAdminUser(req.user as never)
const text = (name: string, extra: Record<string, unknown> = {}): Field =>
  ({ name, type: 'text', ...extra }) as Field
const json = (name: string): Field => ({ name, type: 'json' })
const money = (name: string): Field => ({
  name,
  type: 'number',
  min: 0,
  validate: (v: unknown) =>
    v == null ||
    (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0) ||
    'Usa centavos enteros no negativos.',
})
const state = (options: string[]): Field => ({
  name: 'state',
  type: 'select',
  options,
  required: true,
  defaultValue: options[0],
  index: true,
})

/** Public REST/GraphQL writes cannot bypass financial service invariants. */
function internal(slug: string, fields: Field[], immutable = false): CollectionConfig {
  return {
    slug,
    // group:false removes sidebar/home entries while keeping native record routes available.
    admin: { group: false, hidden: ({ user }) => !isAdminUser(user) },
    access: { read: admin, create: () => false, update: () => false, delete: () => false },
    fields,
    ...(immutable
      ? {
          hooks: {
            beforeChange: [
              () => {
                throw new Error('Usa asientos compensatorios desde el servicio financiero.')
              },
            ],
            beforeDelete: [
              () => {
                throw new Error('Historial inmutable.')
              },
            ],
          },
        }
      : {}),
  }
}

export const commerceCollections: CollectionConfig[] = [
  internal('commerceConversations', [
    text('order', { unique: true, required: true }),
    text('artist', { index: true }),
    text('buyer'),
    json('readAt'),
  ]),
  internal('commerceMessages', [
    text('order', { index: true, required: true }),
    text('sender', { required: true }),
    text('senderRole'),
    text('product'),
    text('body', { required: true }),
  ]),
  {
    ...internal('commerceReviews', [
      text('buyer', { required: true }),
      text('order', { required: true }),
      text('product', { required: true, index: true }),
      text('artist', { required: true, index: true }),
      text('publicName'),
      { name: 'stars', type: 'number', min: 1, max: 5, required: true },
      text('body'),
      { name: 'hidden', type: 'checkbox', defaultValue: false },
      json('history'),
    ]),
    indexes: [{ fields: ['buyer', 'order', 'product'], unique: true }],
  },
  {
    ...internal('commerceReviewReports', [
      text('review', { required: true, index: true }),
      text('reporter', { required: true }),
      text('reason'),
    ]),
    indexes: [{ fields: ['review', 'reporter'], unique: true }],
  },
  internal(
    'commerceJournal',
    [
      text('reference', { required: true, unique: true }),
      text('artist', { index: true }),
      text('order', { index: true }),
      text('kind', { required: true }),
      json('postings'),
      json('evidence'),
    ],
    true,
  ),
  internal('commerceLocks', [
    text('key', { unique: true, required: true }),
    { name: 'revision', type: 'number', defaultValue: 0 },
  ]),
  internal('commerceEvents', [
    text('reference', { unique: true, required: true }),
    text('channel'),
    state(['pending', 'processed', 'failed']),
    json('body'),
    text('error'),
  ]),
  internal('commercePayouts', [
    text('reference', { required: true, unique: true }),
    text('artist', { index: true }),
    text('cycle'),
    money('amount'),
    money('feeReserve'),
    money('actualFee'),
    json('orders'),
    json('bankSnapshot'),
    text('providerID'),
    text('cashReconciledAt'),
    text('providerTransactionID'),
    text('providerState'),
    state([
      'reserved',
      'submitting',
      'unknown',
      'pending_approval',
      'pending',
      'paid',
      'failed',
      'cancelled',
    ]),
    text('error'),
  ]),
  internal('commerceBanks', [
    text('artist', { unique: true, required: true }),
    text('encryptedDetails', { access: { read: () => false } }),
    text('lastFour'),
    text('revision'),
    state(['unverified', 'verified']),
    text('verifiedBy'),
    text('verificationEvidence'),
  ]),
  internal('commerceShipments', [
    text('reference', { required: true, unique: true }),
    text('order', { index: true }),
    text('artist', { index: true }),
    text('carrier'),
    text('guide'),
    json('allocations'),
    state(['registered', 'in_transit', 'exception', 'delivered', 'returned']),
    text('deliveredAt'),
    text('verifiedAt'),
    text('verifiedBy'),
    text('verificationEvidence'),
    text('lastCheckedAt'),
    text('nextCheckAt', { index: true }),
    { name: 'failures', type: 'number', defaultValue: 0 },
    text('error'),
    text('source'),
    text('estimatedDeliveryAt'),
    json('history'),
  ]),
  internal('commerceCases', [
    text('reference', { unique: true, required: true }),
    text('order', { index: true }),
    text('artist', { index: true }),
    text('buyer'),
    money('amount'),
    json('allocations'),
    state(['open', 'awaiting_seller', 'escalated', 'refund_pending', 'resolved', 'dismissed']),
    json('messages'),
    text('respondBy'),
    text('decision'),
    text('decidedBy'),
    { name: 'sellerFault', type: 'checkbox', defaultValue: false },
  ]),
  internal('commerceRefunds', [
    text('reference', { unique: true, required: true }),
    text('order', { index: true }),
    text('caseID'),
    text('artist'),
    money('amount'),
    state([
      'reserved',
      'submitting',
      'unknown',
      'pending',
      'manual_required',
      'completed',
      'failed',
    ]),
    text('method'),
    text('providerID'),
    json('request'),
    text('evidence'),
    text('error'),
  ]),
  internal(
    'commerceIncidents',
    [
      text('reference', { unique: true, required: true }),
      text('order'),
      text('artist', { index: true }),
      text('caseID'),
      text('reason'),
      text('decidedBy'),
    ],
    true,
  ),
  internal(
    'commerceAudits',
    [
      text('reference', { unique: true, required: true }),
      text('actor'),
      text('action'),
      json('details'),
    ],
    true,
  ),
  internal('commerceAttachments', [
    text('caseID', { index: true }),
    text('name'),
    text('mime'),
    text('encryptedContent', { access: { read: () => false } }),
  ]),
  internal('commerceGuestAccess', [
    text('order', { index: true }),
    text('tokenHash', { unique: true }),
    text('expiresAt'),
    text('lastRequestedAt'),
  ]),
  internal('commerceTasks', [
    text('reference', { unique: true, required: true }),
    text('kind'),
    json('data'),
    text('dueAt', { index: true }),
    text('leaseUntil'),
    text('leaseToken'),
    { name: 'attempts', type: 'number', defaultValue: 0 },
    state(['pending', 'running', 'completed', 'failed']),
    text('error'),
  ]),
  internal('commerceCarriers', [
    text('code', { unique: true, required: true }),
    text('name'),
    text('officialURL'),
    { name: 'apiEnabled', type: 'checkbox', defaultValue: false },
    { name: 'scrapingEnabled', type: 'checkbox', defaultValue: false },
    json('assessment'),
    json('apiConfig'),
    json('scrapingConfig'),
  ]),
]

export const CommerceSettings: GlobalConfig = {
  slug: 'commerceSettings',
  label: 'Configuración de comercio',
  access: { read: admin, update: admin },
  fields: [
    { name: 'chargesEnabled', type: 'checkbox', defaultValue: false },
    { name: 'payoutsEnabled', type: 'checkbox', defaultValue: false },
    { name: 'productionApproved', type: 'checkbox', defaultValue: false },
    { name: 'commissionConfirmed', type: 'checkbox', defaultValue: false },
    {
      name: 'commissionPercent',
      type: 'number',
      min: 0,
      max: 99,
      defaultValue: 12,
      required: true,
    },
    {
      name: 'payoutWeekday',
      type: 'select',
      options: ['0', '1', '2', '3', '4', '5', '6'],
      defaultValue: '3',
    },
    { name: 'payoutHour', type: 'number', min: 0, max: 23, defaultValue: 9 },
    { name: 'automaticPayoutsApproved', type: 'checkbox', defaultValue: false },
    { name: 'refundsEnabled', type: 'checkbox', defaultValue: false },
    { name: 'reconciliationBlocked', type: 'checkbox', defaultValue: true },
    money('ownRefundFundsInCents'),
    money('ownPayoutFundsInCents'),
    money('payoutFeeReserveInCents'),
    money('observedAvailableInCents'),
    text('balanceEvidence'),
    text('balanceObservedAt'),
    json('holidays'),
  ],
}
