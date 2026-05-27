export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// --- Token Management ---
export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
}

export function setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', token);
}

export function clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    localStorage.removeItem('has_ia_patient');
}

export async function logout(): Promise<void> {
    try {
        await fetchWithAuth(`${API_URL}/logout`, { method: 'POST' });
    } catch (e) {
        console.error("Logout error", e);
    } finally {
        clearToken();
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    }
}

export async function sendHeartbeat(): Promise<void> {
    try {
        await fetchWithAuth(`${API_URL}/heartbeat`, { method: 'POST' });
    } catch (e) {
        // Silent fail for heartbeat
    }
}

// Authenticated fetch wrapper
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = getToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers });

    // Handle 401 - unauthorized (token expired or invalid)
    if (response.status === 401) {
        clearToken();
        // Redirect to login if in browser
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    }

    return response;
}

export interface Psychologist {
    id: string
    name: string
    email: string
    role: "admin" | "psychologist" | "superadmin"
    schedule: string
    phone?: string
    totalOnlineSeconds?: number
    lastActive?: string
    ai_style?: string
    ai_tone?: string
    ai_instructions?: string
    gender?: string
    therapy_style?: string
}

export interface LoginResponse {
    id: number
    name: string
    role: string
    email: string
    access_token: string
}
