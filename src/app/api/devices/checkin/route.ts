import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.deviceId) {
      return NextResponse.json(
        { error: "Missing required field: deviceId" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Upsert device
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .upsert(
        {
          device_id: data.deviceId,
          wifi_ip: data.wifiIp || null,
          mode: data.mode || "bridge",
          firmware: data.firmware || "1.0.0",
          uptime: data.uptime || 0,
          blocked_inbound: data.blockedInbound || 0,
          blocked_outbound: data.blockedOutbound || 0,
          wifi_ssid: data.wifiSsid || null,
          wifi_signal: data.wifiSignal || null,
          status: "online",
          last_seen: now,
        },
        { onConflict: "device_id" }
      )
      .select()
      .single();

    if (deviceError) {
      console.error("Device upsert error:", deviceError);
      return NextResponse.json(
        { error: "Database error", details: deviceError.message },
        { status: 500 }
      );
    }

    // Record block event if there were any blocks
    const deltaIn = data.deltaInbound || 0;
    const deltaOut = data.deltaOutbound || 0;

    if (deltaIn > 0 || deltaOut > 0) {
      const { error: eventError } = await supabase.from("block_events").insert({
        device_id: data.deviceId,
        delta_inbound: deltaIn,
        delta_outbound: deltaOut,
        total_inbound: data.blockedInbound || 0,
        total_outbound: data.blockedOutbound || 0,
      });

      if (eventError) {
        console.error("Block event insert error:", eventError);
      } else {
        console.log(
          `[Block] Device ${data.deviceId} - IN:${deltaIn} OUT:${deltaOut}`
        );
      }
    }

    console.log(
      `[Checkin] Device ${data.deviceId} - ${data.mode} mode - ${data.wifiIp}`
    );

    return NextResponse.json({
      success: true,
      message: "Check-in recorded",
      device: {
        id: device.device_id,
        name: device.name,
      },
    });
  } catch (error) {
    console.error("Checkin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - list all devices (for dashboard)
export async function GET() {
  try {
    // Mark offline devices (no check-in for 5+ minutes)
    await supabase.rpc("mark_offline_devices");

    // Fetch all devices
    const { data: devices, error: devicesError } = await supabase
      .from("devices")
      .select("*")
      .order("last_seen", { ascending: false });

    if (devicesError) {
      console.error("Devices fetch error:", devicesError);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    // Fetch recent block events
    const { data: blockEvents, error: eventsError } = await supabase
      .from("block_events")
      .select("*, devices(name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (eventsError) {
      console.error("Events fetch error:", eventsError);
    }

    // Fetch stats
    const { data: stats, error: statsError } = await supabase
      .from("device_stats")
      .select("*")
      .single();

    if (statsError) {
      console.error("Stats fetch error:", statsError);
    }

    // Transform devices to frontend format
    const transformedDevices = (devices || []).map((d) => ({
      id: d.device_id,
      name: d.name,
      wifiIp: d.wifi_ip,
      mode: d.mode,
      firmware: d.firmware,
      uptime: d.uptime,
      lastSeen: d.last_seen,
      blockedInbound: d.blocked_inbound,
      blockedOutbound: d.blocked_outbound,
      blockedCount: d.blocked_inbound + d.blocked_outbound,
      wifiSsid: d.wifi_ssid,
      wifiSignal: d.wifi_signal,
      status: d.status,
    }));

    // Transform block events to frontend format
    const transformedEvents = (blockEvents || []).map((e) => ({
      id: e.id,
      deviceId: e.device_id,
      deviceName: e.devices?.name || e.device_id,
      timestamp: e.created_at,
      inbound: e.delta_inbound,
      outbound: e.delta_outbound,
    }));

    return NextResponse.json({
      devices: transformedDevices,
      stats: {
        totalDevices: stats?.total_devices || 0,
        onlineDevices: stats?.online_devices || 0,
        offlineDevices: stats?.offline_devices || 0,
        totalInbound: stats?.total_blocked_inbound || 0,
        totalOutbound: stats?.total_blocked_outbound || 0,
        totalBlocked:
          (stats?.total_blocked_inbound || 0) +
          (stats?.total_blocked_outbound || 0),
      },
      blockEvents: transformedEvents,
    });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
