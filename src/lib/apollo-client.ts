import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'

// Safe environment access for both server and client
const getApiUrl = () => {
  // On client-side, use the public env var directly
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  }
  
  // On server-side, try to import env but fallback gracefully
  try {
    const { env } = require('./env')
    return env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  } catch {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  }
}

// Create HTTP link to Keystone GraphQL endpoint
const httpLink = createHttpLink({
  uri: `${getApiUrl()}/api/graphql`,
})

// Create auth link to include session token if available
const authLink = setContext((_, { headers }) => {
  // In the future, we'll add session token handling here
  return {
    headers: {
      ...headers,
    },
  }
})

// Create Apollo Client instance
export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  // Only enable SSR for server-side
  ssrMode: typeof window === 'undefined',
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      errorPolicy: 'all',
    },
  },
})

// Export types for use in components
export type { ApolloClient } from '@apollo/client'
