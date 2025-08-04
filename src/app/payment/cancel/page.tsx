/**
 * Payment Cancel Page
 * Displayed when user cancels payment or payment fails
 */

import Link from 'next/link'
import { XCircle, ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react'

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Cancel Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Cancelled
          </h1>
          <p className="text-gray-600">
            Your payment was cancelled or could not be processed. No charges were made to your account.
          </p>
        </div>

        {/* Information Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">What happened?</h2>
          
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
              <p>You cancelled the payment process</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
              <p>Your payment method was declined</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
              <p>There was a technical issue during processing</p>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-4 pt-4">
            <p className="text-sm text-gray-600">
              Don&apos;t worry! Your items are still available and you can try purchasing again.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/products"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Link>
          
          <Link
            href="/"
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-1">
                Need help with payment?
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                If you&apos;re having trouble completing your purchase, our support team is here to help.
              </p>
              <Link
                href="/support"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Contact Support →
              </Link>
            </div>
          </div>
        </div>

        {/* Payment Methods Info */}
        <div className="text-center mt-8 text-xs text-gray-500">
          <p>We accept all major credit cards and PayPal</p>
          <p className="mt-1">Payments are processed securely by Stripe</p>
        </div>
      </div>
    </div>
  )
}
