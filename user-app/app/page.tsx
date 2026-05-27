"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentPatient } from "@/lib/auth"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const patient = getCurrentPatient()
    if (patient) {
      router.push("/dashboard")
    } else {
      router.push("/login")
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )
}
