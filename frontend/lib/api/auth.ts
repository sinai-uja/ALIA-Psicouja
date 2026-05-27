import { API_URL, setToken, fetchWithAuth, type LoginResponse } from './client';
import { type Patient } from './patients';

// --- Auth & Admin ---
export async function login(email: string, password: string): Promise<LoginResponse | null> {
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) return null;
        const data = await res.json();

        // Store the JWT token
        if (data.access_token) {
            setToken(data.access_token);
        }

        return data;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/auth/change-password`, {
            method: 'POST',
            body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function forgotPassword(email: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, new_password: newPassword })
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function patientLogin(patientCode: string, accessCode: string): Promise<Patient | null> {
    try {
        const res = await fetch(`${API_URL}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patient_code: patientCode, access_code: accessCode }),
        });

        if (!res.ok) return null;
        const data = await res.json();

        if (data.access_token) {
            setToken(data.access_token);
            if (typeof window !== 'undefined') {
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('userRole', 'patient');
                localStorage.setItem('userId', data.id.toString());
            }
        }

        return {
            id: data.id.toString(),
            name: data.patient_code,
            patientCode: data.patient_code,
            access_code: data.access_code,
            psychologistId: data.psychologist_id?.toString(),
            psychologistName: data.psychologist_name,
            psychologistSchedule: data.psychologist_schedule,
            unreadMessages: 0,
            unreadQuestionnaires: 0,
            uncheckedQuestionnaires: 0,
            lastContact: new Date().toISOString().split('T')[0],
            status: "active",
            isOnline: true,
            created_at: new Date().toISOString()
        };
    } catch (e) {
        console.error("Patient login error:", e);
        return null;
    }
}
