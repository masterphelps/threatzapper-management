"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Shield,
  Wifi,
  Activity,
  Server,
  RefreshCw,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  HardDrive,
  Cpu,
  Thermometer,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  LogOut,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { formatUptime, formatLastSeen } from "@/lib/types"
import { ThemeToggle } from "@/components/theme-toggle"

interface DeviceDetail {
  id: string
  name?: string
  wifiIp: string
  mode: "bridge" | "router"
  firmware: string
  uptime: number
  lastSeen: Date
  blockedInbound: number
  blockedOutbound: number
  blockedCount: number
  wifiSsid?: string
  wifiSignal?: number
  status: "online" | "offline" | "warning"
  firstRegistered?: Date
  // Metrics
  diskUsage?: number
  diskTotal?: number
  memoryUsage?: number
  memoryTotal?: number
  cpuLoad?: number
  temperature?: number
}

interface BlockEvent {
  id: string
  deviceId: string
  timestamp: Date
  inbound: number
  outbound: number
  totalInbound: number
  totalOutbound: number
}

interface Command {
  id: string
  type: string
  status: "pending" | "sent" | "completed" | "failed"
  createdAt: Date
  completedAt?: Date
  result?: string
}

export default function DeviceDetailPage({ params }: { params: { deviceId: string } }) {
  const router = useRouter()
  const [device, setDevice] = useState<DeviceDetail | null>(null)
  const [events, setEvents] = useState<BlockEvent[]>([])
  const [commands, setCommands] = useState<Command[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [commandModal, setCommandModal] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchDeviceData = async () => {
    try {
      const res = await fetch(`/api/devices/${params.deviceId}`)
      const data = await res.json()

      if (data.id) {
        // Map API response to DeviceDetail interface
        const deviceDetail: DeviceDetail = {
          id: data.id,
          name: data.name,
          wifiIp: data.wifiIp,
          mode: data.mode,
          firmware: data.firmware,
          uptime: data.uptime,
          lastSeen: data.lastSeen,
          blockedInbound: data.blockedInbound,
          blockedOutbound: data.blockedOutbound,
          blockedCount: data.blockedCount,
          wifiSsid: data.wifiSsid,
          wifiSignal: data.wifiSignal,
          status: data.status,
          firstRegistered: data.firstSeen,
          // Metrics from the API
          diskUsage: data.metrics?.diskUsedMb ? data.metrics.diskUsedMb * 1024 * 1024 : undefined,
          diskTotal: data.metrics?.diskTotalMb ? data.metrics.diskTotalMb * 1024 * 1024 : undefined,
          memoryUsage: data.metrics?.memUsedMb ? data.metrics.memUsedMb * 1024 * 1024 : undefined,
          memoryTotal: data.metrics?.memTotalMb ? data.metrics.memTotalMb * 1024 * 1024 : undefined,
          cpuLoad: data.metrics?.cpuLoad,
          temperature: data.metrics?.tempCelsius,
        }

        setDevice(deviceDetail)
        setEvents(data.recentEvents || [])
        setCommands(data.recentCommands || [])
      }
      setLastRefresh(new Date())
    } catch (error) {
      console.error("Failed to fetch device:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeviceData()
    const interval = setInterval(fetchDeviceData, 10000)
    return () => clearInterval(interval)
  }, [params.deviceId])

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

  const handleDeleteDevice = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/devices/${params.deviceId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        router.push("/dashboard")
      } else {
        const data = await res.json()
        console.error("Delete failed:", data.error)
        alert("Failed to delete device: " + (data.error || "Unknown error"))
      }
    } catch (error) {
      console.error("Delete failed:", error)
      alert("Failed to delete device")
    } finally {
      setDeleting(false)
      setDeleteModal(false)
    }
  }

  const isOnline = device?.status === "online" ||
    (device && new Date().getTime() - new Date(device.lastSeen).getTime() < 5 * 60 * 1000)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-gray-500 dark:text-slate-500" />
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading device...</p>
        </div>
      </div>
    )
  }

  if (!device) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Server className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">Device not found</p>
          <Link href="/dashboard">
            <Button variant="ghost" className="text-gray-600 dark:text-slate-400">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Fleet
            </Button>
          </Link>
        </div>
      </div>
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
              <span className="text-gray-600 dark:text-slate-400 text-sm font-medium">Device Details</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-slate-500">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDeviceData}
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
        {/* Back Button */}
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Fleet
          </Button>
        </Link>

        {/* Device Header */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {device.name || device.id.slice(0, 12)}
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                  isOnline
                    ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                  {isOnline ? "Online" : "Offline"}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                  device.mode === "bridge"
                    ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400"
                    : "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400"
                }`}>
                  {device.mode === "bridge" ? <Shield className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
                  {device.mode}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                <span className="font-mono">{device.id}</span>
                <span className="text-gray-300 dark:text-slate-700">|</span>
                <span className="font-mono">{device.wifiIp}</span>
              </div>
            </div>
            {/* Delete Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteModal(true)}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete Device
            </Button>
          </div>
        </div>

        {/* Info and Metrics Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Info Card */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Device Information</h2>
            <div className="space-y-3">
              <InfoRow label="First Registered" value={device.firstRegistered ? new Date(device.firstRegistered).toLocaleDateString() : "Unknown"} />
              <InfoRow label="Last Seen" value={formatLastSeen(new Date(device.lastSeen))} />
              <InfoRow label="Firmware" value={device.firmware} />
              <InfoRow label="Uptime" value={formatUptime(device.uptime)} />
              {device.wifiSsid && (
                <>
                  <InfoRow label="WiFi Network" value={device.wifiSsid} />
                  <InfoRow
                    label="Signal Strength"
                    value={device.wifiSignal ? `${device.wifiSignal} dBm` : "Unknown"}
                  />
                </>
              )}
            </div>
          </div>

          {/* Metrics Card */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">System Metrics</h2>
            <div className="space-y-4">
              {device.diskUsage !== undefined && device.diskTotal && (
                <MetricBar
                  icon={<HardDrive className="h-4 w-4" />}
                  label="Disk Usage"
                  value={device.diskUsage}
                  max={device.diskTotal}
                  color="blue"
                />
              )}
              {device.memoryUsage !== undefined && device.memoryTotal && (
                <MetricBar
                  icon={<Activity className="h-4 w-4" />}
                  label="Memory"
                  value={device.memoryUsage}
                  max={device.memoryTotal}
                  color="purple"
                />
              )}
              {device.cpuLoad !== undefined && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm text-gray-500 dark:text-slate-400">CPU Load</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{device.cpuLoad.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
              {device.temperature !== undefined && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                    <Thermometer className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm text-gray-500 dark:text-slate-400">Temperature</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{device.temperature}°C</span>
                    </div>
                  </div>
                </div>
              )}
              {!device.diskUsage && !device.memoryUsage && !device.cpuLoad && !device.temperature && (
                <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
                  No metrics data available yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Blocks and Commands Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Blocks Card */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Blocked Threats</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-gray-600 dark:text-slate-400">Inbound</span>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(device.blockedInbound)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm text-gray-600 dark:text-slate-400">Outbound</span>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(device.blockedOutbound)}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Total Blocked</span>
                  </div>
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(device.blockedCount)}
                  </span>
                </div>
              </div>

              {/* Simple bar chart */}
              {device.blockedCount > 0 && (
                <div className="pt-4">
                  <div className="h-8 bg-gray-100 dark:bg-slate-900 rounded-lg overflow-hidden flex">
                    <div
                      className="bg-red-500 dark:bg-red-600 flex items-center justify-center text-xs text-white font-medium"
                      style={{ width: `${(device.blockedInbound / device.blockedCount) * 100}%` }}
                    >
                      {device.blockedInbound > 0 && Math.round((device.blockedInbound / device.blockedCount) * 100) + "%"}
                    </div>
                    <div
                      className="bg-orange-500 dark:bg-orange-600 flex items-center justify-center text-xs text-white font-medium"
                      style={{ width: `${(device.blockedOutbound / device.blockedCount) * 100}%` }}
                    >
                      {device.blockedOutbound > 0 && Math.round((device.blockedOutbound / device.blockedCount) * 100) + "%"}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
                    <span>Inbound: {Math.round((device.blockedInbound / device.blockedCount) * 100)}%</span>
                    <span>Outbound: {Math.round((device.blockedOutbound / device.blockedCount) * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Commands Card */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Commands</h2>
              <Button
                size="sm"
                onClick={() => setCommandModal(true)}
                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Send Command
              </Button>
            </div>

            <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto">
              {commands.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
                  No commands sent yet
                </p>
              ) : (
                commands.slice(0, 5).map((cmd) => (
                  <div key={cmd.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-900">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {cmd.status === "completed" ? (
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                      ) : cmd.status === "failed" ? (
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                      ) : cmd.status === "sent" ? (
                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                      )}
                      <span className="text-sm text-gray-900 dark:text-white truncate">
                        {cmd.type}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      cmd.status === "completed" ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" :
                      cmd.status === "failed" ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400" :
                      cmd.status === "sent" ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400" :
                      "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400"
                    }`}>
                      {cmd.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Activity Feed</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Recent block events for this device</p>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-slate-700 max-h-[400px] overflow-y-auto">
            {events.length === 0 ? (
              <div className="p-8 text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                <p className="text-sm text-gray-500 dark:text-slate-400">No activity yet</p>
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      {formatLastSeen(new Date(event.timestamp))}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-600">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {event.inbound > 0 && (
                      <div className="flex items-center gap-2">
                        <ArrowDownLeft className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          +{event.inbound}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-slate-400">inbound blocked</span>
                      </div>
                    )}
                    {event.outbound > 0 && (
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          +{event.outbound}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-slate-400">outbound blocked</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-slate-600 mt-1">
                    Total: {formatNumber(event.totalInbound)} in / {formatNumber(event.totalOutbound)} out
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Command Modal */}
      {commandModal && (
        <CommandModal
          deviceId={device.id}
          deviceName={device.name || device.id}
          onClose={() => setCommandModal(false)}
          onSent={() => {
            setCommandModal(false)
            fetchDeviceData()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-md shadow-xl">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Delete Device</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{device.name || device.id}</strong>?
                This will remove all data associated with this device including block history and metrics.
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mb-4">
                This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 h-9 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteDevice}
                  disabled={deleting}
                  className="flex-1 h-9 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete Device"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}

function MetricBar({
  icon,
  label,
  value,
  max,
  color
}: {
  icon: React.ReactNode
  label: string
  value: number
  max: number
  color: "blue" | "purple" | "green"
}) {
  const percentage = Math.min((value / max) * 100, 100)

  const colors = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    green: "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400",
  }

  const barColors = {
    blue: "bg-blue-600 dark:bg-blue-500",
    purple: "bg-purple-600 dark:bg-purple-500",
    green: "bg-green-600 dark:bg-green-500",
  }

  return (
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${colors[color]}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-sm text-gray-500 dark:text-slate-400">{label}</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatBytes(value)} / {formatBytes(max)} ({percentage.toFixed(0)}%)
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColors[color]} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function CommandModal({
  deviceId,
  deviceName,
  onClose,
  onSent
}: {
  deviceId: string
  deviceName: string
  onClose: () => void
  onSent: () => void
}) {
  const [commandType, setCommandType] = useState("exec")
  const [payload, setPayload] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  const sendCommand = async () => {
    setSending(true)
    setError("")

    try {
      let payloadObj: any = {}

      switch (commandType) {
        case "exec":
          payloadObj = { script: payload }
          break
        case "update_blocklist":
        case "update_firmware":
          payloadObj = { url: payload }
          break
        case "file_download":
          const [url, path] = payload.split("|").map(s => s.trim())
          payloadObj = { url, path }
          break
        case "set_config":
          const [key, value] = payload.split("=").map(s => s.trim())
          payloadObj = { key, value }
          break
        case "reboot":
          payloadObj = {}
          break
      }

      const res = await fetch("/api/devices/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          type: commandType,
          payload: payloadObj,
        }),
      })

      const data = await res.json()

      if (data.success) {
        onSent()
      } else {
        setError(data.error || "Failed to send command")
      }
    } catch (err) {
      setError("Network error")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-md shadow-xl">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Send Command</h3>
            <p className="text-xs text-gray-500 dark:text-slate-500">{deviceName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-xl">
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-gray-600 dark:text-slate-400 mb-1.5 block">Command Type</label>
            <select
              value={commandType}
              onChange={(e) => setCommandType(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
            >
              <option value="exec">Execute Script</option>
              <option value="reboot">Reboot</option>
              <option value="update_blocklist">Update Blocklist</option>
              <option value="file_download">Download File</option>
              <option value="set_config">Set Config</option>
              <option value="update_firmware">Update Firmware</option>
            </select>
          </div>

          {commandType !== "reboot" && (
            <div>
              <label className="text-xs text-gray-600 dark:text-slate-400 mb-1.5 block">
                {commandType === "exec" && "Shell Script"}
                {commandType === "update_blocklist" && "Blocklist URL"}
                {commandType === "update_firmware" && "Firmware URL"}
                {commandType === "file_download" && "URL | Path (e.g., https://... | /tmp/file.txt)"}
                {commandType === "set_config" && "Key=Value (e.g., network.lan.ipaddr=192.168.1.1)"}
              </label>
              <textarea
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                placeholder={
                  commandType === "exec" ? "#!/bin/sh\necho 'hello'" :
                  commandType === "file_download" ? "https://example.com/file.txt | /tmp/file.txt" :
                  commandType === "set_config" ? "network.lan.ipaddr=192.168.1.1" :
                  "https://..."
                }
                rows={commandType === "exec" ? 5 : 2}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 h-9 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={sendCommand}
              disabled={sending || (commandType !== "reboot" && !payload)}
              className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Command"}
            </Button>
          </div>
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

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + " GB"
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB"
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB"
  return bytes + " B"
}
