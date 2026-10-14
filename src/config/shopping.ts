/**
 * Global storefront switch.
 *
 * Shopping is fail-closed: it is enabled only when `SHOPPING_ENABLED=true`.
 * Restart the app after changing the variable.
 */
export function isShoppingEnabled(): boolean {
  return process.env.SHOPPING_ENABLED?.trim().toLowerCase() === 'true'
}
