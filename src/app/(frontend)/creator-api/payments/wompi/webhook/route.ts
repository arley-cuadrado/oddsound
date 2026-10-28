import { wompiWebhook } from '@/commerce/webhooks'
export const POST = (request: Request) => wompiWebhook(request, 'charges')
