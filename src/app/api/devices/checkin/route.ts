import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Device API key - devices must include this in Authorization header
const DEVICE_API_KEY = process.env.DEVICE_API_KEY || "tz_dev_key_change_me";

// Get public IP from request headers
function getPublicIP(request: NextRequest): string | null {
  // Vercel/Cloudflare provide these headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first (client) one
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP.trim();
  }

  return null;
}

// Simple IP geolocation using ip-api.com (free, no key required, 45 req/min)
async function geolocateIP(ip: string): Promise<{ lat: number; lng: number; city: string; country: string } | null> {
  try {
    // Skip private IPs
    if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.")) {
      return null;
    }

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon`, {
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== "success") return null;

    return {
      lat: data.lat,
      lng: data.lon,
      city: data.city || "",
      country: data.country || "",
    };
  } catch (error) {
    console.error("Geolocation error:", error);
    return null;
  }
}

function verifyApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  // Support both "Bearer <key>" and just "<key>"
  const key = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  return key === DEVICE_API_KEY;
}

export async function POST(request: NextRequest) {
  try {
    // Verify API key
    if (!verifyApiKey(request)) {
      console.log("[Checkin] Unauthorized - invalid or missing API key");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.deviceId) {
      return NextResponse.json(
        { error: "Missing required field: deviceId" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Get public IP and geolocate
    const publicIP = getPublicIP(request);
    let geoData: { lat: number; lng: number; city: string; country: string } | null = null;

    if (publicIP) {
      geoData = await geolocateIP(publicIP);
      if (geoData) {
        console.log(`[Geo] Device ${data.deviceId} at ${geoData.city}, ${geoData.country} (${publicIP})`);
      }
    }

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
          mac_address: data.macAddress || null,
          public_ip: publicIP,
          public_lat: geoData?.lat || null,
          public_lng: geoData?.lng || null,
          public_city: geoData?.city || null,
          public_country: geoData?.country || null,
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

    // Insert device metrics if present
    if (data.metrics) {
      const { error: metricsError } = await supabase
        .from("device_metrics")
        .insert({
          device_id: data.deviceId,
          disk_total_mb: data.metrics.diskTotalMb,
          disk_used_mb: data.metrics.diskUsedMb,
          mem_total_mb: data.metrics.memTotalMb,
          mem_used_mb: data.metrics.memUsedMb,
          cpu_load: data.metrics.cpuLoad,
          temp_celsius: data.metrics.tempCelsius,
        });

      if (metricsError) {
        console.error("Metrics insert error:", metricsError);
        // Don't fail the entire check-in if metrics fail
      } else {
        console.log(`[Metrics] Device ${data.deviceId} - CPU:${data.metrics.cpuLoad}% Temp:${data.metrics.tempCelsius}C`);
      }
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

    // Handle command results if device is reporting back
    if (data.commandResults && Array.isArray(data.commandResults)) {
      for (const result of data.commandResults) {
        if (result.id && result.status) {
          await supabase
            .from("device_commands")
            .update({
              status: result.status,
              result: result.message || null,
              completed_at: now,
            })
            .eq("id", result.id);

          console.log(`[Command] ${data.deviceId} - ${result.id}: ${result.status}`);
        }
      }
    }

    // Fetch pending commands for this device (including broadcasts where device_id is null)
    const { data: pendingCommands, error: commandsError } = await supabase
      .from("device_commands")
      .select("id, command_type, payload")
      .or(`device_id.eq.${data.deviceId},device_id.is.null`)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10);

    if (commandsError) {
      console.error("Commands fetch error:", commandsError);
    }

    // Mark commands as sent
    const commands = pendingCommands || [];
    if (commands.length > 0) {
      const commandIds = commands.map((c) => c.id);
      await supabase
        .from("device_commands")
        .update({ status: "sent", sent_at: now })
        .in("id", commandIds);

      console.log(`[Commands] Sent ${commands.length} commands to ${data.deviceId}`);
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
      commands: commands.map((c) => ({
        id: c.id,
        type: c.command_type,
        payload: c.payload,
      })),
    });
  } catch (error) {
    console.error("Checkin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - list all devices (for dashboard) - no auth required for dashboard
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
      firstSeen: d.created_at,
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
