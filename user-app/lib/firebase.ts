/**
 * Firebase Cloud Messaging configuration for push notifications
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging"

// Firebase configuration - using project ID from service account
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
};

let app: FirebaseApp | null = null
let messaging: Messaging | null = null

/**
 * Initialize Firebase app (singleton pattern)
 */
export function initializeFirebaseApp(): FirebaseApp | null {
    if (typeof window === "undefined") {
        return null // Firebase client SDK doesn't work on server
    }

    if (app) {
        return app
    }

    // Check if Firebase configuration is missing or using default placeholders
    if (
        !firebaseConfig.projectId || 
        firebaseConfig.projectId === "" || 
        firebaseConfig.projectId.includes("your_firebase_project_id_here")
    ) {
        console.warn("[Firebase] Missing or placeholder project ID. Firebase will not be initialized.")
        return null
    }

    try {
        if (getApps().length === 0) {
            app = initializeApp(firebaseConfig)
        } else {
            app = getApps()[0]
        }
        return app
    } catch (error) {
        console.error("[Firebase] Failed to initialize Firebase App:", error)
        return null
    }
}

/**
 * Get Firebase Messaging instance
 */
export function getFirebaseMessaging(): Messaging | null {
    if (typeof window === "undefined") {
        return null
    }

    if (!messaging) {
        const firebaseApp = initializeFirebaseApp()
        if (firebaseApp) {
            try {
                messaging = getMessaging(firebaseApp)
            } catch (error) {
                console.error("[Firebase] Failed to get Firebase Messaging instance:", error)
                messaging = null
            }
        }
    }

    return messaging
}

/**
 * Request notification permission and get FCM token
 * @returns FCM token string or null if permission denied or error
 */
export async function requestFCMToken(): Promise<string | null> {
    try {
        // Check if Notification API and Service Worker are available
        // iOS Safari does NOT support these in regular browser mode (only installed PWAs)
        if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
            console.warn('[FCM] Notifications or Service Workers not supported in this browser context')
            return null
        }

        const permission = await Notification.requestPermission()

        if (permission !== "granted") {
            // console.log("Notification permission denied")
            return null
        }

        const messagingInstance = getFirebaseMessaging()
        if (!messagingInstance) {
            console.warn("[FCM] Firebase Messaging not initialized (push notifications disabled due to missing configuration)")
            return null
        }

        // Register service worker for FCM, passing Firebase configuration via query parameters
        // to avoid hardcoding keys in the static service worker script.
        const swUrl = `/firebase-messaging-sw.js` +
            `?apiKey=${encodeURIComponent(firebaseConfig.apiKey)}` +
            `&authDomain=${encodeURIComponent(firebaseConfig.authDomain)}` +
            `&projectId=${encodeURIComponent(firebaseConfig.projectId)}` +
            `&storageBucket=${encodeURIComponent(firebaseConfig.storageBucket)}` +
            `&messagingSenderId=${encodeURIComponent(firebaseConfig.messagingSenderId)}` +
            `&appId=${encodeURIComponent(firebaseConfig.appId)}`;

        const swRegistration = await navigator.serviceWorker.register(swUrl)
        console.log("[FCM] Service Worker registered via register()")

        // Wait for it to be ready
        // This is crucial! "no active Service Worker" often means it's installing but not active yet.
        await navigator.serviceWorker.ready
        console.log("[FCM] Service Worker is ready")

        // Get FCM token
        const token = await getToken(messagingInstance, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "",
            serviceWorkerRegistration: swRegistration
        })

        // console.log("FCM Token:", token)
        return token
    } catch (error) {
        console.error("Error getting FCM token:", error)
        return null
    }
}

/**
 * Set up foreground message handler
 * @param callback Function to call when a message is received in foreground
 */
export function onForegroundMessage(
    callback: (payload: { title?: string; body?: string; data?: Record<string, string> }) => void
): (() => void) | null {
    const messagingInstance = getFirebaseMessaging()
    if (!messagingInstance) {
        return null
    }

    return onMessage(messagingInstance, (payload) => {
        // Backend sends data-only messages (no notification field),
        // so read title/body from data payload first, fall back to notification
        callback({
            title: payload.data?.title || payload.notification?.title,
            body: payload.data?.body || payload.notification?.body,
            data: payload.data
        })
    })
}
