"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Shield,
  Wifi,
  WifiOff,
  Activity,
  Server,
  RefreshCw,
  Terminal,
  MoreVertical,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Device, DeviceStats, BlockEvent, isDeviceOnline, formatUptime, formatLastSeen } from "@/lib/types"

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([])
  const [blockEvents, setBlockEvents] = useState<BlockEvent[]>([])
  const [stats, setStats] = useState<DeviceStats & { totalInbound?: number; totalOutbound?: number }>({
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    totalBlocked: 0,
    blockedToday: 0,
  })
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

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
    // Refresh every 10 seconds for live block feed
    const interval = setInterval(fetchDevices, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/logo1.png"
                  alt="ThreatZapper"
                  width={200}
                  height={50}
                  className="h-8 w-auto dark:brightness-0 dark:invert"
                />
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="font-semibold">Fleet Manager</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDevices}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Server className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalDevices}</div>
                <div className="text-xs text-muted-foreground">Total Devices</div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Wifi className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.onlineDevices}</div>
                <div className="text-xs text-muted-foreground">Online</div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <WifiOff className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.offlineDevices}</div>
                <div className="text-xs text-muted-foreground">Offline</div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Shield className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {stats.totalBlocked.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Total Blocked</div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Activity className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {stats.blockedToday.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Blocked Today</div>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout: Devices + Block Feed */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Device List - 2 cols */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold">Devices</h2>
              <span className="text-sm text-muted-foreground">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            </div>

          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              Loading devices...
            </div>
          ) : devices.length === 0 ? (
            <div className="p-12 text-center">
              <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No devices yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Devices will appear here once they check in.
              </p>
              <p className="text-xs text-muted-foreground font-mono bg-muted p-3 rounded-lg">
                curl -X POST {typeof window !== 'undefined' ? window.location.origin : ''}/api/devices/checkin \<br />
                &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                &nbsp;&nbsp;-d '&#123;"deviceId":"AA:BB:CC:DD:EE:FF","wifiIp":"192.168.1.100","mode":"bridge","firmware":"1.0.0"&#125;'
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Device
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Mode
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      WiFi IP
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Uptime
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Blocked
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Last Seen
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {devices.map((device) => {
                    const online = isDeviceOnline(device)
                    return (
                      <tr key={device.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {online ? (
                              <span className="flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                              </span>
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                            )}
                            <span className={`text-xs ${online ? "text-green-500" : "text-muted-foreground"}`}>
                              {online ? "Online" : "Offline"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium">
                              {device.name || device.id}
                            </div>
                            {device.name && (
                              <div className="text-xs text-muted-foreground font-mono">
                                {device.id}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              device.mode === "bridge"
                                ? "bg-blue-500/10 text-blue-500"
                                : "bg-orange-500/10 text-orange-500"
                            }`}
                          >
                            {device.mode === "bridge" ? (
                              <Shield className="h-3 w-3" />
                            ) : (
                              <Wifi className="h-3 w-3" />
                            )}
                            {device.mode === "bridge" ? "Bridge" : "Router"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm">{device.wifiIp}</span>
                          {device.wifiSsid && (
                            <div className="text-xs text-muted-foreground">
                              {device.wifiSsid}
                              {device.wifiSignal && ` (${device.wifiSignal}dBm)`}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm">{formatUptime(device.uptime)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium">
                            {device.blockedCount.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            +{device.blockedToday.toLocaleString()} today
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatLastSeen(new Date(device.lastSeen))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {device.tunnelActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1"
                                title={`SSH: ${device.tunnelHostname}`}
                              >
                                <Terminal className="h-4 w-4" />
                                SSH
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
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

          {/* Live Block Feed - 1 col */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <h2 className="text-sm font-semibold">Live Block Feed</h2>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              {blockEvents.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No blocks yet</p>
                  <p className="text-xs mt-1">Blocks will appear here in real-time</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {blockEvents.map((event) => (
                    <div key={event.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate max-w-[120px]">
                          {event.deviceName || event.deviceId.slice(0, 8)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        {event.inbound > 0 && (
                          <div className="flex items-center gap-1 text-red-500">
                            <ArrowDownLeft className="h-3 w-3" />
                            <span className="font-medium">{event.inbound}</span>
                            <span className="text-xs text-muted-foreground">in</span>
                          </div>
                        )}
                        {event.outbound > 0 && (
                          <div className="flex items-center gap-1 text-orange-500">
                            <ArrowUpRight className="h-3 w-3" />
                            <span className="font-medium">{event.outbound}</span>
                            <span className="text-xs text-muted-foreground">out</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {blockEvents.length > 0 && (
              <div className="px-4 py-2 border-t border-border bg-muted/30">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total: {stats.totalInbound || 0} in / {stats.totalOutbound || 0} out</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          ThreatZapper Fleet Manager v1.0
        </div>
      </main>
    </div>
  )
}
