"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Search,
  RefreshCw,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"

interface User {
  id: string
  email: string
  name: string | null
  subscriptionStatus: string | null
  subscriptionPlan: string | null
  trialEndsAt: string | null
  subscriptionExpiresAt: string | null
  stripeCustomerId: string | null
  lastLogin: string | null
  createdAt: string
  deviceCount: number
}

const USERS_PER_PAGE = 20

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchUsers = async (search?: string) => {
    try {
      setLoading(true)
      const url = search
        ? `/api/users?search=${encodeURIComponent(search)}`
        : "/api/users"
      const res = await fetch(url)
      const data = await res.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers(debouncedSearch)
  }, [debouncedSearch])

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch])

  // Pagination
  const totalPages = Math.ceil(users.length / USERS_PER_PAGE)
  const paginatedUsers = users.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  )

  const formatDate = (date: string | null) => {
    if (!date) return "—"
    const d = new Date(date)
    return d.toLocaleDateString()
  }

  const getStatusBadge = (status: string | null) => {
    if (!status || status === "none") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
          None
        </span>
      )
    }

    const statusConfig: Record<
      string,
      { bg: string; text: string; label: string }
    > = {
      trial: {
        bg: "bg-blue-100 dark:bg-blue-500/20",
        text: "text-blue-800 dark:text-blue-400",
        label: "Trial",
      },
      active: {
        bg: "bg-green-100 dark:bg-green-500/20",
        text: "text-green-800 dark:text-green-400",
        label: "Active",
      },
      expired: {
        bg: "bg-red-100 dark:bg-red-500/20",
        text: "text-red-800 dark:text-red-400",
        label: "Expired",
      },
      cancelled: {
        bg: "bg-gray-100 dark:bg-gray-500/20",
        text: "text-gray-800 dark:text-gray-400",
        label: "Cancelled",
      },
    }

    const config = statusConfig[status] || statusConfig.trial

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Image
                  src="/logo1.png"
                  alt="ThreatZapper"
                  width={180}
                  height={45}
                  className="h-7 w-auto dark:brightness-0 dark:invert"
                />
              </Link>
              <span className="text-gray-300 dark:text-slate-700">|</span>
              <Link
                href="/dashboard"
                className="text-gray-500 dark:text-slate-400 text-sm hover:text-gray-900 dark:hover:text-white"
              >
                Devices
              </Link>
              <span className="text-gray-300 dark:text-slate-700">/</span>
              <span className="text-gray-900 dark:text-white text-sm font-medium">
                Users
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchUsers(debouncedSearch)}
                className="h-8 px-3 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Users List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          {/* Header with Search */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Users
              </h2>
              <span className="text-xs text-gray-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                {users.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-64 pl-8 pr-3 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-gray-500 dark:text-slate-500" />
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Loading users...
              </p>
            </div>
          ) : paginatedUsers.length === 0 ? (
            <div className="p-12 text-center">
              <User className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">
                {users.length === 0 ? "No users found" : "No matching users"}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-500">
                {users.length === 0 &&
                  "Users will appear here once they register"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Devices
                      </th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Signed Up
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {paginatedUsers.map((user) => (
                      <tr
                        key={user.id}
                        onClick={() => router.push(`/dashboard/users/${user.id}`)}
                        className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {user.email}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {user.name || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(user.subscriptionStatus)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {user.deviceCount}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-gray-600 dark:text-slate-400">
                            {formatDate(user.createdAt)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-slate-500">
                    Showing {(currentPage - 1) * USERS_PER_PAGE + 1}-
                    {Math.min(currentPage * USERS_PER_PAGE, users.length)} of{" "}
                    {users.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="h-7 w-7 p-0 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-gray-500 dark:text-slate-400 px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="h-7 w-7 p-0 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
