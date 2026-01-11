"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Shield,
  Users,
  Server,
  Activity,
  RefreshCw,
  LogOut,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"

interface Stats {
  totalUsers: number
  activeSubscriptions: number
  totalDevices: number
  onlineDevices: number
}

interface BlockEvent {
  id: string
  deviceId: string
  deviceName?: string
  timestamp: Date
  inbound: number
  outbound: number
}

export default function OverviewPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalDevices: 0,
    onlineDevices: 0,
  })
  const [recentActivity, setRecentActivity] = useState<BlockEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [loggingOut, setLoggingOut] = useState(false)

  const fetchData = async () => {
    try {
      // Fetch stats
      const statsRes = await fetch("/api/stats")
      const statsData = await statsRes.json()
      setStats(statsData)

      // Fetch recent activity
      const activityRes = await fetch("/api/devices/checkin")
      const activityData = await activityRes.json()

      // Get recent block events from all devices
      const allEvents: BlockEvent[] = []
      activityData.devices?.forEach((device: any) => {
        if (device.deltaInbound || device.deltaOutbound) {
          allEvents.push({
            id: `${device.id}-${Date.now()}`,
            deviceId: device.id,
            deviceName: device.name,
            timestamp: new Date(device.lastSeen),
            inbound: device.deltaInbound || 0,
            outbound: device.deltaOutbound || 0,
          })
        }
      })

      // Sort by timestamp and take top 10
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setRecentActivity(allEvents.slice(0, 10))

      setLastRefresh(new Date())
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
      setLoggingOut(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  const formatLastSeen = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
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
              <span className="text-gray-600 dark:text-slate-400 text-sm font-medium">Platform Manager</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-slate-500">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchData}
                className="h-8 px-3 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={loggingOut}
                className="h-8 px-3 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                {loggingOut ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1.5">Logout</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Welcome Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome to ThreatZapper</h1>
          <p className="text-gray-600 dark:text-slate-400">Monitor your fleet of security appliances from one central dashboard.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Total Users"
            value={stats.totalUsers}
            bgColor="bg-blue-100 dark:bg-blue-500/20"
            textColor="text-blue-600 dark:text-blue-400"
            onClick={() => router.push("/dashboard/users")}
          />
          <StatCard
            icon={<Shield className="h-5 w-5" />}
            label="Active Subscriptions"
            value={stats.activeSubscriptions}
            bgColor="bg-green-100 dark:bg-green-500/20"
            textColor="text-green-600 dark:text-green-400"
            onClick={() => router.push("/dashboard/users")}
          />
          <StatCard
            icon={<Server className="h-5 w-5" />}
            label="Total Devices"
            value={stats.totalDevices}
            bgColor="bg-purple-100 dark:bg-purple-500/20"
            textColor="text-purple-600 dark:text-purple-400"
            onClick={() => router.push("/dashboard/devices")}
          />
          <StatCard
            icon={<Activity className="h-5 w-5" />}
            label="Online Devices"
            value={stats.onlineDevices}
            bgColor="bg-orange-100 dark:bg-orange-500/20"
            textColor="text-orange-600 dark:text-orange-400"
            onClick={() => router.push("/dashboard/devices")}
          />
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Link href="/dashboard/users">
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Manage Users</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">View customer accounts</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/devices">
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-purple-500 dark:hover:border-purple-500 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                  <Server className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Manage Devices</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Monitor appliances</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/analytics">
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-green-500 dark:hover:border-green-500 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
                  <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Analytics</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">View block statistics</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Latest block events across all devices</p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-slate-700 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-gray-500 dark:text-slate-500" />
                <p className="text-sm text-gray-500 dark:text-slate-400">Loading activity...</p>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="p-8 text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                <p className="text-sm text-gray-500 dark:text-slate-400">No recent activity</p>
              </div>
            ) : (
              recentActivity.map((event) => (
                <div key={event.id} className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => router.push(`/dashboard/devices/${event.deviceId}`)}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {event.deviceName || event.deviceId.slice(0, 12)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">{formatLastSeen(new Date(event.timestamp))}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {event.inbound > 0 && (
                      <span className="flex items-center gap-1.5 text-sm">
                        <ArrowDownLeft className="h-4 w-4 text-red-500" />
                        <span className="font-medium text-gray-900 dark:text-white">+{event.inbound}</span>
                        <span className="text-gray-500 dark:text-slate-400">inbound</span>
                      </span>
                    )}
                    {event.outbound > 0 && (
                      <span className="flex items-center gap-1.5 text-sm">
                        <ArrowUpRight className="h-4 w-4 text-orange-500" />
                        <span className="font-medium text-gray-900 dark:text-white">+{event.outbound}</span>
                        <span className="text-gray-500 dark:text-slate-400">outbound</span>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value, bgColor, textColor, onClick }: {
  icon: React.ReactNode
  label: string
  value: number
  bgColor: string
  textColor: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 hover:border-gray-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <div className={textColor}>{icon}</div>
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value.toLocaleString()}</div>
      <div className="text-sm text-gray-500 dark:text-slate-400">{label}</div>
    </div>
  )
}
