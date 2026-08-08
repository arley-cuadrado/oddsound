import type { CollectionConfig } from 'payload'

type OverrideArgs = {
  defaultCollection: CollectionConfig
}

export function extendEcommerceCartsCollection({ defaultCollection }: OverrideArgs): CollectionConfig {
  return {
    ...defaultCollection,
    admin: {
      ...(defaultCollection.admin || {}),
      defaultColumns: ['customer', 'status', 'subtotal', 'updatedAt'],
      useAsTitle: 'customer',
    },
  }
}

export function extendEcommerceOrdersCollection({ defaultCollection }: OverrideArgs): CollectionConfig {
  return {
    ...defaultCollection,
    admin: {
      ...(defaultCollection.admin || {}),
      defaultColumns: ['customerEmail', 'status', 'amount', 'updatedAt'],
      useAsTitle: 'customerEmail',
    },
    fields: [
      ...defaultCollection.fields,
      {
        name: 'artistProfile',
        type: 'relationship',
        relationTo: 'profiles',
        admin: {
          position: 'sidebar',
        },
      },
      {
        name: 'sellerPaymentAccount',
        type: 'relationship',
        relationTo: 'seller-payment-accounts',
        admin: {
          position: 'sidebar',
        },
      },
      {
        name: 'paymentProvider',
        type: 'select',
        defaultValue: 'mercadopago',
        options: [{ label: 'Mercado Pago', value: 'mercadopago' }],
      },
      {
        name: 'splitMode',
        type: 'select',
        defaultValue: 'marketplace_split_1_1',
        options: [{ label: 'Marketplace split 1:1', value: 'marketplace_split_1_1' }],
      },
      {
        name: 'settlementCurrencyCode',
        type: 'select',
        defaultValue: 'COP',
        options: [{ label: 'COP', value: 'COP' }],
      },
      {
        name: 'subtotalCOP',
        type: 'number',
      },
      {
        name: 'shippingAmountCOP',
        type: 'number',
      },
      {
        name: 'platformFeeAmountCOP',
        type: 'number',
      },
      {
        name: 'processorFeeAmountCOP',
        type: 'number',
      },
      {
        name: 'artistNetAmountCOP',
        type: 'number',
      },
      {
        name: 'paymentProviderOrderId',
        type: 'text',
      },
      {
        name: 'paymentProviderPaymentId',
        type: 'text',
      },
      {
        name: 'shippingZoneCode',
        type: 'text',
      },
      {
        name: 'fulfillmentStatus',
        type: 'select',
        defaultValue: 'pending_payment',
        options: [
          { label: 'Pending payment', value: 'pending_payment' },
          { label: 'Ready to ship', value: 'ready_to_ship' },
          { label: 'Shipped', value: 'shipped' },
          { label: 'Delivered', value: 'delivered' },
          { label: 'Not required', value: 'not_required' },
          { label: 'Cancelled', value: 'cancelled' },
          { label: 'Refunded', value: 'refunded' },
        ],
      },
      {
        name: 'carrierName',
        type: 'text',
      },
      {
        name: 'trackingNumber',
        type: 'text',
      },
    ],
  }
}

export function extendEcommerceTransactionsCollection({ defaultCollection }: OverrideArgs): CollectionConfig {
  return {
    ...defaultCollection,
    admin: {
      ...(defaultCollection.admin || {}),
      defaultColumns: ['customerEmail', 'status', 'amount', 'updatedAt'],
      useAsTitle: 'customerEmail',
    },
    fields: [
      ...defaultCollection.fields,
      {
        name: 'artistProfile',
        type: 'relationship',
        relationTo: 'profiles',
        admin: {
          position: 'sidebar',
        },
      },
      {
        name: 'sellerPaymentAccount',
        type: 'relationship',
        relationTo: 'seller-payment-accounts',
        admin: {
          position: 'sidebar',
        },
      },
      {
        name: 'paymentProvider',
        type: 'select',
        defaultValue: 'mercadopago',
        options: [{ label: 'Mercado Pago', value: 'mercadopago' }],
      },
      {
        name: 'settlementCurrencyCode',
        type: 'select',
        defaultValue: 'COP',
        options: [{ label: 'COP', value: 'COP' }],
      },
      {
        name: 'providerEventType',
        type: 'text',
      },
      {
        name: 'providerEventId',
        type: 'text',
      },
      {
        name: 'paymentProviderPaymentId',
        type: 'text',
      },
      {
        name: 'platformFeeAmountCOP',
        type: 'number',
      },
      {
        name: 'processorFeeAmountCOP',
        type: 'number',
      },
      {
        name: 'artistNetAmountCOP',
        type: 'number',
      },
      {
        name: 'refundAmountCOP',
        type: 'number',
      },
      {
        name: 'chargebackAmountCOP',
        type: 'number',
      },
    ],
  }
}
