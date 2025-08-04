"use client"

import { useQuery } from "@apollo/client"
import { TEST_CONNECTION } from "@/lib/queries"

export default function ApolloTestComponent() {
  const { data, loading, error } = useQuery(TEST_CONNECTION, {
    errorPolicy: 'all',
  })

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="font-semibold text-gray-900 mb-2">Apollo Client Test</h3>
      
      {loading && <p className="text-blue-600">Loading...</p>}
      
      {error && (
        <div className="text-red-600">
          <p className="font-medium">Error:</p>
          <pre className="text-xs bg-red-50 p-2 rounded mt-1 overflow-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      )}
      
      {data && (
        <div className="text-green-600">
          <p className="font-medium">Success!</p>
          <pre className="text-xs bg-green-50 p-2 rounded mt-1 overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
