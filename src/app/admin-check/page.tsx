"use client"

import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Copy, Check } from "lucide-react"

export default function AdminCheckPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login?redirect=/admin-check")
    }
  }, [session, isPending, router])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isPending) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </main>
    )
  }

  if (!session?.user) {
    return null
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-bold mb-6">User Information</h1>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">User ID</label>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-muted px-4 py-3 text-sm font-mono break-all">
                  {session.user.id}
                </code>
                <button
                  onClick={() => copyToClipboard(session.user.id)}
                  className="p-2 rounded-lg border hover:bg-secondary transition-colors"
                  title="Copy User ID"
                >
                  {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <div className="mt-2 rounded-lg bg-muted px-4 py-3 text-sm">
                {session.user.name}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <div className="mt-2 rounded-lg bg-muted px-4 py-3 text-sm">
                {session.user.email}
              </div>
            </div>

            {(session.user as any).isAdmin && (
              <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
                <p className="text-sm font-medium text-primary">
                  ✓ This account has admin privileges
                </p>
              </div>
            )}

            {!(session.user as any).isAdmin && (
              <div className="rounded-lg bg-muted px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  This account does not have admin privileges
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t">
            <h2 className="text-sm font-medium mb-3">Instructions</h2>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Copy your User ID from above</li>
              <li>Share the User ID with the developer</li>
              <li>They will update your account to admin status</li>
              <li>Refresh this page to see the admin status update</li>
            </ol>
          </div>

          <button
            onClick={() => router.push("/")}
            className="mt-6 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to Home
          </button>
        </div>
      </div>
    </main>
  )
}
