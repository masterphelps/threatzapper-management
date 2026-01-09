# Auth Integration Guide

Quick guide for integrating authentication into existing ThreatZapper Fleet Manager pages.

## 1. Protecting Pages

Pages under `/dashboard/*` are automatically protected by middleware. No additional code needed.

If you want to protect other routes, update `src/middleware.ts`:

```typescript
// Add more protected paths
if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
  // Protection logic...
}
```

## 2. Adding Logout Button to Dashboard

Example for adding a logout button to the dashboard nav:

```tsx
// src/components/dashboard-header.tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function DashboardHeader() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="border-b border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          ThreatZapper Fleet Manager
        </h1>
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
```

## 3. Displaying Current User

Example for showing the logged-in user's name:

```tsx
"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name?: string;
}

export function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  if (!user) {
    return <div className="text-gray-400">Not logged in</div>;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
        <span className="text-white font-medium text-sm">
          {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
        </span>
      </div>
      <div>
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {user.name || user.email}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {user.email}
        </div>
      </div>
    </div>
  );
}
```

## 4. Server-Side User Access

If you need to access the user on the server side:

```tsx
// src/app/dashboard/page.tsx
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  // Get token from cookie
  const token = cookies().get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  // Verify token
  const payload = await verifyToken(token);

  if (!payload) {
    redirect("/login");
  }

  // Fetch user from database
  const { data: user } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("id", payload.userId)
    .single();

  return (
    <div>
      <h1>Welcome back, {user?.name || user?.email}!</h1>
    </div>
  );
}
```

## 5. Restricting API Endpoints

Example for protecting an API route:

```typescript
// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // Get token from cookie
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify token
  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // User is authenticated, proceed with logic
  // payload.userId contains the user's ID
  // payload.email contains the user's email

  return NextResponse.json({ message: "Success" });
}
```

## 6. Role-Based Access Control (Future)

To add roles (admin, user, etc.), modify the database:

```sql
-- Add role column to users table
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';

-- Create check constraint
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'admin'));
```

Update JWT payload in `src/lib/auth.ts`:

```typescript
export interface JWTPayload {
  userId: string;
  email: string;
  role: string; // Add this
  iat: number;
  exp: number;
}

export async function generateToken(user: User): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role, // Add this
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return token;
}
```

Then check role in middleware or API routes:

```typescript
const payload = await verifyToken(token);

if (payload?.role !== "admin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

## 7. Custom Login Redirect

To redirect to different pages after login based on user type:

```tsx
// src/app/login/page.tsx
// In handleSubmit function:

const response = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const data = await response.json();

if (response.ok) {
  // Custom redirect based on user data
  if (data.user.role === "admin") {
    router.push("/admin");
  } else {
    router.push(from); // Default to original destination
  }
  router.refresh();
}
```

## 8. Remember Me Functionality

To add "Remember Me" checkbox that extends session:

In `src/app/login/page.tsx`:

```tsx
const [rememberMe, setRememberMe] = useState(false);

// In the form:
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={rememberMe}
    onChange={(e) => setRememberMe(e.target.checked)}
  />
  <span className="text-sm text-gray-600 dark:text-gray-400">
    Remember me for 30 days
  </span>
</label>
```

Update login/signup routes to accept `rememberMe` parameter and adjust cookie `maxAge` accordingly.

## 9. Testing Auth in Development

Quick test commands:

```bash
# Create a test user
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Check auth
curl http://localhost:3000/api/auth/me -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

## 10. Common Patterns

### Loading State

```tsx
const [loading, setLoading] = useState(true);
const [user, setUser] = useState(null);

useEffect(() => {
  fetch("/api/auth/me")
    .then((res) => res.json())
    .then((data) => setUser(data.user))
    .catch(() => setUser(null))
    .finally(() => setLoading(false));
}, []);

if (loading) return <LoadingSpinner />;
```

### Error Handling

```tsx
const [error, setError] = useState("");

const handleLogin = async () => {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Login failed");
      return;
    }

    // Success
    router.push("/dashboard");
  } catch (err) {
    setError("Network error. Please try again.");
  }
};
```

### Auth Context (Optional)

For global auth state across components:

```tsx
// src/contexts/auth-context.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContext {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContext | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
```

Then wrap your app:

```tsx
// src/app/layout.tsx
import { AuthProvider } from "@/contexts/auth-context";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

Use in components:

```tsx
import { useAuth } from "@/contexts/auth-context";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <div>
      {user && <button onClick={logout}>Logout</button>}
    </div>
  );
}
```
