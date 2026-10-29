import { handleCommerce } from '@/commerce/http'
export const POST = (request: Request) => handleCommerce(request, 'shipment')
