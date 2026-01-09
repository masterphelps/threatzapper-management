# ThreatZapper Fleet Manager - Deployment Checklist

## Pre-Deployment Setup

### 1. Database Migration

- [ ] Log into Supabase Dashboard
- [ ] Navigate to SQL Editor
- [ ] Copy contents of `supabase/users_table.sql`
- [ ] Execute the SQL migration
- [ ] Verify `users` table was created successfully
- [ ] Check table structure: id, email, password_hash, name, created_at, updated_at

### 2. Environment Variables

#### Required Variables

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key from Supabase
- [ ] `JWT_SECRET` - Generate with: `openssl rand -hex 32`
- [ ] `DEVICE_API_KEY` - Shared secret for device authentication

#### Local Development (.env.local)

```bash
# Copy .env.example to .env.local
cp .env.example .env.local

# Fill in the values:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx...
JWT_SECRET=$(openssl rand -hex 32)
DEVICE_API_KEY=tz_$(openssl rand -hex 16)
```

#### Production (Vercel)

- [ ] Add all environment variables to Vercel dashboard
- [ ] Ensure `JWT_SECRET` is different from development
- [ ] Verify `DEVICE_API_KEY` matches what devices will use

### 3. Install Dependencies

```bash
npm install
```

Verify these packages are installed:
- [ ] `jose` (^6.1.3)
- [ ] `bcryptjs` (^3.0.3)
- [ ] `@types/bcryptjs` (^2.4.6)

### 4. Build Test

```bash
npm run build
```

- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] Check for any warnings

## Testing Checklist

### Local Testing

#### Test 1: User Registration

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@threatzapper.com","password":"testpass123","name":"Test User"}'
```

- [ ] Returns 201 status
- [ ] Returns user object with id, email, name
- [ ] User appears in Supabase `users` table
- [ ] Password is hashed (not plaintext)

#### Test 2: User Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@threatzapper.com","password":"testpass123"}' \
  -c cookies.txt -v
```

- [ ] Returns 200 status
- [ ] Returns success message and user object
- [ ] Sets `auth_token` cookie
- [ ] Cookie has `HttpOnly` flag
- [ ] Cookie has correct `maxAge` (7 days)

#### Test 3: Get Current User

```bash
curl http://localhost:3000/api/auth/me \
  -b cookies.txt
```

- [ ] Returns 200 status
- [ ] Returns user object (id, email, name, createdAt)
- [ ] Matches logged-in user

#### Test 4: Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt -v
```

- [ ] Returns 200 status
- [ ] Clears `auth_token` cookie
- [ ] Subsequent `/api/auth/me` request returns 401

#### Test 5: Browser Testing

- [ ] Visit `http://localhost:3000/login`
- [ ] Create a new account
- [ ] Verify redirect to `/dashboard`
- [ ] Refresh page - should stay on dashboard
- [ ] Open DevTools → Application → Cookies
- [ ] Verify `auth_token` cookie exists and is HttpOnly
- [ ] Clear cookies manually
- [ ] Visit `/dashboard` - should redirect to `/login`

#### Test 6: Protected Routes

- [ ] Visit `/dashboard` without auth → redirects to `/login`
- [ ] Login successfully → redirects back to `/dashboard`
- [ ] Visit `/dashboard` again → no redirect (still authenticated)

#### Test 7: Dark Mode

- [ ] Login page displays correctly in light mode
- [ ] Login page displays correctly in dark mode
- [ ] Toggle theme and verify all elements have proper contrast
- [ ] Check input fields, buttons, error messages

#### Test 8: Error Handling

- [ ] Try logging in with wrong password → shows error
- [ ] Try logging in with non-existent email → shows error
- [ ] Try signing up with existing email → shows "User already exists"
- [ ] Try signing up with password < 8 chars → shows error
- [ ] Try signing up with invalid email → shows error

### Production Testing

After deploying to Vercel:

- [ ] Visit production URL `/login`
- [ ] Create a test account
- [ ] Verify authentication works
- [ ] Check cookies are set with `Secure` flag
- [ ] Test all protected routes
- [ ] Verify logout functionality
- [ ] Test on mobile devices
- [ ] Test on different browsers (Chrome, Firefox, Safari)

## Security Checklist

### Pre-Deployment

- [ ] JWT_SECRET is strong (32+ random characters)
- [ ] JWT_SECRET is different in production vs development
- [ ] SUPABASE_SERVICE_ROLE_KEY is not committed to git
- [ ] All sensitive env vars are in .env.local (not .env)
- [ ] `.env.local` is in `.gitignore`

### Production

- [ ] Cookies use `Secure` flag (HTTPS only)
- [ ] Cookies use `HttpOnly` flag
- [ ] Cookies use `SameSite: lax`
- [ ] Passwords are hashed with bcrypt (never plaintext)
- [ ] JWT tokens expire (7 days)
- [ ] No sensitive data in JWT payload
- [ ] Supabase RLS policies are enabled
- [ ] API endpoints validate all input

### HTTPS

- [ ] Production site uses HTTPS
- [ ] All API calls use HTTPS
- [ ] No mixed content warnings

## Performance Checklist

- [ ] JWT verification is fast (< 10ms)
- [ ] Password hashing doesn't block (10 salt rounds is reasonable)
- [ ] Middleware doesn't slow down requests significantly
- [ ] Database queries are indexed (email column)
- [ ] No N+1 queries

## Monitoring

### After Deployment

- [ ] Check Vercel logs for errors
- [ ] Monitor Supabase usage
- [ ] Set up alerts for auth failures
- [ ] Track signup/login metrics
- [ ] Monitor JWT expiration issues

### Recommended Metrics to Track

- Signup rate (users/day)
- Login success rate
- Login failure rate
- Token expiration rate
- Average session duration
- Password reset requests (when implemented)

## Rollback Plan

If authentication is broken in production:

### Option 1: Quick Fix
1. Revert to previous Vercel deployment
2. Investigate issue in development
3. Fix and redeploy

### Option 2: Disable Auth
1. Temporarily remove middleware (comment out protection)
2. Redeploy
3. Fix auth system
4. Re-enable middleware
5. Redeploy

### Option 3: Emergency Access
1. Create admin user directly in Supabase
2. Generate JWT manually using Node.js script
3. Set cookie manually in browser DevTools
4. Access dashboard to investigate

## Common Issues & Solutions

### Issue: Cookies not being set

**Symptoms:**
- Login succeeds but still redirected to /login
- auth_token cookie not in browser DevTools

**Solutions:**
- Verify NODE_ENV is set correctly
- Check that response.cookies.set() is being called
- Verify domain/path settings on cookie
- Test with curl -v to see Set-Cookie header

### Issue: Token verification fails

**Symptoms:**
- Middleware redirects to login after successful login
- /api/auth/me returns 401

**Solutions:**
- Verify JWT_SECRET matches between environments
- Check token hasn't expired
- Verify token format is correct (Bearer prefix?)
- Check that jose library is installed

### Issue: Password hashing too slow

**Symptoms:**
- Signup/login takes > 1 second
- Timeouts on API requests

**Solutions:**
- Reduce bcrypt salt rounds (currently 10)
- Consider moving to edge function
- Add caching for frequently-accessed users

### Issue: Middleware slows down site

**Symptoms:**
- All pages load slowly
- Middleware executes on every request

**Solutions:**
- Verify matcher config excludes static files
- Check JWT verification is fast
- Consider caching user lookups
- Profile middleware with console.time()

## Post-Deployment Tasks

### Immediate (Day 1)

- [ ] Create admin account
- [ ] Test all authentication flows in production
- [ ] Monitor error logs for issues
- [ ] Verify email notifications work (if implemented)

### Week 1

- [ ] Review signup/login metrics
- [ ] Check for any authentication errors
- [ ] Gather user feedback
- [ ] Plan additional auth features

### Month 1

- [ ] Implement password reset (if needed)
- [ ] Add email verification (if needed)
- [ ] Review security logs
- [ ] Update documentation based on learnings

## Additional Features to Implement Later

Priority order:

1. **Password Reset** (High Priority)
   - User requests reset via email
   - Send reset link with token
   - Allow password update

2. **Email Verification** (Medium Priority)
   - Send verification email on signup
   - Verify email before allowing login

3. **Two-Factor Authentication** (Medium Priority)
   - TOTP-based 2FA
   - SMS-based 2FA

4. **Social Login** (Low Priority)
   - Google OAuth
   - GitHub OAuth

5. **Session Management** (Low Priority)
   - View active sessions
   - Revoke sessions remotely

6. **Rate Limiting** (High Priority)
   - Prevent brute force attacks
   - Limit failed login attempts

## Support & Documentation

If you encounter issues:

1. **Read the docs:**
   - `AUTH_README.md` - Complete system documentation
   - `AUTH_INTEGRATION.md` - Integration examples
   - `AUTH_SUMMARY.md` - Quick reference

2. **Check logs:**
   - Browser DevTools Console
   - Vercel Logs
   - Supabase Logs

3. **Debug tools:**
   - Use curl to test API endpoints
   - Check cookies in DevTools
   - Verify JWT at jwt.io (decode only, never verify with real secret)

4. **Common commands:**
   ```bash
   # Test signup
   curl -X POST localhost:3000/api/auth/signup -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"password123"}'

   # Test login
   curl -X POST localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"password123"}' -c cookies.txt

   # Test auth
   curl localhost:3000/api/auth/me -b cookies.txt
   ```

## Final Verification

Before marking deployment as complete:

- [ ] All checklist items above are completed
- [ ] Tests pass in production
- [ ] No errors in logs
- [ ] Users can create accounts
- [ ] Users can login
- [ ] Protected routes work correctly
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] Documentation is up to date

## Sign-Off

Deployment completed by: _______________

Date: _______________

Production URL: _______________

Notes:
_________________________________________________
_________________________________________________
_________________________________________________
