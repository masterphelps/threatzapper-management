import { NextRequest, NextResponse } from "next/server"
import { Device, DeviceCheckin, BlockEvent, deviceStore, blockEvents, MAX_BLOCK_EVENTS } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const data: DeviceCheckin = await request.json()

    // Validate required fields
    if (!data.deviceId || !data.wifiIp || !data.mode || !data.firmware) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Get existing device or create new
    const existing = deviceStore.get(data.deviceId)

    const device: Device = {
      id: data.deviceId,
      name: existing?.name,
      wifiIp: data.wifiIp,
      mode: data.mode,
      firmware: data.firmware,
      uptime: data.uptime || 0,
      lastSeen: new Date(),
      blockedCount: data.blockedCount || 0,
      blockedToday: data.blockedToday || 0,
      blockedInbound: data.blockedInbound || 0,
      blockedOutbound: data.blockedOutbound || 0,
      wifiSsid: data.wifiSsid,
      wifiSignal: data.wifiSignal,
      tunnelActive: !!data.tunnelHostname,
      tunnelHostname: data.tunnelHostname,
    }

    // Store device
    deviceStore.set(data.deviceId, device)

    // Record block event if there were any blocks
    const deltaIn = data.deltaInbound || 0
    const deltaOut = data.deltaOutbound || 0

    if (deltaIn > 0 || deltaOut > 0) {
      const event: BlockEvent = {
        id: `${data.deviceId}-${Date.now()}`,
        deviceId: data.deviceId,
        deviceName: device.name,
        timestamp: new Date(),
        inbound: deltaIn,
        outbound: deltaOut,
      }

      // Add to front of array
      blockEvents.unshift(event)

      // Keep only last N events
      if (blockEvents.length > MAX_BLOCK_EVENTS) {
        blockEvents.pop()
      }

      console.log(`[Block] Device ${data.deviceId} - IN:${deltaIn} OUT:${deltaOut}`)
    }

    console.log(`[Checkin] Device ${data.deviceId} - ${data.mode} mode - ${data.wifiIp}`)

    return NextResponse.json({
      success: true,
      message: "Check-in recorded",
      device: {
        id: device.id,
        name: device.name,
      },
    })
  } catch (error) {
    console.error("Checkin error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET - list all devices (for dashboard)
export async function GET() {
  const devices = Array.from(deviceStore.values())

  // Calculate stats
  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

  const stats = {
    totalDevices: devices.length,
    onlineDevices: devices.filter(d => new Date(d.lastSeen) > fiveMinutesAgo).length,
    offlineDevices: devices.filter(d => new Date(d.lastSeen) <= fiveMinutesAgo).length,
    totalBlocked: devices.reduce((sum, d) => sum + d.blockedCount, 0),
    blockedToday: devices.reduce((sum, d) => sum + d.blockedToday, 0),
    totalInbound: devices.reduce((sum, d) => sum + (d.blockedInbound || 0), 0),
    totalOutbound: devices.reduce((sum, d) => sum + (d.blockedOutbound || 0), 0),
  }

  return NextResponse.json({
    devices,
    stats,
    blockEvents: blockEvents.slice(0, 50), // Last 50 events
  })
}
