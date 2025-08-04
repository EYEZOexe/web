/**
 * Payment Success Page
 * Displays success message after successful Stripe payment
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { CheckCircle, Download, FileText, Key, ArrowRight } from 'lucide-react'

interface PaymentSuccessPageProps {
  searchParams: Promise<{
    session_id?: string
  }>
}

function SuccessContent({ sessionId }: { sessionId?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600">
            Thank you for your purchase. Your order has been processed successfully.
          </p>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
          
          {sessionId && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Session ID:</span>
                <span className="font-mono text-xs text-gray-900 bg-gray-100 px-2 py-1 rounded">
                  {sessionId}
                </span>
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 mt-4 pt-4">
            <p className="text-sm text-gray-600 mb-4">
              You will receive a confirmation email with your purchase details and access instructions.
            </p>
            
            {/* Quick Access Icons */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Download className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <span className="text-xs text-blue-600 font-medium">Downloads</span>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                <span className="text-xs text-purple-600 font-medium">Content</span>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <Key className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                <span className="text-xs text-orange-600 font-medium">License</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Go to My Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          
          <Link
            href="/products"
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors text-center block"
          >
            Continue Shopping
          </Link>
        </div>

        {/* Support Info */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>
            Need help? <Link href="/support" className="text-blue-600 hover:text-blue-700">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading payment details...</p>
      </div>
    </div>
  )
}

export default async function PaymentSuccessPage({ searchParams }: PaymentSuccessPageProps) {
  const resolvedSearchParams = await searchParams
  const sessionId = resolvedSearchParams.session_id

  return (
    <Suspense fallback={<LoadingState />}>
      <SuccessContent sessionId={sessionId} />
    </Suspense>
  )
}
