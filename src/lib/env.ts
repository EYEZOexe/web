import { z } from 'zod'

// Client-safe environment variables (NEXT_PUBLIC_*)
const clientSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
})

// Server-only environment variables
const serverSchema = z.object({
  // Authentication (Required)
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),

  // OAuth Providers (Optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Stripe (Optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // External Services (Optional)
  SENTRY_DSN: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),

  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

// Combined schema for server-side validation
const envSchema = serverSchema.merge(clientSchema)

// Validate and parse environment variables
function validateEnv() {
  try {
    const env = envSchema.parse(process.env)
    return env
  } catch (error) {
    console.error('❌ Invalid environment variables:')
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`)
      })
    }
    // Only exit on server-side, throw on client-side
    if (typeof window === 'undefined') {
      process.exit(1)
    } else {
      throw new Error('Environment validation failed')
    }
  }
}

// Client-safe environment for browser
export function getClientEnv() {
  const clientEnv = clientSchema.parse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  })
  return clientEnv
}

// Validated environment variables (server-side only)
// Only validate on server-side to avoid client-side issues
export const env = typeof window === 'undefined' ? validateEnv() : {} as z.infer<typeof envSchema>

// Type exports
export type Env = z.infer<typeof envSchema>
export type ClientEnv = z.infer<typeof clientSchema>
