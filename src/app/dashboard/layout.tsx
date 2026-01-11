"use client"

import { Sidebar } from "@/components/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <Sidebar onLogout={handleLogout} loggingOut={loggingOut} />

      {/* Main Content Area */}
      <div className="md:pl-64">
        {/* Header with Theme Toggle */}
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex-1" /> {/* Spacer for mobile menu offset */}
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
