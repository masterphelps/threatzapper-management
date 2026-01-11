import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/stats - Get platform overview statistics
export async function GET() {
  try {
    // Count total users
    const { count: totalUsers } = await supabase
      .from("customer_users")
      .select("*", { count: "exact", head: true });

    // Count active subscriptions
    const { count: activeSubscriptions } = await supabase
      .from("customer_users")
      .select("*", { count: "exact", head: true })
      .eq("subscription_status", "active");

    // Count total devices
    const { count: totalDevices } = await supabase
      .from("devices")
      .select("*", { count: "exact", head: true });

    // Count online devices (status = online OR last_seen within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: onlineDevices } = await supabase
      .from("devices")
      .select("*", { count: "exact", head: true })
      .or(`status.eq.online,last_seen.gte.${fiveMinutesAgo}`);

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeSubscriptions: activeSubscriptions || 0,
      totalDevices: totalDevices || 0,
      onlineDevices: onlineDevices || 0,
    });
  } catch (error) {
    console.error("GET stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
