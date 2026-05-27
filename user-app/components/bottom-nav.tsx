"use client"

import { MessageSquare, ClipboardList, Home } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { getMessages, getPendingAssignments } from "@/lib/api"
import { useEffect, useState } from "react"
import { getCurrentPatient } from "@/lib/auth"

export function BottomNav() {
  const pathname = usePathname()
  const [showFormNotification, setShowFormNotification] = useState(false)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)

  useEffect(() => {
    const currentPatient = getCurrentPatient()
    if (currentPatient) {
      const checkData = async () => {
        // Check messages
        const msgs = await getMessages(currentPatient.id); // Assuming id is number, but we fixed api to accept string
        if (msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          if (!lastMsg.is_from_patient) {
            const lastRead = localStorage.getItem('lastReadMessageId');
            if (!lastRead || parseInt(lastRead) < lastMsg.id) {
              setHasUnreadMessages(true);
            } else {
              setHasUnreadMessages(false);
            }
          } else {
            setHasUnreadMessages(false);
          }
        }

        // Check assignments
        const completions = await getPendingAssignments();
        const hasPendingForms = completions.some(c => c.status === 'sent');
        setShowFormNotification(hasPendingForms);
      };

      checkData();
      const interval = setInterval(checkData, 5000);

      // Heartbeat every 60s
      const heartbeatInterval = setInterval(() => {
        // Dynamic import or passed prop to avoid import cycle if needed, but direct import is fine
        // Assuming update done in api.ts
      }, 60000);
      import("@/lib/api").then(api => api.sendHeartbeat());

      const hbInt = setInterval(() => {
        import("@/lib/api").then(api => api.sendHeartbeat());
      }, 60000);

      const handleStorage = () => checkData();
      window.addEventListener('storage', handleStorage);

      return () => {
        clearInterval(interval);
        clearInterval(hbInt);
        window.removeEventListener('storage', handleStorage);
      }
    }
  }, [pathname]) // Re-check on path change too

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/40">
      <div className="container max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-around gap-2">
          <Link
            href="/chat"
            className={`flex flex-col items-center gap-1 flex-1 py-2 px-3 rounded-xl transition-all active:scale-95 ${pathname === "/chat" ? "border-2 border-primary" : "border-2 border-transparent hover:border-border"
              }`}
          >
            <div className="relative">
              <MessageSquare className={`w-6 h-6 ${pathname === "/chat" ? "text-primary" : "text-muted-foreground"}`} />
              {hasUnreadMessages && pathname !== "/chat" && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background animate-pulse" />
              )}
            </div>
            <span className={`text-xs font-medium ${pathname === "/chat" ? "text-primary" : "text-muted-foreground"}`}>
              Chat
            </span>
          </Link>

          <Link
            href="/dashboard"
            className={`flex flex-col items-center gap-1 flex-1 py-2 px-3 rounded-xl transition-all active:scale-95 ${pathname === "/dashboard" ? "border-2 border-primary" : "border-2 border-transparent hover:border-border"
              }`}
          >
            <Home className={`w-6 h-6 ${pathname === "/dashboard" ? "text-primary" : "text-muted-foreground"}`} />
            <span
              className={`text-xs font-medium ${pathname === "/dashboard" ? "text-primary" : "text-muted-foreground"}`}
            >
              Inicio
            </span>
          </Link>

          <Link
            href="/formularios"
            className={`flex flex-col items-center gap-1 flex-1 py-2 px-3 rounded-xl transition-all active:scale-95 ${pathname === "/formularios"
              ? "border-2 border-primary"
              : "border-2 border-transparent hover:border-border"
              }`}
          >
            <div className="relative">
              <ClipboardList
                className={`w-6 h-6 ${pathname === "/formularios" ? "text-primary" : "text-muted-foreground"}`}
              />
              {showFormNotification && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background animate-pulse" />
              )}
            </div>
            <span
              className={`text-xs font-medium ${pathname === "/formularios" ? "text-primary" : "text-muted-foreground"}`}
            >
              Formularios
            </span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
