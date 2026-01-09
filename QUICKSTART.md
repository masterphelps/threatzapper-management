# ThreatZapper Fleet Manager - Quick Start Guide

Get authentication up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Supabase project created
- Git repository cloned

## Step 1: Install Dependencies

```bash
npm install
```

Dependencies already added:
- `jose` - JWT library
- `bcryptjs` - Password hashing
- `@types/bcryptjs` - TypeScript types

## Step 2: Set Up Database

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to your project → SQL Editor
3. Copy contents of `supabase/users_table.sql`
4. Paste and run the SQL

Alternatively, use the Supabase CLI:

```bash
supabase db push
```

## Step 3: Configure Environment

Create `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Get these from Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx...

# Generate with: openssl rand -hex 32
JWT_SECRET=your_random_jwt_secret_here

# Device API key (optional for now)
DEVICE_API_KEY=tz_your_device_api_key
```

Generate secrets:

```bash
# JWT Secret
openssl rand -hex 32

# Device API Key
echo "tz_$(openssl rand -hex 16)"
```

## Step 4: Start Development Server

```bash
npm run dev
```

Visit: `http://localhost:3000`

## Step 5: Test Authentication

### Option A: Browser Testing

1. Visit `http://localhost:3000/login`
2. Click "Sign Up" tab
3. Enter:
   - Name: Test User
   - Email: test@threatzapper.com
   - Password: testpass123
4. Click "Create Account"
5. You should be redirected to `/dashboard`
6. Refresh the page - you should stay logged in

### Option B: API Testing

```bash
# Create account
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@threatzapper.com",
    "password": "testpass123",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@threatzapper.com",
    "password": "testpass123"
  }' \
  -c cookies.txt

# Check auth status
curl http://localhost:3000/api/auth/me \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

## Step 6: Verify Protection

1. Open a new incognito/private window
2. Try to visit `http://localhost:3000/dashboard`
3. You should be redirected to `/login`
4. Login
5. You should be redirected back to `/dashboard`

That's it! Authentication is working.

## What Was Implemented

### Files Created

```
src/
├── lib/
│   └── auth.ts                    # JWT & password utilities
├── app/
│   ├── login/page.tsx             # Login/signup UI
│   ├── api/auth/
│   │   ├── signup/route.ts        # POST /api/auth/signup
│   │   ├── login/route.ts         # POST /api/auth/login
│   │   ├── logout/route.ts        # POST /api/auth/logout
│   │   └── me/route.ts            # GET /api/auth/me
└── middleware.ts                  # Protects /dashboard/*

supabase/
└── users_table.sql                # Database schema
```

### Features

- User registration with email/password
- Secure login with bcrypt password hashing
- JWT tokens stored in httpOnly cookies
- Automatic route protection via middleware
- Dark mode support on login page
- Session persistence (7 days)
- Secure logout

## Common Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## Next Steps

### Add Logout Button to Dashboard

Edit `src/app/dashboard/page.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div>
      <Button onClick={handleLogout}>Logout</Button>
      {/* Rest of dashboard */}
    </div>
  );
}
```

### Show Current User

```tsx
"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {user.name || user.email}!</h1>
    </div>
  );
}
```

## Troubleshooting

### "Not authenticated" when visiting /dashboard

**Problem:** Cookie not being set

**Solution:**
1. Check `.env.local` has `JWT_SECRET` set
2. Clear browser cookies
3. Try login again
4. Check browser DevTools → Application → Cookies
5. Verify `auth_token` cookie exists

### "User already exists"

**Problem:** Email already registered

**Solution:**
1. Use the "Sign In" tab instead
2. Or use a different email
3. Or delete the user from Supabase dashboard

### Build fails

**Problem:** Missing dependencies

**Solution:**
```bash
npm install jose bcryptjs @types/bcryptjs
```

### Token verification fails

**Problem:** JWT_SECRET changed or not set

**Solution:**
1. Check `.env.local` exists and has `JWT_SECRET`
2. Restart dev server: Ctrl+C then `npm run dev`
3. Clear cookies and login again

## Documentation

For detailed information:

- **`AUTH_README.md`** - Complete system documentation
- **`AUTH_INTEGRATION.md`** - Integration examples and patterns
- **`AUTH_SUMMARY.md`** - Quick reference and architecture
- **`DEPLOYMENT_CHECKLIST.md`** - Pre-deployment checklist

## Security Notes

### Development
- Cookies use `SameSite: lax`
- Cookies are `httpOnly` (not accessible via JavaScript)
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens expire after 7 days

### Production
- Always use HTTPS
- Cookies automatically use `Secure` flag
- Generate strong JWT_SECRET (32+ characters)
- Keep SUPABASE_SERVICE_ROLE_KEY secret

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/signup` | POST | No | Create account |
| `/api/auth/login` | POST | No | Login |
| `/api/auth/logout` | POST | No | Logout |
| `/api/auth/me` | GET | Yes | Get current user |

## Testing Checklist

- [ ] User can create account
- [ ] User can login
- [ ] User is redirected to dashboard after login
- [ ] User stays logged in after refresh
- [ ] Visiting /dashboard without auth redirects to /login
- [ ] User can logout
- [ ] Dark mode works on login page
- [ ] Password is hashed in database

## Support

If you run into issues:

1. Check the documentation files
2. Review console logs (browser + server)
3. Test with curl commands
4. Verify environment variables
5. Check Supabase logs

## Production Deployment

See `DEPLOYMENT_CHECKLIST.md` for complete production deployment guide.

Quick version:

1. Add environment variables to Vercel
2. Deploy: `vercel --prod`
3. Run database migration in production Supabase
4. Test authentication flows
5. Monitor logs for errors

## Success!

If you can:
1. Create an account
2. Login
3. Access /dashboard
4. Logout

Then authentication is working correctly!

## What's Next?

Optional enhancements (not implemented yet):

- Password reset via email
- Email verification
- Two-factor authentication (2FA)
- Social login (Google, GitHub)
- Session management
- Rate limiting

These can be added later as needed.

---

**Questions?** Check the full documentation in the other markdown files.
