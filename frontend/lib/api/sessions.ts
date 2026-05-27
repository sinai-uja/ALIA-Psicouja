import { API_URL, fetchWithAuth } from './client';

export interface ChatMessageSnapshot {
    id?: string;
    text: string;
    sender: "patient" | "therapist";
    timestamp: string;
    // Datos de IA (solo presentes si el sender es therapist y usó IA)
    ai_suggestion_log_id?: number;
    was_edited_by_human?: boolean;
}

export interface Session {
    id: string
    patient_id: string
    date: string
    duration: string
    description: string
    notes: string
    ai_summary?: string
    chatHistory: ChatMessageSnapshot[];
}

export async function getSessions(patientId: string): Promise<Session[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/sessions/${patientId}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((s: any) => ({
            id: s.id.toString(),
            patient_id: s.patient_id.toString(),
            date: s.date,
            duration: s.duration,
            description: s.description,
            notes: s.notes,
            ai_summary: s.ai_summary,
            chatHistory: s.chat_snapshot || []
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function createSession(session: Omit<Session, "id" | "date"> & { date?: string }): Promise<Session | null> {
    try {
        const payload = {
            patient_id: parseInt(session.patient_id),
            ...(session.date ? { date: session.date } : {}),
            duration: session.duration,
            description: session.description,
            notes: session.notes,
            chat_snapshot: session.chatHistory
        };
        const res = await fetchWithAuth(`${API_URL}/sessions`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (!res.ok) return null;
        const s = await res.json();
        if (!s || !s.id) {
            console.error("Invalid session creation response:", s);
            return null;
        }
        return {
            id: s.id.toString(),
            patient_id: s.patient_id.toString(),
            date: s.date,
            duration: s.duration,
            description: s.description,
            notes: s.notes,
            ai_summary: s.ai_summary,
            chatHistory: s.chat_snapshot || []
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateSession(sessionId: string, session: Partial<Omit<Session, "id" | "patient_id">>): Promise<Session | null> {
    try {
        const payload = {
            ...session,
            chat_snapshot: session.chatHistory
        };
        delete (payload as any).chatHistory;

        const res = await fetchWithAuth(`${API_URL}/sessions/${sessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) return null;
        const s = await res.json();

        return {
            id: s.id.toString(),
            patient_id: s.patient_id.toString(),
            date: s.date,
            duration: s.duration,
            description: s.description,
            notes: s.notes,
            ai_summary: s.ai_summary,
            chatHistory: s.chat_snapshot || []
        };
    } catch (e) {
        console.error("Error updating session:", e);
        return null;
    }
}

export async function deleteSession(sessionId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/sessions/${sessionId}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

// Regenerate a specific bitácora entry for a session
export async function regenerateBitacoraEntry(sessionId: string): Promise<{ ok: boolean, clinical_log?: string }> {
    try {
        const res = await fetchWithAuth(`${API_URL}/sessions/${sessionId}/regenerate-bitacora`, {
            method: 'POST'
        });
        if (!res.ok) return { ok: false };
        const data = await res.json();
        return { ok: true, clinical_log: data.clinical_log };
    } catch (e) {
        console.error(e);
        return { ok: false };
    }
}

export async function regenerateSessionSummary(sessionId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/sessions/${sessionId}/regenerate-summary`, {
            method: 'POST'
        });
        return res.ok;
    } catch (e) {
        console.error("Error regenerating session summary:", e);
        return false;
    }
}
