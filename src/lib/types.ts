// ThreatZapper Device Types

export interface Device {
  id: string                    // Unique device ID (MAC address)
  name?: string                 // User-assigned friendly name
  wifiIp: string               // Current WiFi IP address
  mode: "bridge" | "router"    // Current operating mode
  firmware: string             // Firmware version
  uptime: number               // Uptime in seconds
  lastSeen: Date               // Last check-in timestamp
  blockedCount: number         // Total IPs blocked (cumulative)
  blockedToday: number         // IPs blocked in last 24h
  blockedInbound: number       // Total inbound blocks
  blockedOutbound: number      // Total outbound blocks
  wifiSsid?: string            // Connected WiFi network
  wifiSignal?: number          // WiFi signal strength (dBm)
  tunnelActive: boolean        // Cloudflare tunnel status
  tunnelHostname?: string      // Tunnel hostname for SSH
}

export interface DeviceCheckin {
  deviceId: string             // MAC address
  wifiIp: string
  mode: "bridge" | "router"
  firmware: string
  uptime: number
  blockedCount: number
  blockedToday: number
  blockedInbound?: number
  blockedOutbound?: number
  deltaInbound?: number        // Blocks since last report
  deltaOutbound?: number       // Blocks since last report
  wifiSsid?: string
  wifiSignal?: number
  tunnelHostname?: string
}

export interface BlockEvent {
  id: string
  deviceId: string
  deviceName?: string
  timestamp: Date
  inbound: number
  outbound: number
}

// Block event history (last 100 events)
export const blockEvents: BlockEvent[] = []
export const MAX_BLOCK_EVENTS = 100

export interface DeviceStats {
  totalDevices: number
  onlineDevices: number
  offlineDevices: number
  totalBlocked: number
  blockedToday: number
}

// For demo/MVP - in-memory storage
// TODO: Replace with Vercel KV or Postgres
export const deviceStore: Map<string, Device> = new Map()

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
