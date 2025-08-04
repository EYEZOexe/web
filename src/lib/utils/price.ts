/**
 * Format price from cents to display string
 */
export function formatPrice(cents: number | string, currency: string = 'USD'): string {
  const amount = typeof cents === 'string' ? parseInt(cents, 10) : cents
  
  if (isNaN(amount) || amount == null) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(0)
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100)
}

/**
 * Convert display price to cents for Stripe
 */
export function formatPriceForStripe(price: number | string): number {
  const amount = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(amount)) return 0
  return Math.round(amount * 100)
}
