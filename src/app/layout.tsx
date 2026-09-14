import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Toaster } from "@/components/ui/sonner"
import { AppNavigation } from "@/components/app-navigation"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: 'Fitness Tracker',
  description: 'Track your workouts and progress',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={`${GeistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
          storageKey="fitness-tracker-theme"
        >
          <AppNavigation />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}