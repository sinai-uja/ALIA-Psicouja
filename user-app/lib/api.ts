export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001';
import { getCurrentPatient } from './auth';

export type Assignment = {
    id: number;
    status: 'active' | 'paused' | 'completed';
    answers: any;
    assigned_at: string;
    start_date?: string;
    end_date?: string;
    frequency_type?: string;
    frequency_count?: number;
    window_start?: string;
    window_end?: string;
    deadline_hours?: number;
    next_scheduled_at?: string;
    questionnaire: {
        id: number;
        title: string;
        description: string;
        icon?: string;
        questions: any[];
    }
}

function getAuthHeader(): Record<string, string> {
    const patient = getCurrentPatient();
    return patient?.token ? { 'Authorization': `Bearer ${patient.token}` } : {};
}

export interface QuestionnaireCompletion {
    id: number;
    assignment_id: number;
    patient_id: number;
    questionnaire_id: number;
    status: 'pending' | 'completed' | 'missed' | 'sent' | 'late';
    scheduled_at: string;
    deadline_hours?: number;
    questionnaire: {
        title: string;
        icon: string;
        description?: string;
        questions?: any[];
    };
}

const ensureUTC = (dateStr: string) => {
    if (!dateStr) return dateStr;
    // If it doesn't end with Z and doesn't have an offset (like +01:00), append Z
    if (!dateStr.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(dateStr)) {
        return `${dateStr}Z`;
    }
    return dateStr;
};


function handleAuthError() {
    if (typeof window !== "undefined") {
        localStorage.removeItem("patient");
        window.location.href = "/login";
    }
}

export async function getAssignments(accessCode: string): Promise<Assignment[]> {
    try {
        const res = await fetch(`${API_URL}/assignments/patient/${accessCode}`, {
            headers: { ...getAuthHeader() }
        });
        if (res.status === 401) {
            handleAuthError();
            return [];
        }
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((a: any) => ({
            ...a,
            assigned_at: ensureUTC(a.assigned_at),
            window_start: ensureUTC(a.window_start),
            window_end: ensureUTC(a.window_end),
            next_scheduled_at: ensureUTC(a.next_scheduled_at)
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getPendingAssignments(): Promise<QuestionnaireCompletion[]> {
    try {
        const res = await fetch(`${API_URL}/assignments/my-pending`, {
            headers: { ...getAuthHeader() }
        });
        if (res.status === 401) {
            handleAuthError();
            return [];
        }
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((c: any) => ({
            ...c,
            scheduled_at: ensureUTC(c.scheduled_at)
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function submitAssignment(assignmentId: number, answers: any[]): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/assignments/${assignmentId}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(answers),
        });
        if (res.status === 401) {
            handleAuthError();
            return false;
        }
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export interface ChatMessage {
    id: number;
    patient_id: number;
    content: string;
    is_from_patient: boolean;
    created_at: string;
}

export async function getMessages(patientId: number | string): Promise<ChatMessage[]> {
    try {
        const res = await fetch(`${API_URL}/messages/${patientId}`, {
            headers: { ...getAuthHeader() }
        });
        if (res.status === 401) {
            handleAuthError();
            return [];
        }
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function sendMessage(patientId: number | string, content: string): Promise<ChatMessage | null> {
    try {
        const res = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ patient_id: patientId, content, is_from_patient: true }),
        });
        if (res.status === 401) {
            handleAuthError();
            return null;
        }
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function sendHeartbeat(): Promise<void> {
    try {
        const res = await fetch(`${API_URL}/heartbeat`, {
            method: 'POST',
            headers: { ...getAuthHeader() }
        });
        if (res.status === 401) {
            handleAuthError();
        }
    } catch (e) {
        // Silent fail
    }
}

export async function logout(): Promise<void> {
    try {
        await fetch(`${API_URL}/logout`, {
            method: 'POST',
            headers: { ...getAuthHeader() }
        });
    } catch (e) {
        console.error(e);
    }
}

export async function getPatientStatus(): Promise<{ is_online: boolean; psychologist_is_online: boolean } | null> {
    try {
        const res = await fetch(`${API_URL}/patient/status`, {
            headers: { ...getAuthHeader() }
        });
        if (res.status === 401) {
            handleAuthError();
            return null;
        }
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getPatientProfile(): Promise<any | null> {
    try {
        const res = await fetch(`${API_URL}/patient/me`, {
            headers: { ...getAuthHeader() }
        });
        if (res.status === 401) {
            handleAuthError();
            return null;
        }
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error(e);
        return null;
    }
}

/**
 * Register an FCM token with the backend for push notifications
 */
export async function registerFCMToken(token: string): Promise<boolean> {
    try {
        console.log('[FCM] Sending token to backend:', token.substring(0, 30) + '...');
        console.log('[FCM] API URL:', `${API_URL}/notifications/register-token`);

        const res = await fetch(`${API_URL}/notifications/register-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ token }),
        });

        if (res.status === 401) {
            handleAuthError();
            return false;
        }

        const responseText = await res.text();
        console.log('[FCM] Response status:', res.status);
        console.log('[FCM] Response body:', responseText);

        if (!res.ok) {
            console.error('Failed to register FCM token:', responseText);
            return false;
        }
        console.log('FCM token registered successfully');
        return true;
    } catch (e) {
        console.error('Error registering FCM token:', e);
        return false;
    }
}

/**
 * Unregister an FCM token from the backend
 */
export async function unregisterFCMToken(token: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/notifications/unregister-token`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ token }),
        });
        if (res.status === 401) {
            handleAuthError();
            return false;
        }
        return res.ok;
    } catch (e) {
        console.error('Error unregistering FCM token:', e);
        return false;
    }
}

/**
 * Test push notification for current patient
 */
export async function testPushNotification(): Promise<boolean> {
    try {
        console.log('[FCM Test] Sending test notification request...');
        const res = await fetch(`${API_URL}/notifications/test`, {
            method: 'POST',
            headers: { ...getAuthHeader() },
        });
        if (res.status === 401) {
            handleAuthError();
            return false;
        }
        const text = await res.text();
        console.log('[FCM Test] Response status:', res.status);
        console.log('[FCM Test] Response body:', text);
        return res.ok;
    } catch (e) {
        console.error('Error testing push notification:', e);
        return false;
    }
}

export async function setTypingStatus(isTyping: boolean): Promise<void> {
    try {
        const patient = getCurrentPatient();
        if (!patient) return;
        
        await fetch(`${API_URL}/messages/typing`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ patient_id: patient.id, is_typing: isTyping }),
        });
    } catch (e) {
        // Silent fail
    }
}

export async function getTypingStatus(patientId: number | string): Promise<{ psychologist_is_typing: boolean; patient_is_typing: boolean } | null> {
    try {
        const res = await fetch(`${API_URL}/messages/${patientId}/typing`, {
            headers: { ...getAuthHeader() }
        });
        if (res.status === 401) {
            handleAuthError();
            return null;
        }
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}
