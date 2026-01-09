import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";

// POST /api/devices/register - Register a device to a user account
export async function POST(request: NextRequest) {
  try {
    // Parse body - handle requests without Content-Type header (from uclient-fetch)
    let body;
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      body = await request.json();
    } else {
      const text = await request.text();
      try {
        body = JSON.parse(text);
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid JSON body" },
          { status: 400 }
        );
      }
    }
    const { deviceId, token: bodyToken } = body;

    // Get auth token from header OR body (uclient-fetch can't send headers)
    const authHeader = request.headers.get("Authorization");
    let token: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (bodyToken) {
      token = bodyToken;
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authorization required" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "Device ID is required" },
        { status: 400 }
      );
    }

    // Check if device exists
    const { data: existingDevice } = await supabase
      .from("devices")
      .select("device_id, user_id")
      .eq("device_id", deviceId)
      .single();

    if (existingDevice) {
      // Device exists - check if already registered to another user
      if (existingDevice.user_id && existingDevice.user_id !== payload.userId) {
        return NextResponse.json(
          { success: false, error: "Device is already registered to another account" },
          { status: 409 }
        );
      }

      // Update device to link to this user
      const { error: updateError } = await supabase
        .from("devices")
        .update({ user_id: payload.userId })
        .eq("device_id", deviceId);

      if (updateError) {
        console.error("Device update error:", updateError);
        return NextResponse.json(
          { success: false, error: "Failed to register device" },
          { status: 500 }
        );
      }
    } else {
      // Device doesn't exist yet - create it
      const { error: insertError } = await supabase
        .from("devices")
        .insert({
          device_id: deviceId,
          user_id: payload.userId,
          name: `Device ${deviceId.slice(-6)}`,
          status: "offline",
          mode: "router", // Default to router mode (setup mode)
        });

      if (insertError) {
        console.error("Device insert error:", insertError);
        return NextResponse.json(
          { success: false, error: "Failed to register device" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      deviceId,
      message: "Device registered successfully",
    });
  } catch (error) {
    console.error("Device registration error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
