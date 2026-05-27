"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Clock, Lock, LogOut, Loader2 } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import * as api from "@/lib/api"

interface Message {
  id: string
  text: string
  sender: "patient" | "therapist"
  timestamp: Date
}

export default function PatientViewPage() {
  const params = useParams()
  const patientId = params.id as string
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [accessCode, setAccessCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hola! Bienvenido a TheraBot. Estoy aquí para apoyarte. ¿Cómo te sientes hoy?",
      sender: "therapist",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { t } = useLanguage()

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessCode) return

    setIsLoading(true)
    setError("")

    try {
      const patient = await api.patientLogin(patientId, accessCode.toUpperCase())

      if (patient) {
        setIsAuthenticated(true)
      } else {
        setError(t("invalidCode"))
      }
    } catch (err) {
      setError(t("errorOccurred"))
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (isAuthenticated) {
      scrollToBottom()
    }
  }, [messages, isAuthenticated])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: "patient",
      timestamp: new Date(),
    }

    setMessages([...messages, newMessage])
    setInputMessage("")

    // Simulate therapist response
    setTimeout(() => {
      const therapistResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "Gracias por compartir. Tu terapeuta ha sido notificado y revisará tu mensaje pronto.",
        sender: "therapist",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, therapistResponse])
    }, 1000)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-soft-blue via-soft-lavender to-soft-pink flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-2xl shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-calm-teal/10 rounded-full flex items-center justify-center mb-2">
              <Lock className="w-6 h-6 text-calm-teal" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-charcoal">{t("accessRequired")}</h1>
            <p className="text-muted-foreground">{t("enterAccessCode")}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Input
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="ex: AB12CD"
                  className="text-center text-lg tracking-widest uppercase h-12 rounded-xl border-soft-gray"
                  maxLength={6}
                />
                {error && <p className="text-sm text-soft-coral text-center font-medium">{error}</p>}
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white font-medium text-lg shadow-md">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  t("startChat")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setAccessCode("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-soft-blue via-soft-lavender to-soft-pink p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Card className="rounded-2xl border-0 shadow-xl overflow-hidden">
          <CardHeader className="bg-white border-b border-soft-gray p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-calm-teal/10 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-calm-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-neutral-charcoal">TeraUJA</h1>
                <p className="text-sm text-muted-foreground">Dr. Smith - Available Mon-Fri, 9AM-5PM</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-calm-teal/10">
                  <div className="w-2 h-2 rounded-full bg-calm-teal animate-pulse" />
                  <span className="text-sm font-medium text-calm-teal">{t("therapistAvailable")}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-soft-coral hover:bg-soft-coral/10 gap-2 h-8 px-3 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{t("logout")}</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-white to-muted/20">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.sender === "patient" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <Avatar
                    className={`h-10 w-10 ${message.sender === "therapist" ? "bg-calm-teal/10" : "bg-soft-peach/10"}`}
                  >
                    <AvatarFallback className={message.sender === "therapist" ? "text-calm-teal" : "text-soft-peach"}>
                      {message.sender === "therapist" ? "TB" : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`flex flex-col ${message.sender === "patient" ? "items-end" : "items-start"} max-w-[70%]`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 ${message.sender === "patient"
                        ? "bg-calm-teal text-white"
                        : "bg-white border border-soft-gray text-neutral-charcoal"
                        } shadow-sm`}
                    >
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 bg-white border-t border-soft-gray">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={t("typeYourMessage")}
                  className="flex-1 h-12 rounded-xl border-soft-gray focus:border-calm-teal focus:ring-calm-teal"
                />
                <Button
                  type="submit"
                  className="h-12 px-6 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                {t("confidentialSpace")}
              </p>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {t("contactSupport")}
                <a href="mailto:support@therabot.com" className="text-calm-teal hover:underline">
                  support@therabot.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
