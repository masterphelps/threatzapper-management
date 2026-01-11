import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""

    // Query customer_users table directly with device count
    let query = supabase
      .from("customer_users")
      .select(`
        *,
        devices:devices(count)
      `)
      .order("created_at", { ascending: false })

    // Apply search filter if provided
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching users:", error)
      return NextResponse.json(
        { error: "Failed to fetch users", details: error.message },
        { status: 500 }
      )
    }

    // Transform snake_case to camelCase for frontend
    const users = (data || []).map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      subscriptionStatus: user.subscription_status || "trial",
      subscriptionPlan: user.subscription_plan,
      trialEndsAt: user.trial_ends_at,
      subscriptionExpiresAt: user.subscription_expires_at,
      stripeCustomerId: user.stripe_customer_id,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      // Handle the nested count from Supabase
      deviceCount: user.devices?.[0]?.count || 0,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Unexpected error in GET /api/users:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
