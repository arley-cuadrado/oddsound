import { HeaderClient } from './Component.client'
import { isShoppingEnabled } from '@/config/shopping'
import { getCachedGlobal } from '@/utilities/getGlobals'
import React from 'react'

export async function Header() {
  const headerData = await getCachedGlobal('header', 1)()

  return <HeaderClient data={headerData} shoppingEnabled={isShoppingEnabled()} />
}
