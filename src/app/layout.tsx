import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "ThreatZapper Platform Manager",
  description: "Manage and monitor your ThreatZapper devices",
  icons: {
    icon: "/favicon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider defaultTheme="dark" storageKey="threatzapper-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
