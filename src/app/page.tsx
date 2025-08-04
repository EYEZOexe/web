"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@repo/ui"

export default function Home() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Digital Products Platform</h1>
        <div className="flex items-center space-x-4">
          {session ? (
            <>
              <span className="text-sm text-gray-600">
                Welcome, {session.user?.name || session.user?.email}
              </span>
              <Button
                variant="outline"
                onClick={() => signOut()}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <div className="space-x-2">
              <Link href="/auth/signin">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        <section className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Secure Digital Product Marketplace
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Buy and sell digital products with confidence. 
            Powered by Next.js, KeystoneJS, and NextAuth.js
          </p>
          
          {!session && (
            <div className="space-x-4">
              <Link href="/auth/signup">
                <Button size="lg">Get Started</Button>
              </Link>
              <Link href="/auth/signin">
                <Button variant="outline" size="lg">Learn More</Button>
              </Link>
            </div>
          )}
        </section>

        {session && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Browse Products</h3>
              <p className="text-gray-600 mb-4">
                Discover amazing digital products from creators worldwide.
              </p>
              <Button>Browse Now</Button>
            </div>
            
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Sell Your Products</h3>
              <p className="text-gray-600 mb-4">
                Start selling your digital creations and earn revenue.
              </p>
              <Button>Start Selling</Button>
            </div>
            
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Manage Orders</h3>
              <p className="text-gray-600 mb-4">
                Track your purchases and downloads in one place.
              </p>
              <Button>View Orders</Button>
            </div>
          </section>
        )}

        <section className="bg-gray-50 p-8 rounded-lg">
          <h3 className="text-2xl font-semibold mb-4">Platform Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">🔐 Secure Authentication</h4>
              <p className="text-gray-600">
                Multiple sign-in options with NextAuth.js including Google, GitHub, and email/password.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">💳 Stripe Integration</h4>
              <p className="text-gray-600">
                Secure payments powered by Stripe with automatic license generation.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">📁 File Management</h4>
              <p className="text-gray-600">
                Secure file uploads and downloads with access control.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🎯 Admin Dashboard</h4>
              <p className="text-gray-600">
                Powerful KeystoneJS admin interface for content management.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
