import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  hashPassword,
  generateToken,
  isValidEmail,
  isValidPassword,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Parse body - handle requests without Content-Type header (from uclient-fetch)
    let body;
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      body = await request.json();
    } else {
      // Try to parse raw text as JSON
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
    const { email, password, name } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    // Check if user already exists in users table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Also check customer_users table
    const { data: existingCustomer } = await supabase
      .from('customer_users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Ignore checkError if it's just "no rows" - that's what we want

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user in users table (admin/management)
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: name || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('User creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create user', details: createError.message },
        { status: 500 }
      );
    }

    // ALSO create user in customer_users table (for portal.threatzapper.com)
    const { data: customerUser, error: customerError } = await supabase
      .from('customer_users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: name || null,
        email_verified: false,
      })
      .select()
      .single();

    if (customerError) {
      console.error('Customer user creation error:', customerError);
      // Don't fail the whole signup - admin account was created
      // Just log the error for now
      console.warn('User created in users table but not in customer_users');
    }

    // Generate JWT token
    const token = await generateToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      created_at: newUser.created_at,
    });

    // Create response with httpOnly cookie
    const response = NextResponse.json(
      {
        success: true,
        message: 'Account created successfully. You can now manage your account at portal.threatzapper.com',
        token, // Include token in body for device registration
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
        customerUserId: customerUser?.id, // Include customer_user_id for linking
      },
      { status: 201 }
    );

    // Set httpOnly cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    console.log(`[Auth] New user created: ${email}`);

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
