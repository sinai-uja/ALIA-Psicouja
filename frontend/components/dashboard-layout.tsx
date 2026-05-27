"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Home, User, LogOut, Menu, X, Settings, ClipboardList, Shield } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { LanguageToggle } from "@/components/language-toggle"
import * as api from "@/lib/api"
import { NotificationListener } from "@/components/notification-listener"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { t } = useLanguage()
  const [userName, setUserName] = useState("Dr. Sarah Smith")

  const [userRole, setUserRole] = useState("")

  useEffect(() => {
    // Check local storage for user name
    const storedName = localStorage.getItem("userName")
    const storedRole = localStorage.getItem("userRole")
    const userId = localStorage.getItem("userId")

    if (storedName) {
      setUserName(storedName)
    }
    if (storedRole) {
      setUserRole(storedRole)
    }

    // Fetch fresh data if possible
    if (userId) {
      api.getUserProfile(userId).then(u => {
        if (u) {
          setUserName(u.name)
          localStorage.setItem("userName", u.name)
        }
      })
    }

    // Listen for updates from profile page
    const handleStorage = () => {
      const u = localStorage.getItem("userName")
      if (u) setUserName(u)
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  useEffect(() => {
    // Heartbeat every 60 seconds
    const interval = setInterval(() => {
      api.sendHeartbeat()
    }, 60000)

    // Initial heartbeat
    api.sendHeartbeat()

    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    await api.logout()
    router.push("/login")
  }

  const navigation = [
    { name: t("dashboard"), href: "/dashboard", icon: Home },
    { name: t("patients"), href: "/patients", icon: Users },
    { name: t("questionnaires"), href: "/questionnaires", icon: ClipboardList },
    { name: t("profile"), href: "/profile", icon: User },
    { name: t("settings"), href: "/settings", icon: Settings },
  ]

  if (userRole === 'admin') {
    navigation.splice(1, 0, { name: "Administración", href: "/admin", icon: Shield })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-soft-blue/20 via-soft-lavender/20 to-soft-pink/20">
      <NotificationListener />
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="rounded-xl bg-white shadow-md border-soft-gray"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <div className="fixed top-4 right-4 z-50">
        {/* <LanguageToggle /> */}
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-soft-gray shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-2 border-b border-soft-gray">
            <div className="flex flex-col items-center gap-2">
              <div className="w-40 h-40 flex items-center justify-center">
                <Image
                  src="/icon.svg"
                  alt="PsicoUJA Logo"
                  width={160}
                  height={160}
                  className="w-40 h-40 object-contain"
                  priority
                />
              </div>

            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    router.push(item.href)
                    setIsSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive
                    ? "bg-calm-teal/10 text-calm-teal"
                    : "text-muted-foreground hover:bg-muted hover:text-neutral-charcoal"
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </button>
              )
            })}
          </nav>

          {/* User profile */}
          <div className="p-4 border-t border-soft-gray">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <Avatar className="h-10 w-10 bg-calm-teal/10">
                <AvatarFallback className="text-calm-teal font-semibold">UJA</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {/* name of the user, variable */}
                <p className="text-sm font-medium text-neutral-charcoal truncate">{userName}</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full mt-2 justify-start text-muted-foreground hover:text-soft-coral hover:bg-soft-coral/10 rounded-xl"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t("logout")}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="p-8 pt-20 lg:pt-8">{children}</div>
      </main>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  )
}
