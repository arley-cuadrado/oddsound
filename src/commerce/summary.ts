import type { Payload } from 'payload'
import { model } from './store'

/** Full-scope aggregates; never derive balances from a paginated list. All amounts are cents. */
export async function commerceSummary(payload: Payload, scope: Record<string, unknown>) {
  const match = { ...scope }
  for (const key of ['_id', 'artistProfile', 'customer'])
    if (typeof match[key] === 'string' && /^[a-f0-9]{24}$/i.test(match[key] as string))
      match[key] = model(payload, 'orders').db.base.Types.ObjectId.createFromHexString(
        match[key] as string,
      )
  const result = await model(payload, 'orders').aggregate([
    { $match: { ...match, paymentProvider: 'wompi', 'finance.paidAt': { $exists: true } } },
    {
      $facet: {
        sales: [
          {
            $group: {
              _id: null,
              units: { $sum: { $sum: '$finance.items.quantity' } },
              sales: { $sum: '$finance.subtotal' },
              unreconciled: {
                $sum: { $cond: [{ $ifNull: ['$finance.reconciledAt', false] }, 0, 1] },
              },
            },
          },
        ],
        buckets: [
          {
            $lookup: {
              from: model(payload, 'commerceJournal').collection.name,
              let: { oid: { $toString: '$_id' } },
              pipeline: [
                { $match: { $expr: { $eq: ['$order', '$$oid'] } } },
                { $unwind: '$postings' },
                {
                  $match: {
                    'postings.account': {
                      $regex:
                        '^(artist:[^:]+:order:[^:]+:(pending|held|available|in_transit|paid)|oddsound:commission:[^:]+|wompi:processing-cost|buyers:refunded)$',
                    },
                  },
                },
                {
                  $group: {
                    _id: {
                      $switch: {
                        branches: [
                          {
                            case: {
                              $regexMatch: { input: '$postings.account', regex: '^artist:' },
                            },
                            then: { $arrayElemAt: [{ $split: ['$postings.account', ':'] }, -1] },
                          },
                          {
                            case: {
                              $regexMatch: {
                                input: '$postings.account',
                                regex: '^oddsound:commission:',
                              },
                            },
                            then: 'commission',
                          },
                          {
                            case: { $eq: ['$postings.account', 'wompi:processing-cost'] },
                            then: 'processorCost',
                          },
                        ],
                        default: 'refunds',
                      },
                    },
                    amount: { $sum: '$postings.amount' },
                  },
                },
              ],
              as: 'ledger',
            },
          },
          { $unwind: '$ledger' },
          { $group: { _id: '$ledger._id', amount: { $sum: '$ledger.amount' } } },
        ],
      },
    },
  ])
  const { _id: _ignored, ...sales } = result[0]?.sales[0] || {
    units: 0,
    sales: 0,
    commission: 0,
    processorCost: 0,
    refunds: 0,
    unreconciled: 0,
  }
  return {
    ...sales,
    ...Object.fromEntries(
      ['commission', 'processorCost', 'refunds'].map((key) => [
        key,
        result[0]?.buckets.find((b: any) => b._id === key)?.amount || 0,
      ]),
    ),
    buckets: Object.fromEntries(
      ['pending', 'held', 'available', 'in_transit', 'paid'].map((key) => [
        key,
        result[0]?.buckets.find((b: any) => b._id === key)?.amount || 0,
      ]),
    ),
  }
}
