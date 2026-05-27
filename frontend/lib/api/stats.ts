import { API_URL, fetchWithAuth, type Psychologist } from './client';
import { type Patient } from './patients';
import { type Question } from './questionnaires';

export interface AssessmentStat {
    id: string
    patient_id: string
    label: string
    value: string
    status: "mild" | "moderate" | "high" | "severe"
    color: "teal" | "amber" | "coral"
    created_at: string
    updated_at: string
}

export interface ModelStatsEntry {
    model: string
    generations: number
    clicked: number
    not_clicked: number
    edited: number
}

export interface ModelRankingEntry {
    model: string;
    count: number;
}

export interface PlatformStats {
    total_psychologists: number
    total_patients: number
    online_psychologists: number
    online_patients: number
    total_messages_psychologist: number
    total_messages_patient: number
    total_words: number
    ai_stats?: {
        total_generations: number
        clicked_ai: number
        not_clicked_ai: number
        edited_ai: number
        model_ranking: ModelRankingEntry[]
        model_unedited_ranking: ModelRankingEntry[]
        by_model?: ModelStatsEntry[]
    }
}

export interface DailyMessageStat {
    date: string
    patient_count: number
    psychologist_count: number
}

export interface DetailedPsychologist {
    id: number
    name: string
    email: string
    role: string
    is_online: boolean
    patients_count: number
    sessions_count: number
    ai_clicks: number
    message_count: number
    word_count: number
    last_active?: string
}

export interface DetailedPatient {
    id: number
    name: string
    patient_code: string
    psychologist_name: string
    is_online: boolean
    message_count: number
    word_count: number
    total_online_seconds: number
    last_active: string
}

export interface DetailedUsersResponse {
    psychologists: DetailedPsychologist[]
    patients: DetailedPatient[]
}

export interface SessionAnalysisItem {
    id: number;
    patient_id: number;
    patient_code: string;
    psychologist_id: number | null;
    psychologist_name: string;
    date: string;
    duration: string;
    description: string;
    ai_summary?: string;
}

export interface EnrichedMessageAnalysis {
    text: string;
    sender: "patient" | "therapist";
    timestamp: string;
    was_edited_by_human: boolean;
    ai_suggestion_log_id?: number | null;
    ai_suggestions?: {
        suggestion_model1: string;
        suggestion_model2: string;
        suggestion_model3: string;
        final_option_id: number | null;
        selected_strategy?: string;
        suggested_strategies?: string[] | string | null;
        models_used?: string[];
        ai_style_used?: string | null;
        ai_tone_used?: string | null;
        ai_instructions_used?: string | null;
    } | null;
}

export interface SessionAnalysisDetail {
    id: number;
    patient_id: number;
    patient_code: string;
    psychologist_id: number | null;
    psychologist_name: string;
    date: string;
    duration: string;
    description: string;
    notes: string;
    ai_summary?: string;
    chat_snapshot_enriched: EnrichedMessageAnalysis[];
    stats: {
        total_therapist_messages: number;
        clicked_ai: number;
        not_clicked_ai: number;
        edited_ai: number;
        model_ranking: ModelRankingEntry[];
        model_unedited_ranking: ModelRankingEntry[];
    };
}

export async function createPsychologist(name: string, email: string): Promise<Psychologist | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/psychologists`, {
            method: 'POST',
            body: JSON.stringify({ name, email }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return { ...data, id: data.id.toString() };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getPsychologists(): Promise<Psychologist[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/psychologists`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((p: any) => ({
            ...p,
            id: p.id.toString(),
            totalOnlineSeconds: p.total_online_seconds || 0,
            lastActive: p.last_active
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function deletePsychologist(id: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/psychologists/${id}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function getUserProfile(userId: string): Promise<Psychologist | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/profile/${userId}`);
        if (!res.ok) return null;
        const data = await res.json();
        return { ...data, id: data.id.toString() };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateUserProfile(userId: string, data: Partial<Psychologist>): Promise<Psychologist | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/profile/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        if (!res.ok) return null;
        const resData = await res.json();
        return { ...resData, id: resData.id.toString() };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function assignPatientToPsychologist(patientId: string, psychologistId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/patients/${patientId}/assign`, {
            method: 'PATCH',
            body: JSON.stringify({ psychologist_id: parseInt(psychologistId) }),
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function getAssessmentStats(patientId: string): Promise<AssessmentStat[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assessment-stats/${patientId}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((s: any) => ({
            id: s.id.toString(),
            patient_id: s.patient_id.toString(),
            label: s.label,
            value: s.value,
            status: s.status,
            color: s.color,
            created_at: s.created_at,
            updated_at: s.updated_at
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function createAssessmentStat(patientId: string, data: Omit<AssessmentStat, "id" | "patient_id" | "created_at" | "updated_at">): Promise<AssessmentStat | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assessment-stats`, {
            method: 'POST',
            body: JSON.stringify({ patient_id: parseInt(patientId), ...data })
        });
        if (!res.ok) return null;
        const s = await res.json();
        return {
            id: s.id.toString(),
            patient_id: s.patient_id.toString(),
            label: s.label,
            value: s.value,
            status: s.status,
            color: s.color,
            created_at: s.created_at,
            updated_at: s.updated_at
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateAssessmentStat(statId: string, data: Omit<AssessmentStat, "id" | "patient_id" | "created_at" | "updated_at">): Promise<AssessmentStat | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assessment-stats/${statId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!res.ok) return null;
        const s = await res.json();
        return {
            id: s.id.toString(),
            patient_id: s.patient_id.toString(),
            label: s.label,
            value: s.value,
            status: s.status,
            color: s.color,
            created_at: s.created_at,
            updated_at: s.updated_at
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function deleteAssessmentStat(statId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assessment-stats/${statId}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

// Dashboard Stats
export async function getDashboardStats(psychologistId?: string) {
    try {
        let url = `${API_URL}/dashboard/stats`;
        if (psychologistId) {
            url += `?psychologist_id=${psychologistId}`;
        }
        const res = await fetchWithAuth(url);
        if (!res.ok) return { 
            total_patients: 0, 
            total_messages: 0, 
            unread_messages: 0,
            recent_activity: [], 
            completed_questionnaires: 0, 
            unread_questionnaires: 0,
            pending_questionnaires: 0,
            online_patients: 0
        };
        return await res.json();
    } catch (e) {
        console.error(e);
        return { 
            total_patients: 0, 
            total_messages: 0, 
            unread_messages: 0,
            recent_activity: [], 
            completed_questionnaires: 0, 
            unread_questionnaires: 0,
            pending_questionnaires: 0,
            online_patients: 0
        };
    }
}

// Superadmin Stats
export async function getPlatformStats(): Promise<PlatformStats | null> {
    try {
        const response = await fetchWithAuth(`${API_URL}/superadmin/stats`)
        if (!response.ok) return null
        return await response.json()
    } catch (e) {
        console.error(e)
        return null
    }
}

export async function getDailyMessageStats(): Promise<DailyMessageStat[]> {
    try {
        const response = await fetchWithAuth(`${API_URL}/superadmin/stats/daily-messages`)
        if (!response.ok) return []
        return await response.json()
    } catch (e) {
        console.error(e)
        return []
    }
}

export async function getDetailedUsers(): Promise<DetailedUsersResponse | null> {
    try {
        const response = await fetchWithAuth(`${API_URL}/superadmin/users/detailed`)
        if (!response.ok) return null
        return await response.json()
    } catch (e) {
        console.error(e)
        return null
    }
}

export async function createSystemUser(user: Partial<Psychologist>): Promise<Psychologist | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/superadmin/users`, {
            method: 'POST',
            body: JSON.stringify(user)
        });
        if (!res.ok) return null;
        const data = await res.json();
        return { ...data, id: data.id.toString() };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getSystemUsers(): Promise<Psychologist[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/superadmin/users`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((p: any) => ({
            ...p,
            id: p.id.toString()
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getSessionsForAnalysis(): Promise<SessionAnalysisItem[]> {
    try {
        const response = await fetchWithAuth(`${API_URL}/superadmin/analysis/sessions`)
        if (!response.ok) return []
        return await response.json()
    } catch (e) {
        console.error("Error fetching sessions for analysis:", e)
        return []
    }
}

export async function getSessionAnalysisDetail(sessionId: string | number): Promise<SessionAnalysisDetail | null> {
    try {
        const response = await fetchWithAuth(`${API_URL}/superadmin/analysis/sessions/${sessionId}`)
        if (!response.ok) return null
        return await response.json()
    } catch (e) {
        console.error(`Error fetching session analysis detail for ${sessionId}:`, e)
        return null
    }
}
