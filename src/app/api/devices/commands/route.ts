import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Valid command types
const VALID_COMMANDS = [
  "update_blocklist",
  "exec",
  "reboot",
  "update_firmware",
  "set_config",
  "file_download",
];

// POST - create a new command for a device
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate command type
    if (!data.type || !VALID_COMMANDS.includes(data.type)) {
      return NextResponse.json(
        { error: `Invalid command type. Must be one of: ${VALID_COMMANDS.join(", ")}` },
        { status: 400 }
      );
    }

    // deviceId is optional - null means broadcast to all devices
    const deviceId = data.deviceId || null;

    // If deviceId provided, verify device exists
    if (deviceId) {
      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .select("device_id")
        .eq("device_id", deviceId)
        .single();

      if (deviceError || !device) {
        return NextResponse.json(
          { error: "Device not found" },
          { status: 404 }
        );
      }
    }

    // Build payload based on command type
    let payload = data.payload || {};

    // Validate payload for specific command types
    switch (data.type) {
      case "update_blocklist":
      case "update_firmware":
        if (!payload.url) {
          return NextResponse.json(
            { error: "Payload must include 'url'" },
            { status: 400 }
          );
        }
        break;
      case "exec":
        if (!payload.script) {
          return NextResponse.json(
            { error: "Payload must include 'script'" },
            { status: 400 }
          );
        }
        break;
      case "file_download":
        if (!payload.url || !payload.path) {
          return NextResponse.json(
            { error: "Payload must include 'url' and 'path'" },
            { status: 400 }
          );
        }
        break;
      case "set_config":
        if (!payload.key || payload.value === undefined) {
          return NextResponse.json(
            { error: "Payload must include 'key' and 'value'" },
            { status: 400 }
          );
        }
        break;
      // reboot doesn't need payload validation
    }

    // Insert command
    const { data: command, error: insertError } = await supabase
      .from("device_commands")
      .insert({
        device_id: deviceId,
        command_type: data.type,
        payload: payload,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Command insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create command" },
        { status: 500 }
      );
    }

    const targetDesc = deviceId ? `device ${deviceId}` : "all devices";
    console.log(`[Command] Created ${data.type} for ${targetDesc}`);

    return NextResponse.json({
      success: true,
      command: {
        id: command.id,
        type: command.command_type,
        deviceId: command.device_id,
        status: command.status,
        createdAt: command.created_at,
      },
    });
  } catch (error) {
    console.error("Command creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - list commands (optionally filtered by device)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");
    const status = searchParams.get("status");

    let query = supabase
      .from("device_commands")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (deviceId) {
      query = query.eq("device_id", deviceId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data: commands, error } = await query;

    if (error) {
      console.error("Commands fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch commands" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      commands: (commands || []).map((c) => ({
        id: c.id,
        deviceId: c.device_id,
        type: c.command_type,
        payload: c.payload,
        status: c.status,
        result: c.result,
        createdAt: c.created_at,
        sentAt: c.sent_at,
        completedAt: c.completed_at,
      })),
    });
  } catch (error) {
    console.error("GET commands error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
