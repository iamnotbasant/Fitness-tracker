"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function ExportPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/profile")
  }, [router])

  return (
    <main className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
      <h2 className="text-lg font-semibold">Redirecting to Profile...</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Data Export & Import tools have been moved to your Profile page.
      </p>
      <Link
        href="/profile"
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Go to Profile
      </Link>
    </main>
  )
}