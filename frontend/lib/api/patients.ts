import { API_URL, fetchWithAuth } from './client';

// Backend Type
export interface BackendPatient {
    id: number;
    patient_code: string;
    access_code: string;
    psychologist_id?: number;
    psychologist_name?: string;
    psychologist_schedule?: string;
    created_at: string;
    clinical_summary?: string;
    clinical_log?: string;
    ai_instructions?: string;
    unread_messages?: number;
    unread_questionnaires?: number;
    is_online?: boolean;
    total_online_seconds?: number;
    last_active?: string;
    is_ia_patient?: boolean;
    ia_patient_prompt?: string;
}

// Frontend Type
export interface Patient {
    id: string;
    name: string; // Will display patient_code
    patientCode: string; // Mapped from access_code
    access_code: string; // Kept for reference
    psychologistId?: string;
    psychologistName?: string;
    psychologistSchedule?: string;
    unreadMessages: number;
    unreadQuestionnaires: number;
    uncheckedQuestionnaires: number;
    lastContact: string;
    status: "active" | "inactive";
    isOnline: boolean;
    totalOnlineSeconds?: number;
    lastActive?: string;
    created_at: string;
    clinical_summary?: string;
    clinical_log?: string;
    ai_instructions?: string;
    is_ia_patient?: boolean;
    ia_patient_prompt?: string;
}

export interface Note {
    id: string;
    title: string;
    content: string;
    color: string;
    date: string;
    author: string;
}

export async function getPatients(psychologistId?: string): Promise<Patient[]> {
    try {
        let url = `${API_URL}/patients`;
        if (psychologistId) {
            url += `?psychologist_id=${psychologistId}`;
        }
        const res = await fetchWithAuth(url);
        if (!res.ok) throw new Error('Failed to fetch patients');

        const backendPatients: BackendPatient[] = await res.json();

        return backendPatients.map(p => ({
            id: p.id.toString(),
            name: p.patient_code, // Main identifier now
            patientCode: p.patient_code, // Redundant but consistent
            access_code: p.access_code,
            psychologistId: p.psychologist_id?.toString(),
            psychologistName: p.psychologist_name,
            psychologistSchedule: p.psychologist_schedule,
            unreadMessages: p.unread_messages || 0,
            unreadQuestionnaires: p.unread_questionnaires || 0,
            uncheckedQuestionnaires: 0, // Default
            lastContact: new Date(p.created_at).toISOString().split('T')[0],
            status: "active",
            isOnline: p.is_online || false,
            totalOnlineSeconds: p.total_online_seconds || 0,
            lastActive: p.last_active,
            created_at: p.created_at,
            clinical_summary: p.clinical_summary,
            clinical_log: (p as any).clinical_log,
            ai_instructions: p.ai_instructions,
            is_ia_patient: p.is_ia_patient || false,
            ia_patient_prompt: p.ia_patient_prompt
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function createPatient(patientCode: string, psychologistId?: string): Promise<Patient | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/patients`, {
            method: 'POST',
            body: JSON.stringify({
                patient_code: patientCode,
                psychologist_id: psychologistId ? parseInt(psychologistId) : undefined
            }),
        });
        if (!res.ok) throw new Error('Failed to create patient');

        const p: BackendPatient = await res.json();
        console.log("createPatient response:", p); // Debugging

        if (!p || typeof p.id === 'undefined') {
            console.error("Invalid patient creation response:", p);
            return null;
        }

        return {
            id: p.id.toString(),
            name: p.patient_code,
            patientCode: p.patient_code,
            access_code: p.access_code,
            psychologistName: p.psychologist_name,
            psychologistSchedule: p.psychologist_schedule,
            unreadMessages: 0,
            unreadQuestionnaires: 0,
            uncheckedQuestionnaires: 0,
            lastContact: new Date(p.created_at).toISOString().split('T')[0],
            status: "active",
            isOnline: false,
            created_at: p.created_at
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function deletePatient(id: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/patients/${id}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function regeneratePatientCode(patientId: string): Promise<string | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/patients/${patientId}/regenerate-code`, {
            method: 'POST'
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.access_code;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updatePatientCode(patientId: string, newCode: string): Promise<string | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/patients/${patientId}/code`, {
            method: 'PATCH',
            body: JSON.stringify({ new_code: newCode })
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.patient_code;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updatePatientAiInstructions(patientId: string, instructions: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/patients/${patientId}/ai-instructions`, {
            method: 'PATCH',
            body: JSON.stringify({ ai_instructions: instructions })
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function getNotes(patientId: string): Promise<Note[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/notes/${patientId}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((n: any) => ({
            id: n.id.toString(),
            title: n.title,
            content: n.content,
            color: n.color,
            date: new Date(n.created_at).toISOString().split('T')[0],
            author: "Dr. Smith"
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function createNote(patientId: string, title: string, content: string, color: string): Promise<Note | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/notes`, {
            method: 'POST',
            body: JSON.stringify({ patient_id: patientId, title, content, color })
        });
        if (!res.ok) return null;
        const n = await res.json();
        return {
            id: n.id.toString(),
            title: n.title,
            content: n.content,
            color: n.color,
            date: new Date(n.created_at).toISOString().split('T')[0],
            author: "Dr. Smith"
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function deleteNote(noteId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/notes/${noteId}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

// Update patient clinical summary
export async function updateClinicalSummary(patientId: string, summary: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/patients/${patientId}/clinical-summary`, {
            method: 'PATCH',
            body: JSON.stringify({ clinical_summary: summary })
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

// Update patient clinical log (Bitácora)
export async function updateClinicalLog(patientId: string, log: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/patients/${patientId}/clinical-log`, {
            method: 'PATCH',
            body: JSON.stringify({ clinical_log: log })
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

// --- IA Patient (Fictional Patient) ---
export async function ensureIaPatient(): Promise<Patient | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/patients/ensure-ia-patient`, {
            method: 'POST'
        });
        if (!res.ok) return null;
        const p = await res.json();
        return {
            id: p.id.toString(),
            name: p.patient_code,
            patientCode: p.patient_code,
            access_code: p.access_code,
            psychologistId: p.psychologist_id?.toString(),
            psychologistName: p.psychologist_name,
            unreadMessages: 0,
            unreadQuestionnaires: 0,
            uncheckedQuestionnaires: 0,
            lastContact: new Date().toISOString().split('T')[0],
            status: "active",
            isOnline: false,
            created_at: p.created_at,
            is_ia_patient: true,
            ia_patient_prompt: p.ia_patient_prompt
        };
    } catch (e) {
        console.error("Error ensuring IA patient:", e);
        return null;
    }
}

export async function resetIaPatient(patientId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/patients/${patientId}/reset-ia`, {
            method: 'POST'
        });
        return res.ok;
    } catch (e) {
        console.error("Error resetting IA patient:", e);
        return false;
    }
}

export async function updateIaPatientPrompt(patientId: string, prompt: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/patients/${patientId}/ia-prompt`, {
            method: 'PATCH',
            body: JSON.stringify({ ia_patient_prompt: prompt })
        });
        return res.ok;
    } catch (e) {
        console.error("Error updating IA patient prompt:", e);
        return false;
    }
}

export async function getIaPatientResponse(patientId: string): Promise<any | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/chat/ia-patient/respond`, {
            method: 'POST',
            body: JSON.stringify({ patient_id: parseInt(patientId) })
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error("Error getting IA patient response:", e);
        return null;
    }
}
