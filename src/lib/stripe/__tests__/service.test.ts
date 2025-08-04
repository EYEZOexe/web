import { describe, it, expect } from 'vitest'
import { formatPrice, formatPriceForStripe } from '../../utils/price'

describe('Stripe Service', () => {
  describe('formatPrice', () => {
    it('formats prices correctly for USD', () => {
      expect(formatPrice(2999, 'USD')).toBe('$29.99')
      expect(formatPrice(1000, 'USD')).toBe('$10.00')
      expect(formatPrice(1, 'USD')).toBe('$0.01')
      expect(formatPrice(0, 'USD')).toBe('$0.00')
    })

    it('handles large amounts', () => {
      expect(formatPrice(100000, 'USD')).toBe('$1,000.00')
      expect(formatPrice(1234567, 'USD')).toBe('$12,345.67')
    })

    it('handles different currencies', () => {
      expect(formatPrice(2999, 'EUR')).toBe('€29.99')
      expect(formatPrice(2999, 'GBP')).toBe('£29.99')
    })

    it('handles string prices', () => {
      expect(formatPrice('2999', 'USD')).toBe('$29.99')
      expect(formatPrice('1000', 'USD')).toBe('$10.00')
    })

    it('defaults to USD when currency is not provided', () => {
      expect(formatPrice(2999)).toBe('$29.99')
    })

    it('handles invalid inputs gracefully', () => {
      expect(formatPrice(NaN, 'USD')).toBe('$0.00')
      expect(formatPrice(null as any, 'USD')).toBe('$0.00')
      expect(formatPrice(undefined as any, 'USD')).toBe('$0.00')
    })
  })

  describe('formatPriceForStripe', () => {
    it('converts dollars to cents', () => {
      expect(formatPriceForStripe(29.99)).toBe(2999)
      expect(formatPriceForStripe(10)).toBe(1000)
      expect(formatPriceForStripe(0.01)).toBe(1)
    })

    it('handles string inputs', () => {
      expect(formatPriceForStripe('29.99')).toBe(2999)
      expect(formatPriceForStripe('10')).toBe(1000)
    })

    it('handles invalid inputs', () => {
      expect(formatPriceForStripe(NaN)).toBe(0)
      expect(formatPriceForStripe('invalid')).toBe(0)
    })

    it('rounds to nearest cent', () => {
      expect(formatPriceForStripe(29.995)).toBe(3000)
      expect(formatPriceForStripe(29.994)).toBe(2999)
    })
  })
})
