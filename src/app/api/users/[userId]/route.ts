import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { userId } = await params;

    // Fetch user from customer_users table
    const { data: user, error: userError } = await supabase
      .from('customer_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch user's devices
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('*')
      .eq('customer_user_id', userId);

    if (devicesError) {
      console.error('Error fetching user devices:', devicesError);
    }

    // Map database fields to camelCase
    const responseUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      subscriptionStatus: user.subscription_status,
      subscriptionPlan: user.subscription_plan,
      trialEndsAt: user.trial_ends_at,
      subscriptionExpiresAt: user.subscription_expires_at,
      stripeCustomerId: user.stripe_customer_id,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      devices: (devices || []).map(d => ({
        id: d.device_id,
        name: d.name,
        wifiIp: d.wifi_ip,
        mode: d.mode,
        firmware: d.firmware,
        uptime: d.uptime,
        blockedCount: (d.blocked_inbound || 0) + (d.blocked_outbound || 0),
        blockedInbound: d.blocked_inbound || 0,
        blockedOutbound: d.blocked_outbound || 0,
        wifiSsid: d.wifi_ssid,
        wifiSignal: d.wifi_signal,
        status: d.status,
        lastSeen: d.last_seen,
        firstSeen: d.first_seen,
      })),
    };

    return NextResponse.json(responseUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { userId } = await params;
    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = [
      'name',
      'subscription_status',
      'subscription_plan',
      'subscription_expires_at',
    ];

    const updateData: Record<string, any> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.subscriptionStatus !== undefined) {
      updateData.subscription_status = body.subscriptionStatus;
    }
    if (body.subscriptionPlan !== undefined) {
      updateData.subscription_plan = body.subscriptionPlan;
    }
    if (body.subscriptionExpiresAt !== undefined) {
      updateData.subscription_expires_at = body.subscriptionExpiresAt;
    }

    // Update user in database
    const { data: updatedUser, error: updateError } = await supabase
      .from('customer_users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError || !updatedUser) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Return updated user
    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      subscriptionStatus: updatedUser.subscription_status,
      subscriptionPlan: updatedUser.subscription_plan,
      trialEndsAt: updatedUser.trial_ends_at,
      subscriptionExpiresAt: updatedUser.subscription_expires_at,
      stripeCustomerId: updatedUser.stripe_customer_id,
      lastLogin: updatedUser.last_login,
      createdAt: updatedUser.created_at,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
