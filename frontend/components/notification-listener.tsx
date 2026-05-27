"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import * as api from "@/lib/api"
import { MessageSquare } from "lucide-react"

export function NotificationListener() {
  const router = useRouter()
  const pathname = usePathname()
  const lastActivityRef = useRef<number | null>(null)
  const isFirstRun = useRef(true)

  useEffect(() => {
    // Request notification permission on mount
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission()
      }
    }

    const checkNotifications = async () => {
      try {
        const psychologistId = localStorage.getItem("userId")
        if (!psychologistId) return

        const stats = await api.getDashboardStats(psychologistId)
        if (!stats || !stats.recent_activity) return

        // Find the most recent message activity from a patient
        const latestMessage = stats.recent_activity.find(
          (a: any) => a.type === "message" && a.action === "Nuevo mensaje recibido"
        )

        if (latestMessage) {
          const messageTime = latestMessage.timestamp

          // If it's a new message since our last check
          if (lastActivityRef.current === null || messageTime > lastActivityRef.current) {
            
            // Only notify if NOT on the first run (to avoid notifying about old messages on login)
            // and if NOT currently viewing that patient's chat
            const isViewingThisPatient = pathname?.includes(`/patients/${latestMessage.patient_id}`)

            if (!isFirstRun.current && !isViewingThisPatient) {
              const patientName = latestMessage.patient || "Paciente"
              
              // 1. Show In-App Toast
              toast(`Nuevo mensaje de ${patientName}`, {
                description: "Haz clic para ver el mensaje",
                icon: <MessageSquare className="h-4 w-4 text-calm-teal" />,
                action: {
                  label: "Ver Chat",
                  onClick: () => router.push(`/patients/${latestMessage.patient_id}/statistics?openChat=true`),
                },
              })

              // 2. Show Browser Notification
              if ("Notification" in window && Notification.permission === "granted") {
                const notification = new Notification(`Nuevo mensaje: ${patientName}`, {
                  body: "Haz clic para responder",
                  icon: "/icon.svg", // Reusing app icon
                })
                notification.onclick = () => {
                  window.focus()
                  router.push(`/patients/${latestMessage.patient_id}/statistics?openChat=true`)
                }
              }
            }
            
            lastActivityRef.current = messageTime
          }
        }
        
        isFirstRun.current = false
      } catch (error) {
        console.error("Error checking notifications:", error)
      }
    }

    // Check every 7 seconds (slightly different from dashboard polling to spread load)
    const interval = setInterval(checkNotifications, 7000)
    
    // Initial check after a short delay
    const timeout = setTimeout(checkNotifications, 2000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [pathname, router])

  return null // This component doesn't render anything
}
