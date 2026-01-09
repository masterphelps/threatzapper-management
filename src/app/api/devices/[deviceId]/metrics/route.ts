import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/devices/[deviceId]/metrics - Get device metrics time-series
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const since = searchParams.get("since"); // ISO timestamp

    // Build query
    let query = supabase
      .from("device_metrics")
      .select("*")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Apply since filter if provided
    if (since) {
      query = query.gte("created_at", since);
    }

    const { data: metrics, error } = await query;

    if (error) {
      console.error("Metrics fetch error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    // Transform to frontend format
    const transformedMetrics = (metrics || []).map((m) => ({
      id: m.id,
      deviceId: m.device_id,
      diskTotalMb: m.disk_total_mb,
      diskUsedMb: m.disk_used_mb,
      memTotalMb: m.mem_total_mb,
      memUsedMb: m.mem_used_mb,
      cpuLoad: m.cpu_load,
      tempCelsius: m.temp_celsius,
      createdAt: m.created_at,
    }));

    return NextResponse.json({
      deviceId,
      count: transformedMetrics.length,
      metrics: transformedMetrics,
    });
  } catch (error) {
    console.error("GET metrics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
