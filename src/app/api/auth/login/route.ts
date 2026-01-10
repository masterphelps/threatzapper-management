import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Parse body - handle requests without Content-Type header (from uclient-fetch)
    let body;
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      body = await request.json();
    } else {
      const text = await request.text();
      try {
        body = JSON.parse(text);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid JSON body' },
          { status: 400 }
        );
      }
    }
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find admin user by username (stored as email internally)
    const email = `${username.toLowerCase()}@threatzapper.internal`;
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Extract username from email for token/response
    const usernameFromEmail = user.email.split('@')[0];

    // Generate JWT token
    const token = await generateToken({
      id: user.id,
      username: usernameFromEmail,
      name: user.name,
      created_at: user.created_at,
    });

    // Create response with httpOnly cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      token, // Include token in body for device registration
      user: {
        id: user.id,
        username: usernameFromEmail,
        name: user.name,
      },
    });

    // Set httpOnly cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    console.log(`[Auth] User logged in: ${usernameFromEmail}`);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
