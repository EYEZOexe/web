"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navigation = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: "📊",
    description: "Dashboard overview and statistics"
  },
  {
    name: "My Library",
    href: "/dashboard/library",
    icon: "📚",
    description: "Access your purchased products"
  },
  {
    name: "Orders",
    href: "/dashboard/orders",
    icon: "🛍️", 
    description: "View order history and status"
  },
  {
    name: "Downloads",
    href: "/dashboard/downloads",
    icon: "⬇️",
    description: "Download history and files"
  },
  {
    name: "Account",
    href: "/dashboard/account",
    icon: "⚙️",
    description: "Manage your account settings"
  },
]

export default function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-2">
      <div className="pb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Dashboard</h2>
      </div>
      
      {navigation.map((item) => {
        const isActive = pathname === item.href || 
          (item.href !== "/dashboard" && pathname.startsWith(item.href))
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center space-x-3 p-3 rounded-lg transition-colors",
              isActive
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <span className="text-lg">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{item.name}</div>
              <div className="text-xs text-gray-500 truncate">{item.description}</div>
            </div>
          </Link>
        )
      })}
      
      <div className="pt-6 mt-6 border-t border-gray-200">
        <Link
          href="/products"
          className="flex items-center space-x-3 p-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
        >
          <span className="text-lg">🛒</span>
          <div>
            <div className="text-sm font-medium">Browse Products</div>
            <div className="text-xs text-gray-500">Discover new products</div>
          </div>
        </Link>
      </div>
    </nav>
  )
}
