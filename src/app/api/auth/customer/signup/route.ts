import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  hashPassword,
  generateToken,
  isValidEmail,
  isValidPassword,
} from '@/lib/auth';

// Customer signup - called by device setup wizard
// Creates account in customer_users table (NOT users table - that's for admins)
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

    // Check if customer already exists
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

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create customer user
    const { data: newUser, error: createError } = await supabase
      .from('customer_users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name: name || null,
        email_verified: false,
      })
      .select()
      .single();

    if (createError) {
      console.error('Customer user creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create user', details: createError.message },
        { status: 500 }
      );
    }

    // Generate JWT token
    const token = await generateToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      created_at: newUser.created_at,
    });

    console.log(`[Auth] New customer created: ${email}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully. You can now manage your account at portal.threatzapper.com',
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
        customerUserId: newUser.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Customer signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
