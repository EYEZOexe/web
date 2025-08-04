"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@apollo/client"
import { GET_USER_PROFILE } from "@/lib/queries"
import { formatDate } from "@/lib/utils"
import { Button, Card } from "@repo/ui"
import { signOut } from "next-auth/react"
import { useState } from "react"
import Image from "next/image"

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  bio?: string
  avatar?: {
    id: string
    filesize: number
    width: number
    height: number
    extension: string
    url: string
  }
  createdAt: string
  updatedAt: string
}

export default function AccountPage() {
  const { data: session } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
  })
  
  const { data, loading, error } = useQuery(GET_USER_PROFILE, {
    variables: { userId: session?.user?.id },
    skip: !session?.user?.id,
    errorPolicy: 'all', // Show partial data even with errors
    onCompleted: (data) => {
      if (data?.user) {
        setFormData({
          name: data.user.name || '',
          bio: data.user.bio || '',
        })
      }
    },
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    console.error("Account profile query error:", error)
    // Still show the account page with session data as fallback
  }

  // Use session data as fallback if GraphQL data is not available
  const user: UserProfile = data?.user || {
    id: session?.user?.id || '',
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    role: session?.user?.role || 'customer',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const handleSave = async () => {
    // TODO: Implement user profile update mutation
    console.log('Saving profile:', formData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
      })
    }
    setIsEditing(false)
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your profile and account preferences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Information */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
              {!isEditing ? (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              ) : (
                <div className="space-x-2">
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    Save Changes
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                  {user?.avatar?.url ? (
                    <Image
                      src={user.avatar.url}
                      alt={user.name}
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl text-gray-500">
                      {user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                {isEditing && (
                  <div>
                    <Button variant="outline" size="sm">
                      Change Avatar
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">
                      Upload a new profile picture
                    </p>
                  </div>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{user?.name || 'Not provided'}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <p className="text-gray-900">{user?.email}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed from this interface
                </p>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <p className="text-gray-900">{user?.bio || 'No bio provided'}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                  user?.role === 'admin' || user?.role === 'super_admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {user?.role?.replace('_', ' ')?.toUpperCase() || 'CUSTOMER'}
                </span>
              </div>
            </div>
          </Card>

          {/* Security Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Password</h3>
                  <p className="text-sm text-gray-600">
                    Last updated: Never (using OAuth)
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-600">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Enable 2FA
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Connected Accounts</h3>
                  <p className="text-sm text-gray-600">
                    Manage your social login connections
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="p-6 border-red-200 bg-red-50">
            <h2 className="text-xl font-semibold text-red-900 mb-6">Danger Zone</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200">
                <div>
                  <h3 className="font-medium text-red-900">Sign Out</h3>
                  <p className="text-sm text-red-700">
                    Sign out of your account on this device
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200">
                <div>
                  <h3 className="font-medium text-red-900">Delete Account</h3>
                  <p className="text-sm text-red-700">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Delete Account
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Stats */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Stats</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Member since:</span>
                <span className="text-sm font-medium text-gray-900">
                  {user?.createdAt ? formatDate(user.createdAt) : 'Unknown'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Last updated:</span>
                <span className="text-sm font-medium text-gray-900">
                  {user?.updatedAt ? formatDate(user.updatedAt) : 'Unknown'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Account status:</span>
                <span className={`text-sm font-medium ${
                  user?.isActive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {user?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                📧 Contact Support
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                📄 Download Data
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                🔒 Privacy Settings
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                📱 Notification Settings
              </Button>
            </div>
          </Card>

          {/* Help */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="text-center">
              <div className="text-2xl mb-2">❓</div>
              <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
              <p className="text-sm text-blue-800 mb-4">
                Contact our support team if you have any questions about your account.
              </p>
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
