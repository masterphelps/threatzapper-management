import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/devices/[deviceId]/events - Get device block events
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const since = searchParams.get("since"); // ISO timestamp

    // Build query
    let query = supabase
      .from("block_events")
      .select("*, devices(name)")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Apply since filter if provided
    if (since) {
      query = query.gte("created_at", since);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error("Events fetch error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    // Transform to frontend format
    const transformedEvents = (events || []).map((e) => ({
      id: e.id,
      deviceId: e.device_id,
      deviceName: e.devices?.name || e.device_id,
      timestamp: e.created_at,
      inbound: e.delta_inbound,
      outbound: e.delta_outbound,
    }));

    return NextResponse.json({
      deviceId,
      count: transformedEvents.length,
      events: transformedEvents,
    });
  } catch (error) {
    console.error("GET events error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
