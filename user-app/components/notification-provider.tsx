"use client"

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { getCurrentPatient } from "@/lib/auth"
import { getPendingAssignments, getMessages, registerFCMToken, testPushNotification } from "@/lib/api"
import { requestFCMToken, onForegroundMessage, initializeFirebaseApp } from "@/lib/firebase"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Bell, X } from "lucide-react"

interface NotificationContextType {
    showPermissionModal: () => void
    permission: NotificationPermission
    testNotification: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotification() {
    const context = useContext(NotificationContext)
    if (!context) {
        throw new Error("useNotification must be used within a NotificationProvider")
    }
    return context
}

// Helper to safely check if Notification API is available
// iOS Safari does NOT support Notification API in regular browser mode (only installed PWAs)
function isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window
}

// --- SessionStorage helpers for known IDs (survives iPhone suspend/resume) ---
const KNOWN_IDS_KEY = "notification_known_ids"
const KNOWN_MSG_IDS_KEY = "notification_known_msg_ids"

function loadKnownIds(key: string): Set<number> {
    if (typeof window === 'undefined') return new Set()
    try {
        const stored = sessionStorage.getItem(key)
        if (stored) {
            return new Set(JSON.parse(stored) as number[])
        }
    } catch { /* ignore */ }
    return new Set()
}

function saveKnownIds(key: string, ids: Set<number>) {
    if (typeof window === 'undefined') return
    try {
        sessionStorage.setItem(key, JSON.stringify([...ids]))
    } catch { /* ignore */ }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [permission, setPermission] = useState<NotificationPermission>('default')
    const [showPermissionRequest, setShowPermissionRequest] = useState(false)
    const fcmInitRef = useRef(false)
    const fcmActiveRef = useRef(false) // tracks whether FCM push is active
    const initRef = useRef(false)
    const pathname = usePathname()

    // Use refs for known IDs to avoid useEffect dependency loops
    const knownIdsRef = useRef<Set<number>>(loadKnownIds(KNOWN_IDS_KEY))
    const knownMessageIdsRef = useRef<Set<number>>(loadKnownIds(KNOWN_MSG_IDS_KEY))

    const initFCM = useCallback(async () => {
        try {
            // Only run once per session if successful
            if (fcmInitRef.current) return

            // Initialize Firebase
            initializeFirebaseApp()

            // Request permission and get FCM token
            const token = await requestFCMToken()

            if (token) {
                setPermission('granted')
                fcmInitRef.current = true
                fcmActiveRef.current = true

                // Register token with backend
                const registered = await registerFCMToken(token)
                if (!registered) {
                    console.error("Failed to register token with backend")
                }
            } else {
                setPermission(isNotificationSupported() ? Notification.permission : 'default')
            }
        } catch (error) {
            console.error("[NotificationProvider] Error initializing FCM:", error)
            toast.error("Error al activar notificaciones")
        }
    }, [])

    // Check permissions and initialize on mount and route change
    useEffect(() => {
        const patient = getCurrentPatient()

        if (!patient) {
            setShowPermissionRequest(false)
            return
        }

        // If Notification API is not available (e.g. iOS Safari browser mode), skip entirely
        if (!isNotificationSupported()) {
            setPermission('default')
            return
        }

        // If permission is already granted, init FCM
        if (Notification.permission === 'granted') {
            setPermission('granted')
            initFCM()
        } else {
            setPermission(Notification.permission)
            if (Notification.permission === 'default') {
                setShowPermissionRequest(true)
            }
        }
    }, [pathname, initFCM])

    // Ensure we listen for foreground messages (FCM push)
    useEffect(() => {
        if (permission === 'granted') {
            const unsubscribe = onForegroundMessage((payload) => {
                // Use a unique toast ID based on the notification data to prevent duplicates
                const toastId = payload.data?.type && payload.data?.id
                    ? `fcm-${payload.data.type}-${payload.data.id}`
                    : undefined

                toast(payload.title || "Nueva Notificación", {
                    id: toastId,
                    description: payload.body,
                })
            })

            return () => {
                if (unsubscribe) unsubscribe()
            }
        }
    }, [permission])


    // Polling for assignments and messages (fallback when FCM is not active)
    useEffect(() => {
        const patient = getCurrentPatient()
        if (!patient) return

        const checkUpdates = async () => {
            try {
                // 1. Check Assignments
                const pending = await getPendingAssignments()

                // 2. Check Messages
                const messages = patient.id ? await getMessages(patient.id) : []
                const incomingMessages = messages.filter(m => !m.is_from_patient)

                const currentKnownIds = knownIdsRef.current
                const currentKnownMsgIds = knownMessageIdsRef.current

                // On first run, just populate knownIds without notifying
                if (!initRef.current) {
                    const ids = new Set(pending.map(p => p.id))
                    knownIdsRef.current = ids
                    saveKnownIds(KNOWN_IDS_KEY, ids)

                    const msgIds = new Set(incomingMessages.map(m => m.id))
                    knownMessageIdsRef.current = msgIds
                    saveKnownIds(KNOWN_MSG_IDS_KEY, msgIds)

                    initRef.current = true
                    return
                }

                // -- Process Assignments --
                const newIds = new Set(pending.map(p => p.id))
                const addedAssignments = pending.filter(p => !currentKnownIds.has(p.id))

                if (addedAssignments.length > 0 && !fcmActiveRef.current) {
                    // Only show toasts from polling if FCM is NOT active
                    // (FCM foreground handler already shows toasts when push is working)
                    addedAssignments.forEach(assignment => {
                        toast("Nueva Tarea Disponible", {
                            id: `poll-quest-${assignment.id}`,
                            description: `Tienes un nuevo cuestionario pendiente: ${assignment.questionnaire.title}`,
                        })
                    })
                }

                knownIdsRef.current = newIds
                saveKnownIds(KNOWN_IDS_KEY, newIds)

                // -- Process Messages --
                const newMsgIds = new Set(incomingMessages.map(m => m.id))
                const addedMessages = incomingMessages.filter(m => !currentKnownMsgIds.has(m.id))

                if (addedMessages.length > 0 && !fcmActiveRef.current) {
                    addedMessages.forEach(msg => {
                        toast("Nuevo Mensaje", {
                            id: `poll-msg-${msg.id}`,
                            description: "Tienes un nuevo mensaje de tu psicólogo",
                        })
                    })
                }

                knownMessageIdsRef.current = newMsgIds
                saveKnownIds(KNOWN_MSG_IDS_KEY, newMsgIds)

            } catch (error) {
                console.error("Error checking updates for notifications:", error)
            }
        }

        checkUpdates()
        const interval = setInterval(checkUpdates, 60000)
        return () => clearInterval(interval)
        // Empty deps — refs don't trigger re-renders, polling runs once and uses interval
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const handleEnableNotifications = async () => {
        await initFCM()
        setShowPermissionRequest(false)
    }

    const testNotification = async () => {
        const result = await testPushNotification()
        if (result) {
            toast.success("Notificación de prueba enviada")
        } else {
            toast.error("Error al enviar notificación de prueba")
        }
    }

    return (
        <NotificationContext.Provider value={{
            showPermissionModal: () => setShowPermissionRequest(true),
            permission,
            testNotification
        }}>
            {children}
            {showPermissionRequest && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none p-4 pb-24 sm:pb-4">
                    <div className="bg-card/95 backdrop-blur-xl border border-border/50 p-6 rounded-3xl shadow-2xl max-w-sm w-full space-y-4 pointer-events-auto animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-start">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                <Bell className="w-6 h-6 text-primary" />
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2 rounded-full" onClick={() => setShowPermissionRequest(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg leading-tight">Activa las notificaciones</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                Para no perderte los cuestionarios y mensajes importantes de tu terapeuta.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="default"
                                onClick={handleEnableNotifications}
                                className="flex-1 rounded-xl h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                            >
                                Permitir
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setShowPermissionRequest(false)}
                                className="flex-1 rounded-xl h-11"
                            >
                                Ahora no
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    )
}
