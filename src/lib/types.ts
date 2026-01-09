// ThreatZapper Device Types

export interface Device {
  id: string                    // Unique device ID (MAC address)
  name?: string                 // User-assigned friendly name
  wifiIp: string               // Current WiFi IP address
  mode: "bridge" | "router"    // Current operating mode
  firmware: string             // Firmware version
  uptime: number               // Uptime in seconds
  firstSeen?: Date             // First check-in timestamp
  lastSeen: Date               // Last check-in timestamp
  blockedCount: number         // Total IPs blocked (cumulative)
  blockedInbound: number       // Total inbound blocks
  blockedOutbound: number      // Total outbound blocks
  wifiSsid?: string            // Connected WiFi network
  wifiSignal?: number          // WiFi signal strength (dBm)
  status: "online" | "offline" | "warning"
}

export interface DeviceCheckin {
  deviceId: string             // MAC address
  wifiIp: string
  mode: "bridge" | "router"
  firmware: string
  uptime: number
  blockedInbound?: number
  blockedOutbound?: number
  deltaInbound?: number        // Blocks since last report
  deltaOutbound?: number       // Blocks since last report
  wifiSsid?: string
  wifiSignal?: number
  macAddress?: string          // MAC address (explicit field)
  metrics?: {
    diskTotalMb: number
    diskUsedMb: number
    memTotalMb: number
    memUsedMb: number
    cpuLoad: number
    tempCelsius: number
  }
}

export interface BlockEvent {
  id: string
  deviceId: string
  deviceName?: string
  timestamp: Date
  inbound: number
  outbound: number
}

export interface DeviceStats {
  totalDevices: number
  onlineDevices: number
  offlineDevices: number
  totalBlocked: number
  totalInbound: number
  totalOutbound: number
}

export interface DeviceMetrics {
  id: string
  deviceId: string
  diskTotalMb: number
  diskUsedMb: number
  memTotalMb: number
  memUsedMb: number
  cpuLoad: number
  tempCelsius: number
  createdAt: Date
}

export interface DeviceDetail extends Device {
  macAddress?: string
  firstSeen?: Date
  lastReboot?: Date
  metrics?: DeviceMetrics
  recentEvents?: BlockEvent[]
}

export function isDeviceOnline(device: Device): boolean {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  return new Date(device.lastSeen) > fiveMinutesAgo
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}d ${hours}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

export function formatLastSeen(date: Date): string {
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
