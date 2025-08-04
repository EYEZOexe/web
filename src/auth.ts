import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"

// Validation schema for credentials
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  // For now, we'll use the default session strategy without database adapter
  // In production, you might want to add the Prisma adapter
  providers: [
    // Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    
    // GitHub OAuth
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    
    // Credentials (email/password) - integrates with KeystoneJS
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          // Validate input
          const validatedCredentials = credentialsSchema.parse(credentials)
          
          // Check against KeystoneJS API
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/graphql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `
                mutation AuthenticateUser($email: String!, $password: String!) {
                  authenticateUserWithPassword(email: $email, password: $password) {
                    ... on UserAuthenticationWithPasswordSuccess {
                      item {
                        id
                        name
                        email
                        role
                        isActive
                      }
                    }
                    ... on UserAuthenticationWithPasswordFailure {
                      message
                    }
                  }
                }
              `,
              variables: {
                email: validatedCredentials.email,
                password: validatedCredentials.password,
              },
            }),
          })

          const result = await response.json()
          
          if (result.data?.authenticateUserWithPassword?.item) {
            const user = result.data.authenticateUserWithPassword.item
            
            // Only allow active users
            if (!user.isActive) {
              throw new Error("Account is inactive")
            }
            
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            }
          }
          
          return null
        } catch (error) {
          console.error("Authentication error:", error)
          return null
        }
      }
    })
  ],
  
  callbacks: {
    async jwt({ token, user }) {
      // Add role to token on sign in
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    
    async session({ session, token }) {
      // Add role to session
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
    
    async signIn({ user, account }) {
      // For OAuth providers, sync with KeystoneJS User
      if (account?.provider === "google" || account?.provider === "github") {
        try {
          // Check if user exists in KeystoneJS, create if not
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/graphql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `
                query GetUser($email: String!) {
                  users(where: { email: { equals: $email } }) {
                    id
                    isActive
                  }
                }
              `,
              variables: {
                email: user.email,
              },
            }),
          })

          const result = await response.json()
          const existingUser = result.data?.users?.[0]
          
          if (existingUser) {
            // Check if user is active
            return existingUser.isActive
          } else {
            // Create new user in KeystoneJS
            const createResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/graphql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                query: `
                  mutation CreateUser($data: UserCreateInput!) {
                    createUser(data: $data) {
                      id
                    }
                  }
                `,
                variables: {
                  data: {
                    name: user.name || user.email?.split('@')[0] || 'User',
                    email: user.email,
                    role: 'customer',
                    isActive: true,
                  },
                },
              }),
            })
            
            const createResult = await createResponse.json()
            return !!createResult.data?.createUser
          }
        } catch (error) {
          console.error("Error syncing user with KeystoneJS:", error)
          return false
        }
      }
      
      return true
    },
  },
  
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  
  session: {
    strategy: "jwt",
  },
  
  debug: process.env.NODE_ENV === "development",
})
