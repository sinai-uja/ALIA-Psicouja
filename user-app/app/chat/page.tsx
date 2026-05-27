"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { getCurrentPatient, type Patient } from "@/lib/auth"
import { getMessages, sendMessage, type ChatMessage } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import { BottomNav } from "@/components/bottom-nav"
import { cn } from "@/lib/utils"

export default function ChatPage() {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [psychologistOnline, setPsychologistOnline] = useState(false)
  const [psychologistIsTyping, setPsychologistIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingRef = useRef<NodeJS.Timeout | null>(null)
  const lastTypedSignalRef = useRef<number>(0)
  const router = useRouter()

  const refreshMessages = async (pId: string | number) => {
    const msgs = await getMessages(pId)
    setMessages(msgs)
  }

  useEffect(() => {
    const currentPatient = getCurrentPatient()
    if (!currentPatient) {
      router.push("/login")
    } else {
      setPatient(currentPatient)
      refreshMessages(currentPatient.id)

      const checkStatus = async () => {
        const mod = await import("@/lib/api")
        const status = await mod.getPatientStatus()
        if (status) setPsychologistOnline(status.psychologist_is_online)
        const typing = await mod.getTypingStatus(currentPatient.id)
        if (typing) setPsychologistIsTyping(typing.psychologist_is_typing)
      }

      checkStatus()

      const interval = setInterval(() => {
        refreshMessages(currentPatient.id)
        checkStatus()
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [router])

  const prevMessagesLength = useRef(0)
  const prevTyping = useRef(false)

  useEffect(() => {
    if (messages.length > prevMessagesLength.current || (psychologistIsTyping && !prevTyping.current)) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
    prevMessagesLength.current = messages.length
    prevTyping.current = psychologistIsTyping
  }, [messages, psychologistIsTyping])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)

    const now = Date.now()
    if (now - lastTypedSignalRef.current > 5000) {
      import("@/lib/api").then((mod) => mod.setTypingStatus(true))
      lastTypedSignalRef.current = now
    }

    if (typingRef.current) {
      clearTimeout(typingRef.current)
    }

    typingRef.current = setTimeout(() => {
      import("@/lib/api").then((mod) => mod.setTypingStatus(false))
      typingRef.current = null
      lastTypedSignalRef.current = 0
    }, 2000)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !patient || sending) return

    setSending(true)
    const messageContent = newMessage.trim()
    setNewMessage("")
    
    if (typingRef.current) clearTimeout(typingRef.current)
    import("@/lib/api").then((mod) => mod.setTypingStatus(false))
    typingRef.current = null
    lastTypedSignalRef.current = 0

    // Optimistic update could go here
    await sendMessage(patient.id, messageContent)
    await refreshMessages(patient.id)

    setSending(false)
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  if (!patient) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <header className="flex-none border-b bg-background/80 backdrop-blur-md z-10 shadow-sm">
        <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-sm shadow-sm">
              {patient.psychologistName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div
              className={cn(
                "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background shadow-sm",
                psychologistOnline ? "bg-green-500" : "bg-gray-400"
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm truncate">{patient.psychologistName}</h1>
            <p className={cn("text-xs", psychologistIsTyping ? "text-primary font-medium animate-pulse" : "text-muted-foreground")}>
              {psychologistIsTyping ? "Escribiendo..." : (psychologistOnline ? "En línea" : "Desconectado")}
            </p>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 touch-pan-y overscroll-contain">
        <div className="max-w-2xl mx-auto flex flex-col gap-4 pb-2 min-h-full justify-end">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm my-10 opacity-60">
              Los mensajes se limpiarán cuando el psicólogo termine la sesión.
            </div>
          )}
          {messages.map((message, index) => {
            const isFromPatient = message.is_from_patient
            const showAvatar = !isFromPatient && (index === 0 || messages[index - 1].is_from_patient)
            const isLong = message.content.length > 100

            return (
              <div
                key={message.id}
                className={cn(
                  "flex w-full",
                  isFromPatient ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "flex flex-col max-w-[80%]",
                    isFromPatient ? "items-end" : "items-start",
                    isLong && "w-full"
                  )}
                >
                  <div
                    className={cn(
                      "px-4 py-2.5 shadow-sm text-[15px] leading-relaxed break-words w-full",
                      isFromPatient
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                        : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm"
                    )}
                  >
                    <ExpandableMessage content={message.content} />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {new Date(message.created_at + "Z").toLocaleString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            )
          })}
          {psychologistIsTyping && (
            <div className="flex w-full justify-start mt-2">
              <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5 h-[42px]">
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-none bg-background border-t p-3 pb-[calc(100px+env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <form onSubmit={handleSend} className="flex gap-2 w-full items-center bg-slate-100 dark:bg-slate-800 rounded-[24px] px-2 py-1 border border-transparent focus-within:border-primary/50 transition-all">
            <Input
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Escribe un mensaje..."
              disabled={sending}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-2 h-auto text-[16px] placeholder:text-muted-foreground/70"
              autoComplete="off"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newMessage.trim() || sending}
              className={cn("h-8 w-8 rounded-full shrink-0 my-1", !newMessage.trim() ? "opacity-50" : "opacity-100")}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

function ExpandableMessage({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const maxLength = 300 // Character limit

  if (content.length <= maxLength) {
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
  }

  return (
    <div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {isExpanded ? content : `${content.slice(0, maxLength)}...`}
      </p>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs font-medium underline mt-1 opacity-80 hover:opacity-100 focus:outline-none"
      >
        {isExpanded ? "Leer menos" : "Leer más"}
      </button>
    </div>
  )
}
