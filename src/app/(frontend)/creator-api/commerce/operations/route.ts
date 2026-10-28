import { handleCommerce } from '@/commerce/http'
export const dynamic = 'force-dynamic'
export const GET = (request: Request) => handleCommerce(request)
export const POST = (request: Request) => handleCommerce(request)
