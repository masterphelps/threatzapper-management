"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Shield,
  Wifi,
  Server,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react"
import { Device } from "@/lib/types"

const DEVICES_PER_PAGE = 20

export default function Dashboard() {
  const router = useRouter()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/devices/checkin")
      const data = await res.json()
      setDevices(data.devices || [])
      setLastRefresh(new Date())
    } catch (error) {
      console.error("Failed to fetch devices:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, deviceId: string) => {
    e.stopPropagation() // Prevent row click
    if (!confirm("Are you sure you want to delete this device? This cannot be undone.")) {
      return
    }

    setDeletingId(deviceId)
    try {
      const res = await fetch(`/api/devices/${deviceId}`, { method: "DELETE" })
      if (res.ok) {
        setDevices(devices.filter(d => d.id !== deviceId))
      } else {
        const data = await res.json()
        alert("Failed to delete: " + (data.error || "Unknown error"))
      }
    } catch (error) {
      console.error("Delete failed:", error)
      alert("Failed to delete device")
    } finally {
      setDeletingId(null)
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

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "—"
    const d = new Date(date)
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage and monitor all ThreatZapper devices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            size="sm"
            onClick={() => {/* TODO: Add device modal */}}
            className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Device
          </Button>
          <span className="text-xs text-gray-500 dark:text-slate-500">
            Updated {lastRefresh.toLocaleTimeString()}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDevices}
            className="h-9 px-3 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div>
        {/* Device List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          {/* Header with Search and Filters */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Devices</h2>
              <span className="text-xs text-gray-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                {filteredDevices.length} of {devices.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search devices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-48 pl-8 pr-3 text-xs bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg p-0.5">
                {(["all", "online", "offline"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      statusFilter === status
                        ? "bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white"
                        : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
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
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-gray-500 dark:text-slate-500" />
              <p className="text-sm text-gray-500 dark:text-slate-400">Loading devices...</p>
            </div>
          ) : paginatedDevices.length === 0 ? (
            <div className="p-12 text-center">
              <Server className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">
                {devices.length === 0 ? "No devices registered" : "No devices match your filters"}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-500">
                {devices.length === 0 && "Devices will appear here once they check in"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Device</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Mode</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">IP / Network</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Blocked</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">First Seen</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Last Seen</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {paginatedDevices.map((device) => {
                      const online = isDeviceOnline(device)
                      return (
                        <tr
                          key={device.id}
                          onClick={() => router.push(`/dashboard/devices/${device.id}`)}
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
                            <div className="font-mono text-sm text-gray-900 dark:text-white">{device.wifiIp || "—"}</div>
                            {device.wifiSsid && (
                              <div className="text-xs text-gray-500 dark:text-slate-500">
                                {device.wifiSsid} {device.wifiSignal && `(${device.wifiSignal}dBm)`}
                              </div>
                            )}
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
                              {formatDate(device.firstSeen)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-gray-600 dark:text-slate-400">
                              {formatDate(device.lastSeen)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDelete(e, device.id)}
                              disabled={deletingId === device.id}
                              className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                            >
                              {deletingId === device.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
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
                <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-slate-500">
                    Showing {(currentPage - 1) * DEVICES_PER_PAGE + 1}-{Math.min(currentPage * DEVICES_PER_PAGE, filteredDevices.length)} of {filteredDevices.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => p - 1)}
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
                      onClick={() => setCurrentPage(p => p + 1)}
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
      </div>
    </div>
  )
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M"
  if (n >= 1000) return (n / 1000).toFixed(1) + "K"
  return n.toString()
}
