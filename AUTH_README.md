# ThreatZapper Fleet Manager - Authentication System

This document explains the authentication system for the ThreatZapper Fleet Manager.

## Overview

The authentication system uses:
- **JWT tokens** (via `jose` library) for stateless authentication
- **bcrypt** for password hashing
- **httpOnly cookies** for secure token storage
- **Middleware** to protect dashboard routes
- **Supabase** for user data storage

## Setup Instructions

### 1. Database Setup

Run the SQL migration in your Supabase project:

```bash
# Copy the SQL and run in Supabase SQL Editor
cat supabase/users_table.sql
```

Or use the Supabase CLI:

```bash
supabase db push
```

### 2. Environment Variables

Add these to your `.env.local` file:

```bash
# Required for Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx...

# Required for JWT authentication
JWT_SECRET=your_jwt_secret_key_here

# Optional: Device API key (already exists)
DEVICE_API_KEY=tz_your_secret_api_key_here
```

Generate a secure JWT secret:

```bash
openssl rand -hex 32
```

### 3. Install Dependencies

Dependencies are already installed:
- `jose` - JWT generation and verification
- `bcryptjs` - Password hashing
- `@types/bcryptjs` - TypeScript types

## API Endpoints

### POST `/api/auth/signup`

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe" // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Errors:**
- `400` - Invalid email or password too short
- `409` - User already exists
- `500` - Server error

### POST `/api/auth/login`

Authenticate an existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Errors:**
- `400` - Invalid email format
- `401` - Invalid email or password
- `500` - Server error

### GET `/api/auth/me`

Get current authenticated user.

**Headers:**
- Cookie: `auth_token=<jwt>`

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2026-01-09T..."
  }
}
```

**Errors:**
- `401` - Not authenticated or invalid token
- `404` - User not found
- `500` - Server error

### POST `/api/auth/logout`

Clear authentication cookie.

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Authentication Flow

### Sign Up Flow

1. User fills out signup form at `/login`
2. Client sends POST to `/api/auth/signup`
3. Server validates email and password
4. Server hashes password with bcrypt
5. Server creates user in Supabase
6. Server generates JWT token
7. Server sets httpOnly cookie with token
8. Client redirects to `/dashboard`

### Login Flow

1. User fills out login form at `/login`
2. Client sends POST to `/api/auth/login`
3. Server finds user by email
4. Server verifies password with bcrypt
5. Server generates JWT token
6. Server sets httpOnly cookie with token
7. Client redirects to `/dashboard`

### Protected Route Access

1. User visits `/dashboard/*`
2. Middleware checks for `auth_token` cookie
3. If no cookie, redirect to `/login?from=/dashboard`
4. If cookie exists, verify JWT
5. If valid, allow access
6. If invalid, clear cookie and redirect to `/login`

## Security Features

### Password Security
- Minimum 8 characters required
- Hashed with bcrypt (salt rounds: 10)
- Never stored in plaintext
- Never returned in API responses

### JWT Security
- Signed with HS256 algorithm
- 7-day expiration
- Stored in httpOnly cookies (not accessible via JavaScript)
- SameSite: lax
- Secure flag in production

### Cookie Security
- `httpOnly: true` - Prevents XSS attacks
- `secure: true` - HTTPS only in production
- `sameSite: lax` - CSRF protection
- `maxAge: 7 days` - Auto-expiry

### Input Validation
- Email format validation
- Password strength validation
- SQL injection protection (via Supabase/Postgres)

## Usage in Frontend

### Check Authentication Status

```typescript
// Client component
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  if (!user) return <div>Loading...</div>;

  return <div>Hello {user.name}!</div>;
}
```

### Logout Function

```typescript
const handleLogout = async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  router.push('/login');
  router.refresh();
};
```

## File Structure

```
src/
├── lib/
│   └── auth.ts                      # Auth utilities (JWT, bcrypt)
├── app/
│   ├── login/
│   │   └── page.tsx                 # Login/signup UI
│   └── api/
│       └── auth/
│           ├── signup/route.ts      # POST /api/auth/signup
│           ├── login/route.ts       # POST /api/auth/login
│           ├── logout/route.ts      # POST /api/auth/logout
│           └── me/route.ts          # GET /api/auth/me
└── middleware.ts                    # Route protection
```

## Testing

### Create Test User

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@threatzapper.com",
    "password": "testpass123",
    "name": "Test User"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@threatzapper.com",
    "password": "testpass123"
  }' \
  -c cookies.txt
```

### Check Current User

```bash
curl http://localhost:3000/api/auth/me \
  -b cookies.txt
```

### Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

## Troubleshooting

### "Not authenticated" on dashboard

**Issue:** Middleware redirects to `/login` even after logging in.

**Solutions:**
1. Check that JWT_SECRET is set in `.env.local`
2. Clear browser cookies and try again
3. Check browser console for errors
4. Verify cookie is being set (DevTools → Application → Cookies)

### "User already exists" on signup

**Issue:** Email already registered.

**Solutions:**
1. Use the "Sign In" option instead
2. Use a different email address
3. Check Supabase dashboard to verify user exists

### Token verification fails

**Issue:** JWT verification returns null.

**Solutions:**
1. Verify JWT_SECRET matches between sessions
2. Check token hasn't expired (7 day limit)
3. Verify token format is correct
4. Clear cookies and re-authenticate

## Production Checklist

- [ ] Set strong JWT_SECRET (32+ character random string)
- [ ] Enable HTTPS (cookies only sent over secure connections)
- [ ] Configure CORS if using separate frontend domain
- [ ] Set up password reset flow (TODO)
- [ ] Add rate limiting on auth endpoints (TODO)
- [ ] Enable email verification (TODO)
- [ ] Add 2FA support (optional, TODO)
- [ ] Set up monitoring/alerting for failed login attempts
- [ ] Configure Supabase RLS policies properly
- [ ] Review and test all error messages

## Future Enhancements

- [ ] Password reset via email
- [ ] Email verification on signup
- [ ] Two-factor authentication (2FA)
- [ ] Social login (Google, GitHub, etc.)
- [ ] Session management (view/revoke active sessions)
- [ ] Rate limiting on auth endpoints
- [ ] Remember me functionality
- [ ] Account deletion
- [ ] Password change endpoint
- [ ] Audit log for auth events
