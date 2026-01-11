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
  Trash2,
  RotateCcw,
  Download,
  Pencil,
  Check,
  X,
  Globe,
  MapPin,
  Terminal,
  ChevronDown,
  ChevronUp,
  User,
  ArrowRight,
  AlertTriangle,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { formatUptime } from "@/lib/types"

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
  firstSeen?: Date
  // Metrics
  diskUsage?: number
  diskTotal?: number
  memoryUsage?: number
  memoryTotal?: number
  cpuLoad?: number
  temperature?: number
  // Geo/Network
  publicIp?: string
  publicCity?: string
  publicCountry?: string
  // Owner
  owner?: {
    id: string
    email: string
    name?: string
    subscriptionStatus?: string
  }
}

interface Command {
  id: string
  type: string
  status: "pending" | "sent" | "completed" | "failed"
  createdAt: Date
  sentAt?: Date
  completedAt?: Date
  result?: string
  payload?: Record<string, unknown>
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

export default function DeviceDetailPage() {
  const router = useRouter()
  const params = useParams<{ deviceId: string }>()
  const deviceId = params.deviceId
  const [device, setDevice] = useState<DeviceDetail | null>(null)
  const [commands, setCommands] = useState<Command[]>([])
  const [events, setEvents] = useState<BlockEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // UI States
  const [commandModal, setCommandModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Rename state
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState("")
  const [renaming, setRenaming] = useState(false)

  // Quick action states
  const [rebooting, setRebooting] = useState(false)
  const [updatingBlocklist, setUpdatingBlocklist] = useState(false)
  const [rebootConfirm, setRebootConfirm] = useState(false)

  // Command history expansion
  const [expandedCommand, setExpandedCommand] = useState<string | null>(null)

  const fetchDeviceData = async () => {
    try {
      const res = await fetch(`/api/devices/${deviceId}`)
      const data = await res.json()

      if (data.id) {
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
          firstSeen: data.firstSeen,
          diskUsage: data.metrics?.diskUsedMb ? data.metrics.diskUsedMb * 1024 * 1024 : undefined,
          diskTotal: data.metrics?.diskTotalMb ? data.metrics.diskTotalMb * 1024 * 1024 : undefined,
          memoryUsage: data.metrics?.memUsedMb ? data.metrics.memUsedMb * 1024 * 1024 : undefined,
          memoryTotal: data.metrics?.memTotalMb ? data.metrics.memTotalMb * 1024 * 1024 : undefined,
          cpuLoad: data.metrics?.cpuLoad,
          temperature: data.metrics?.tempCelsius,
          publicIp: data.publicIp,
          publicCity: data.publicCity,
          publicCountry: data.publicCountry,
          owner: data.owner,
        }

        setDevice(deviceDetail)
        setCommands(data.recentCommands || [])
        setEvents(data.recentEvents || [])
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
  }, [deviceId])

  const handleDeleteDevice = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/devices/${deviceId}`, { method: "DELETE" })
      if (res.ok) {
        router.push("/dashboard")
      } else {
        const data = await res.json()
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

  const handleRename = async () => {
    if (!newName.trim()) {
      setIsRenaming(false)
      return
    }

    setRenaming(true)
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (res.ok) {
        setDevice(prev => prev ? { ...prev, name: newName.trim() } : null)
      }
    } catch (error) {
      console.error("Rename failed:", error)
    } finally {
      setRenaming(false)
      setIsRenaming(false)
    }
  }

  const sendQuickCommand = async (type: string, payload: Record<string, unknown> = {}) => {
    try {
      const res = await fetch("/api/devices/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: deviceId,
          type,
          payload,
        }),
      })
      const data = await res.json()
      if (data.success) {
        fetchDeviceData()
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const handleReboot = async () => {
    setRebooting(true)
    await sendQuickCommand("reboot")
    setRebooting(false)
    setRebootConfirm(false)
  }

  const handleUpdateBlocklist = async () => {
    setUpdatingBlocklist(true)
    await sendQuickCommand("update_blocklist", {
      url: "https://raw.githubusercontent.com/herrbischoff/country-ip-blocks/master/ipv4/"
    })
    setUpdatingBlocklist(false)
  }

  const isOnline = device?.status === "online" ||
    (device && new Date().getTime() - new Date(device.lastSeen).getTime() < 5 * 60 * 1000)

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "—"
    const d = new Date(date)
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatLastSeen = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-gray-500 dark:text-slate-500" />
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading device...</p>
        </div>
      </div>
    )
  }

  if (!device) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Server className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">Device not found</p>
          <Link href="/dashboard">
            <Button variant="ghost" className="text-gray-600 dark:text-slate-400">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Overview
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/devices">
            <Button variant="ghost" size="sm" className="text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Devices
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Device Details</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {device.name || device.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-slate-500">
            Updated {lastRefresh.toLocaleTimeString()}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDeviceData}
            className="h-9 px-3 text-gray-500 dark:text-slate-400"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Owner Section */}
      {device.owner && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            Device Owner
          </h2>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{device.owner.email}</span>
                {device.owner.subscriptionStatus && (
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    device.owner.subscriptionStatus === 'active'
                      ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                      : device.owner.subscriptionStatus === 'trial'
                      ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400'
                  }`}>
                    {device.owner.subscriptionStatus}
                  </span>
                )}
              </div>
              {device.owner.name && (
                <p className="text-xs text-gray-500 dark:text-slate-400">{device.owner.name}</p>
              )}
            </div>
            <Link href={`/dashboard/users/${device.owner.id}`}>
              <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10">
                View User
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      )}
      {!device.owner && (
        <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-200">Orphaned Device</h3>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">This device is not linked to any customer account.</p>
            </div>
          </div>
        </div>
      )}

        {/* Device Header */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {isRenaming ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={device.name || device.id.slice(0, 12)}
                      className="text-2xl font-bold bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white px-2 py-1 rounded border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename()
                        if (e.key === "Escape") setIsRenaming(false)
                      }}
                    />
                    <Button variant="ghost" size="sm" onClick={handleRename} disabled={renaming} className="h-8 w-8 p-0 text-green-600">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsRenaming(false)} className="h-8 w-8 p-0 text-gray-500">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {device.name || device.id.slice(0, 12)}
                    </h1>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setNewName(device.name || ""); setIsRenaming(true) }}
                      className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                  isOnline ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                  {isOnline ? "Online" : "Offline"}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                  device.mode === "bridge" ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400" : "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400"
                }`}>
                  {device.mode === "bridge" ? <Shield className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
                  {device.mode}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                <span className="font-mono">{device.id}</span>
                {device.publicCity && device.publicCountry && (
                  <>
                    <span className="text-gray-300 dark:text-slate-700">|</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {device.publicCity}, {device.publicCountry}
                    </span>
                  </>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setDeleteModal(true)} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10">
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setRebootConfirm(true)}
              disabled={rebooting || !isOnline}
              className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
            >
              {rebooting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Reboot Device
            </Button>
            <Button
              onClick={handleUpdateBlocklist}
              disabled={updatingBlocklist || !isOnline}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {updatingBlocklist ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Update Blocklist
            </Button>
            <Button
              variant="outline"
              onClick={() => setCommandModal(true)}
              className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300"
            >
              <Terminal className="h-4 w-4 mr-2" />
              Send Command
            </Button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Device Info */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Server className="h-4 w-4 text-gray-500" />
              Device Info
            </h2>
            <div className="space-y-3">
              <InfoRow label="First Seen" value={formatDate(device.firstSeen)} />
              <InfoRow label="Last Seen" value={formatLastSeen(new Date(device.lastSeen))} />
              <InfoRow label="Firmware" value={device.firmware} />
              <InfoRow label="Uptime" value={formatUptime(device.uptime)} />
            </div>
          </div>

          {/* Network Info */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-500" />
              Network
            </h2>
            <div className="space-y-3">
              <InfoRow label="Public IP" value={device.publicIp || "—"} />
              <InfoRow label="WiFi IP" value={device.wifiIp || "—"} />
              <InfoRow label="WiFi SSID" value={device.wifiSsid || "—"} />
              <InfoRow label="Signal" value={device.wifiSignal ? `${device.wifiSignal} dBm` : "—"} />
            </div>
          </div>

          {/* Blocked Threats */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-500" />
              Blocked Threats
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                  <ArrowDownLeft className="h-4 w-4 text-red-500" /> Inbound
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(device.blockedInbound)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                  <ArrowUpRight className="h-4 w-4 text-orange-500" /> Outbound
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(device.blockedOutbound)}</span>
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Total</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{formatNumber(device.blockedCount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500" />
              System Health
            </h2>
            {!device.diskUsage && !device.memoryUsage && !device.cpuLoad && !device.temperature ? (
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">No metrics yet</p>
            ) : (
              <div className="space-y-3">
                {device.diskUsage !== undefined && device.diskTotal && (
                  <MetricBar icon={<HardDrive className="h-3.5 w-3.5" />} label="Disk" value={device.diskUsage} max={device.diskTotal} />
                )}
                {device.memoryUsage !== undefined && device.memoryTotal && (
                  <MetricBar icon={<Cpu className="h-3.5 w-3.5" />} label="RAM" value={device.memoryUsage} max={device.memoryTotal} />
                )}
                {device.cpuLoad !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-slate-400">CPU Load</span>
                    <span className="font-medium text-gray-900 dark:text-white">{device.cpuLoad.toFixed(2)}</span>
                  </div>
                )}
                {device.temperature !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-gray-500 dark:text-slate-400">
                      <Thermometer className="h-3.5 w-3.5" /> Temp
                    </span>
                    <span className={`font-medium ${device.temperature > 70 ? "text-red-600" : "text-gray-900 dark:text-white"}`}>
                      {device.temperature}°C
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Command History */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Command History</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{commands.length} commands sent</p>
            </div>
            <Button size="sm" onClick={() => setCommandModal(true)} className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs">
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Send Command
            </Button>
          </div>

          {commands.length === 0 ? (
            <div className="p-8 text-center">
              <Terminal className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
              <p className="text-sm text-gray-500 dark:text-slate-400">No commands sent yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {commands.map((cmd) => (
                <div key={cmd.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <div
                    className="px-5 py-3 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedCommand(expandedCommand === cmd.id ? null : cmd.id)}
                  >
                    <div className="flex items-center gap-3">
                      {cmd.status === "completed" ? (
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : cmd.status === "failed" ? (
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      ) : cmd.status === "sent" ? (
                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{cmd.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        cmd.status === "completed" ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" :
                        cmd.status === "failed" ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400" :
                        cmd.status === "sent" ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400" :
                        "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400"
                      }`}>
                        {cmd.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 dark:text-slate-400">{formatDate(cmd.createdAt)}</span>
                      {expandedCommand === cmd.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>
                  {expandedCommand === cmd.id && (
                    <div className="px-5 pb-3 pt-0">
                      <div className="bg-gray-100 dark:bg-slate-900 rounded-lg p-3 text-xs font-mono">
                        {cmd.result ? (
                          <pre className="whitespace-pre-wrap text-gray-700 dark:text-slate-300">{cmd.result}</pre>
                        ) : (
                          <span className="text-gray-500 dark:text-slate-500">No output yet</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Activity Feed</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Recent block events</p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-slate-700 max-h-[300px] overflow-y-auto">
            {events.length === 0 ? (
              <div className="p-8 text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                <p className="text-sm text-gray-500 dark:text-slate-400">No activity yet</p>
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 dark:text-slate-400">{formatLastSeen(new Date(event.timestamp))}</span>
                    <span className="text-xs text-gray-400 dark:text-slate-600">{formatDate(event.timestamp)}</span>
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

      {/* Command Modal */}
      {commandModal && (
        <CommandModal
          deviceId={device.id}
          deviceName={device.name || device.id}
          onClose={() => setCommandModal(false)}
          onSent={() => { setCommandModal(false); fetchDeviceData() }}
        />
      )}

      {/* Reboot Confirmation */}
      {rebootConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-md shadow-xl">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Confirm Reboot</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                Are you sure you want to reboot <strong className="text-gray-900 dark:text-white">{device.name || device.id}</strong>?
                The device will be offline for approximately 60 seconds.
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setRebootConfirm(false)} disabled={rebooting} className="flex-1 h-9">Cancel</Button>
                <Button onClick={handleReboot} disabled={rebooting} className="flex-1 h-9 bg-orange-600 hover:bg-orange-700 text-white">
                  {rebooting ? "Rebooting..." : "Reboot Now"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 w-full max-w-md shadow-xl">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Delete Device</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{device.name || device.id}</strong>?
                This will remove all data including block history and metrics.
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mb-4">This action cannot be undone.</p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setDeleteModal(false)} disabled={deleting} className="flex-1 h-9">Cancel</Button>
                <Button onClick={handleDeleteDevice} disabled={deleting} className="flex-1 h-9 bg-red-600 hover:bg-red-700 text-white">
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

function MetricBar({ icon, label, value, max }: { icon: React.ReactNode; label: string; value: number; max: number }) {
  const percentage = Math.min((value / max) * 100, 100)
  const isWarning = percentage > 90

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
          {icon} {label}
        </span>
        <span className={`text-xs font-medium ${isWarning ? "text-red-600" : "text-gray-600 dark:text-slate-400"}`}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isWarning ? "bg-red-500" : "bg-blue-500"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function CommandModal({ deviceId, deviceName, onClose, onSent }: { deviceId: string; deviceName: string; onClose: () => void; onSent: () => void }) {
  const [commandType, setCommandType] = useState("exec")
  const [payload, setPayload] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")

  const sendCommand = async () => {
    setSending(true)
    setError("")

    try {
      let payloadObj: Record<string, unknown> = {}

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
        body: JSON.stringify({ deviceId, type: commandType, payload: payloadObj }),
      })

      const data = await res.json()
      if (data.success) {
        onSent()
      } else {
        setError(data.error || "Failed to send command")
      }
    } catch {
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-xl">×</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-gray-600 dark:text-slate-400 mb-1.5 block">Command Type</label>
            <select
              value={commandType}
              onChange={(e) => setCommandType(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white"
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
                {commandType === "file_download" && "URL | Path"}
                {commandType === "set_config" && "Key=Value"}
              </label>
              <textarea
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                placeholder={
                  commandType === "exec" ? "#!/bin/sh\necho 'hello'" :
                  commandType === "file_download" ? "https://example.com/file | /tmp/file" :
                  commandType === "set_config" ? "network.lan.ipaddr=192.168.1.1" : "https://..."
                }
                rows={commandType === "exec" ? 5 : 2}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-mono"
              />
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} className="flex-1 h-9">Cancel</Button>
            <Button onClick={sendCommand} disabled={sending || (commandType !== "reboot" && !payload)} className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white">
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
