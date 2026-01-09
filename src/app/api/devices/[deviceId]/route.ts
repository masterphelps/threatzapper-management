import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/devices/[deviceId] - Get single device with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;

    // Fetch device
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_id", deviceId)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    // Fetch latest metrics
    const { data: latestMetrics } = await supabase
      .from("device_metrics")
      .select("*")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Fetch recent block events (last 50)
    const { data: blockEvents } = await supabase
      .from("block_events")
      .select("*")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch recent commands (last 20)
    const { data: commands } = await supabase
      .from("device_commands")
      .select("*")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Transform to frontend format
    const deviceDetail = {
      id: device.device_id,
      name: device.name,
      wifiIp: device.wifi_ip,
      mode: device.mode,
      firmware: device.firmware,
      uptime: device.uptime,
      lastSeen: device.last_seen,
      blockedInbound: device.blocked_inbound,
      blockedOutbound: device.blocked_outbound,
      blockedCount: device.blocked_inbound + device.blocked_outbound,
      wifiSsid: device.wifi_ssid,
      wifiSignal: device.wifi_signal,
      status: device.status,
      macAddress: device.mac_address,
      firstSeen: device.created_at,
      lastReboot: device.last_reboot,
      metrics: latestMetrics ? {
        id: latestMetrics.id,
        deviceId: latestMetrics.device_id,
        diskTotalMb: latestMetrics.disk_total_mb,
        diskUsedMb: latestMetrics.disk_used_mb,
        memTotalMb: latestMetrics.mem_total_mb,
        memUsedMb: latestMetrics.mem_used_mb,
        cpuLoad: latestMetrics.cpu_load,
        tempCelsius: latestMetrics.temp_celsius,
        createdAt: latestMetrics.created_at,
      } : undefined,
      recentEvents: (blockEvents || []).map((e) => ({
        id: e.id,
        deviceId: e.device_id,
        timestamp: e.created_at,
        inbound: e.delta_inbound,
        outbound: e.delta_outbound,
        totalInbound: e.total_inbound,
        totalOutbound: e.total_outbound,
      })),
      recentCommands: (commands || []).map((c) => ({
        id: c.id,
        type: c.command_type,
        status: c.status,
        createdAt: c.created_at,
        sentAt: c.sent_at,
        completedAt: c.completed_at,
        result: c.result,
      })),
    };

    return NextResponse.json(deviceDetail);
  } catch (error) {
    console.error("GET device error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
