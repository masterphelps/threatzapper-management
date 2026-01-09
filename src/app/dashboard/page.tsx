"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Shield,
  Wifi,
  WifiOff,
  Activity,
  Server,
  RefreshCw,
  MoreVertical,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Send,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Device, DeviceStats, BlockEvent, formatUptime, formatLastSeen } from "@/lib/types"

const DEVICES_PER_PAGE = 20

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([])
  const [blockEvents, setBlockEvents] = useState<BlockEvent[]>([])
  const [stats, setStats] = useState<DeviceStats>({
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    totalBlocked: 0,
    totalInbound: 0,
    totalOutbound: 0,
  })
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [commandModal, setCommandModal] = useState<{ deviceId: string; deviceName: string } | null>(null)

  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/devices/checkin")
      const data = await res.json()
      setDevices(data.devices || [])
      setStats(data.stats || stats)
      setBlockEvents(data.blockEvents || [])
      setLastRefresh(new Date())
    } catch (error) {
      console.error("Failed to fetch devices:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 10000)
    return () => clearInterval(interval)
  }, [])

  // Filter and search devices
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const matchesSearch = searchQuery === "" ||
        device.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (device.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        device.wifiIp?.toLowerCase().includes(searchQuery.toLowerCase())

      const isOnline = device.status === "online" ||
        (new Date().getTime() - new Date(device.lastSeen).getTime() < 5 * 60 * 1000)

      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "online" && isOnline) ||
        (statusFilter === "offline" && !isOnline)

      return matchesSearch && matchesStatus
    })
  }, [devices, searchQuery, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredDevices.length / DEVICES_PER_PAGE)
  const paginatedDevices = filteredDevices.slice(
    (currentPage - 1) * DEVICES_PER_PAGE,
    currentPage * DEVICES_PER_PAGE
  )

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  const isDeviceOnline = (device: Device) => {
    return device.status === "online" ||
      (new Date().getTime() - new Date(device.lastSeen).getTime() < 5 * 60 * 1000)
  }

  // Calculate real-time stats from devices
  const realTimeStats = useMemo(() => {
    const online = devices.filter(d => isDeviceOnline(d)).length
    return {
      totalDevices: devices.length,
      onlineDevices: online,
      offlineDevices: devices.length - online,
      totalBlocked: stats.totalBlocked,
      totalInbound: stats.totalInbound,
      totalOutbound: stats.totalOutbound,
    }
  }, [devices, stats])

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-800 bg-[#0f1117]/95 backdrop-blur">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/logo1.png"
                  alt="ThreatZapper"
                  width={180}
                  height={45}
                  className="h-7 w-auto brightness-0 invert"
                />
              </Link>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400 text-sm font-medium">Fleet Manager</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDevices}
                className="h-8 px-3 text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Stats Row - Databox Style */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            label="Total Devices"
            value={realTimeStats.totalDevices}
            icon={<Server className="h-4 w-4" />}
            color="blue"
          />
          <StatCard
            label="Online"
            value={realTimeStats.onlineDevices}
            icon={<Wifi className="h-4 w-4" />}
            color="green"
            trend={realTimeStats.totalDevices > 0 ? Math.round((realTimeStats.onlineDevices / realTimeStats.totalDevices) * 100) + "%" : "0%"}
          />
          <StatCard
            label="Offline"
            value={realTimeStats.offlineDevices}
            icon={<WifiOff className="h-4 w-4" />}
            color="red"
          />
          <StatCard
            label="Total Blocked"
            value={formatNumber(realTimeStats.totalBlocked)}
            icon={<Shield className="h-4 w-4" />}
            color="purple"
          />
          <StatCard
            label="Inbound Blocked"
            value={formatNumber(realTimeStats.totalInbound)}
            icon={<ArrowDownLeft className="h-4 w-4" />}
            color="orange"
          />
          <StatCard
            label="Outbound Blocked"
            value={formatNumber(realTimeStats.totalOutbound)}
            icon={<ArrowUpRight className="h-4 w-4" />}
            color="cyan"
          />
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Device List - 3 cols */}
          <div className="lg:col-span-3 bg-[#161b22] rounded-xl border border-gray-800 overflow-hidden">
            {/* Header with Search and Filters */}
            <div className="px-4 py-3 border-b border-gray-800 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-white">Devices</h2>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                  {filteredDevices.length} of {devices.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search devices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-48 pl-8 pr-3 text-xs bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg p-0.5">
                  {(["all", "online", "offline"] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                        statusFilter === status
                          ? "bg-gray-700 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Device Table */}
            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-gray-500" />
                <p className="text-sm text-gray-500">Loading devices...</p>
              </div>
            ) : paginatedDevices.length === 0 ? (
              <div className="p-12 text-center">
                <Server className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-400 mb-1">
                  {devices.length === 0 ? "No devices registered" : "No devices match your filters"}
                </p>
                <p className="text-xs text-gray-600">
                  {devices.length === 0 && "Devices will appear here once they check in"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-900/50">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">IP / Network</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Blocked</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {paginatedDevices.map((device) => {
                        const online = isDeviceOnline(device)
                        return (
                          <tr key={device.id} className="hover:bg-gray-800/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-gray-500"}`} />
                                <span className={`text-xs ${online ? "text-green-400" : "text-gray-500"}`}>
                                  {online ? "Online" : "Offline"}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-sm text-white">
                                {device.name || device.id.slice(0, 12)}
                              </div>
                              <div className="text-xs text-gray-500 font-mono">
                                {device.id}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                device.mode === "bridge"
                                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                  : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                              }`}>
                                {device.mode === "bridge" ? <Shield className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
                                {device.mode}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-mono text-sm text-white">{device.wifiIp || "—"}</div>
                              {device.wifiSsid && (
                                <div className="text-xs text-gray-500">
                                  {device.wifiSsid} {device.wifiSignal && `(${device.wifiSignal}dBm)`}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-white">
                                {formatNumber(device.blockedCount)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatNumber(device.blockedInbound)} in / {formatNumber(device.blockedOutbound)} out
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <Clock className="h-3 w-3" />
                                {formatLastSeen(new Date(device.lastSeen))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
                                onClick={() => setCommandModal({ deviceId: device.id, deviceName: device.name || device.id })}
                              >
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Showing {(currentPage - 1) * DEVICES_PER_PAGE + 1}-{Math.min(currentPage * DEVICES_PER_PAGE, filteredDevices.length)} of {filteredDevices.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-white disabled:opacity-30"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-gray-400 px-2">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-white disabled:opacity-30"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Live Block Feed - 1 col */}
          <div className="bg-[#161b22] rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <h2 className="text-sm font-semibold text-white">Live Block Feed</h2>
            </div>

            <div className="h-[400px] overflow-y-auto">
              {blockEvents.length === 0 ? (
                <div className="p-8 text-center">
                  <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-gray-700" />
                  <p className="text-xs text-gray-500">No blocks yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {blockEvents.map((event) => (
                    <div key={event.id} className="px-4 py-2.5 hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-white truncate max-w-[140px]">
                          {event.deviceName || event.deviceId.slice(0, 8)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        {event.inbound > 0 && (
                          <div className="flex items-center gap-1 text-red-400">
                            <ArrowDownLeft className="h-3 w-3" />
                            <span className="font-medium">{event.inbound}</span>
                            <span className="text-gray-500">in</span>
                          </div>
                        )}
                        {event.outbound > 0 && (
                          <div className="flex items-center gap-1 text-orange-400">
                            <ArrowUpRight className="h-3 w-3" />
                            <span className="font-medium">{event.outbound}</span>
                            <span className="text-gray-500">out</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Command Modal */}
      {commandModal && (
        <CommandModal
          deviceId={commandModal.deviceId}
          deviceName={commandModal.deviceName}
          onClose={() => setCommandModal(null)}
          onSent={() => {
            setCommandModal(null)
            fetchDevices()
          }}
        />
      )}
    </div>
  )
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon,
  color,
  trend
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: "blue" | "green" | "red" | "purple" | "orange" | "cyan"
  trend?: string
}) {
  const colors = {
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-400",
    green: "from-green-500/10 to-green-500/5 border-green-500/20 text-green-400",
    red: "from-red-500/10 to-red-500/5 border-red-500/20 text-red-400",
    purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400",
    orange: "from-orange-500/10 to-orange-500/5 border-orange-500/20 text-orange-400",
    cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
  }

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl p-4 border`}>
      <div className="flex items-center justify-between mb-2">
        <span className={colors[color].split(" ").pop()}>{icon}</span>
        {trend && <span className="text-xs text-gray-400">{trend}</span>}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

// Command Modal Component
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] rounded-xl border border-gray-800 w-full max-w-md">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Send Command</h3>
            <p className="text-xs text-gray-500">{deviceName}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Command Type</label>
            <select
              value={commandType}
              onChange={(e) => setCommandType(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
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
              <label className="text-xs text-gray-400 mb-1.5 block">
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
                className="w-full px-3 py-2 text-sm bg-gray-900 border border-gray-700 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 h-9 text-gray-400 hover:text-white hover:bg-gray-800"
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
