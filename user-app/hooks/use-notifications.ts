"use client"

import { useEffect, useState } from "react"

export function useNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>('default')

    useEffect(() => {
        // Service worker registration is now handled by Firebase in notification-manager.tsx
        // Just check permission status on mount
        if ('Notification' in window) {
            setPermission(Notification.permission)
        }
    }, [])

    const requestPermission = async () => {
        if ('Notification' in window) {
            const result = await Notification.requestPermission()
            setPermission(result)
            return result
        }
        return 'denied'
    }

    const sendNotification = (title: string, options?: NotificationOptions) => {
        if (permission === 'granted') {
            // Use Service Worker registration to show notification if available
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, options)
            })
        }
    }

    return { permission, requestPermission, sendNotification }
}
