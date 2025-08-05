// Temporary route to fix unlinked licenses - can be removed after fixing
'use client'

import OrderLicenseDebug from '@/components/debug/order-license-debug'

export default function FixLicensesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Fix Unlinked Licenses</h1>
      <p className="text-gray-600 mb-8">
        This page helps link existing licenses to user accounts when the emails match.
        After fixing, this page can be removed.
      </p>
      <OrderLicenseDebug />
    </div>
  )
}
