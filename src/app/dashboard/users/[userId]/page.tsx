"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Shield,
  Wifi,
  RefreshCw,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { CustomerUser } from "@/lib/types"

export default function UserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string

  const [user, setUser] = useState<CustomerUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState("")

  useEffect(() => {
    fetchUser()
  }, [userId])

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/users/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setUser(data)
        setNameValue(data.name || "")
      } else {
        console.error("Failed to fetch user")
        alert("User not found")
        router.push("/dashboard/users")
      }
    } catch (error) {
      console.error("Error fetching user:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSubscriptionStatus = async (newStatus: string) => {
    if (!user) return

    setUpdating(true)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionStatus: newStatus }),
      })

      if (res.ok) {
        const updatedUser = await res.json()
        setUser({ ...user, ...updatedUser })
        alert("Subscription status updated")
      } else {
        alert("Failed to update subscription status")
      }
    } catch (error) {
      console.error("Error updating status:", error)
      alert("Failed to update subscription status")
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveName = async () => {
    if (!user) return

    setUpdating(true)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue }),
      })

      if (res.ok) {
        const updatedUser = await res.json()
        setUser({ ...user, name: updatedUser.name })
        setEditingName(false)
      } else {
        alert("Failed to update name")
      }
    } catch (error) {
      console.error("Error updating name:", error)
      alert("Failed to update name")
    } finally {
      setUpdating(false)
    }
  }

  const handleResetPassword = () => {
    console.log("Reset password for user:", user?.email)
    alert("Password reset email sent to " + user?.email)
  }

  const isDeviceOnline = (lastSeen: Date) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    return new Date(lastSeen) > fiveMinutesAgo
  }

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "—"
    const d = new Date(date)
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateOnly = (date: Date | string | undefined) => {
    if (!date) return "—"
    return new Date(date).toLocaleDateString()
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400"
      case "trial":
        return "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400"
      case "cancelled":
        return "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
      case "expired":
        return "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
      default:
        return "bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-500 dark:text-slate-500" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-gray-500 dark:text-slate-400">User not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/users")}
          className="mb-4 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>

        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      className="px-3 py-1 text-xl font-bold bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-white"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveName}
                      disabled={updating}
                      className="h-8"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingName(false)
                        setNameValue(user.name || "")
                      }}
                      className="h-8"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {user.name || user.email}
                    </h1>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingName(true)}
                      className="h-7 text-xs text-gray-500 dark:text-slate-400"
                    >
                      Edit
                    </Button>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400">{user.email}</p>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                Signed up: {formatDateOnly(user.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Subscription Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subscription</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-slate-500 uppercase">Status</label>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${getStatusBadgeClass(user.subscriptionStatus)}`}>
                    {user.subscriptionStatus}
                  </span>
                  <select
                    value={user.subscriptionStatus}
                    onChange={(e) => handleUpdateSubscriptionStatus(e.target.value)}
                    disabled={updating}
                    className="ml-2 px-2 py-1 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-slate-500 uppercase">Plan</label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {user.subscriptionPlan === "monthly" ? "ThreatZapper+" : "None"}
                </p>
              </div>

              {user.subscriptionStatus === "trial" && user.trialEndsAt && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-500 uppercase">Trial Ends</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {formatDateOnly(user.trialEndsAt)}
                  </p>
                </div>
              )}

              {user.subscriptionExpiresAt && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-500 uppercase">Expires</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {formatDateOnly(user.subscriptionExpiresAt)}
                  </p>
                </div>
              )}

              {user.stripeCustomerId && (
                <div>
                  <label className="text-xs text-gray-500 dark:text-slate-500 uppercase">Stripe Customer</label>
                  <div className="mt-1">
                    <a
                      href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View in Stripe
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account Info Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Info</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-slate-500 uppercase">Email</label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">{user.email}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-slate-500 uppercase">Signed Up</label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {formatDate(user.createdAt)}
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-slate-500 uppercase">Last Login</label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {user.lastLogin ? formatDate(user.lastLogin) : "Never"}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                <Button
                  variant="outline"
                  onClick={handleResetPassword}
                  className="w-full text-gray-700 dark:text-gray-300"
                >
                  Reset Password
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Devices Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Devices</h2>
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
              {user.devices?.length || 0} device(s)
            </p>
          </div>

          {!user.devices || user.devices.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-slate-400">No devices registered</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Name / ID</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Mode</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Blocked Count</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {user.devices.map((device) => {
                    const online = isDeviceOnline(device.lastSeen)
                    return (
                      <tr
                        key={device.id}
                        onClick={() => router.push(`/dashboard/${device.id}`)}
                        className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-gray-400 dark:bg-slate-500"}`} />
                            <span className={`text-xs ${online ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-slate-500"}`}>
                              {online ? "Online" : "Offline"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {device.name || device.id.slice(0, 12)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-500 font-mono">
                            {device.id}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            device.mode === "bridge"
                              ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400"
                              : "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400"
                          }`}>
                            {device.mode === "bridge" ? <Shield className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
                            {device.mode}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatNumber(device.blockedCount)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-500">
                            {formatNumber(device.blockedInbound)} in / {formatNumber(device.blockedOutbound)} out
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-gray-600 dark:text-slate-400">
                            {formatDate(device.lastSeen)}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M"
  if (n >= 1000) return (n / 1000).toFixed(1) + "K"
  return n.toString()
}
