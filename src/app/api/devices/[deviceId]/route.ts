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
      // Geo/Network info
      publicIp: device.public_ip,
      publicCity: device.public_city,
      publicCountry: device.public_country,
      publicLat: device.public_lat,
      publicLng: device.public_lng,
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

// PATCH /api/devices/[deviceId] - Update device (rename)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const body = await request.json();

    // Validate name if provided
    if (body.name !== undefined && typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Name must be a string" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, string | null> = {};
    if (body.name !== undefined) {
      updateData.name = body.name.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: device, error } = await supabase
      .from("devices")
      .update(updateData)
      .eq("device_id", deviceId)
      .select()
      .single();

    if (error || !device) {
      return NextResponse.json(
        { error: "Device not found or update failed" },
        { status: 404 }
      );
    }

    console.log(`[Device] Renamed ${deviceId} to "${device.name}"`);

    return NextResponse.json({
      success: true,
      device: {
        id: device.device_id,
        name: device.name,
      },
    });
  } catch (error) {
    console.error("PATCH device error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/devices/[deviceId] - Delete a device and all associated data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;

    // First verify the device exists
    const { data: device, error: findError } = await supabase
      .from("devices")
      .select("device_id")
      .eq("device_id", deviceId)
      .single();

    if (findError || !device) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    // Delete related data first (due to foreign key constraints)
    // Delete block events
    await supabase
      .from("block_events")
      .delete()
      .eq("device_id", deviceId);

    // Delete device metrics
    await supabase
      .from("device_metrics")
      .delete()
      .eq("device_id", deviceId);

    // Delete device commands
    await supabase
      .from("device_commands")
      .delete()
      .eq("device_id", deviceId);

    // Finally delete the device
    const { error: deleteError } = await supabase
      .from("devices")
      .delete()
      .eq("device_id", deviceId);

    if (deleteError) {
      console.error("Failed to delete device:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete device" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Device deleted" });
  } catch (error) {
    console.error("DELETE device error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
