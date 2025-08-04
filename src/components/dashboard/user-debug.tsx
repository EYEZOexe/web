"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@apollo/client"
import { gql } from "@apollo/client"
import { Card } from "@repo/ui"

const GET_ALL_USERS = gql`
  query GetAllUsers {
    users {
      id
      name
      email
      role
      isActive
      createdAt
    }
  }
`

export default function UserDebugComponent() {
  const { data: session } = useSession()
  const { data: usersData, loading, error } = useQuery(GET_ALL_USERS)

  if (!session) return null

  return (
    <Card className="p-4 mt-4 bg-yellow-50 border-yellow-200">
      <h3 className="font-semibold text-yellow-800 mb-2">🔧 Debug Info</h3>
      <div className="text-sm text-yellow-700 space-y-1">
        <p><strong>Session User ID:</strong> {session.user?.id || 'undefined'}</p>
        <p><strong>Session Email:</strong> {session.user?.email}</p>
        <p><strong>Session Name:</strong> {session.user?.name}</p>
        <p><strong>Session Role:</strong> {session.user?.role}</p>
        
        {loading && <p>Loading users from KeystoneJS...</p>}
        {error && <p className="text-red-600">GraphQL Error: {error.message}</p>}
        
        {usersData?.users && (
          <div>
            <p><strong>KeystoneJS Users ({usersData.users.length}):</strong></p>
            <ul className="ml-4 text-xs">
              {usersData.users.slice(0, 5).map((user: any) => (
                <li key={user.id}>
                  {user.id} - {user.email} ({user.role})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}
