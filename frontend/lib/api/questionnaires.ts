import { API_URL, fetchWithAuth } from './client';

export interface Question {
    id: string
    text: string
    type: "likert" | "frequency" | "openText"
    options?: string[]
    min?: number
    max?: number
    minLabel?: string
    maxLabel?: string
}

export interface Questionnaire {
    id: string
    title: string
    icon: string
    questions: Question[]
    createdAt: string
}

export interface Assignment {
    id: string
    patientId: string
    questionnaireId: string
    startDate: string
    endDate: string
    frequencyType: "weekly" | "daily"
    frequencyCount: number
    windowStart: string
    windowEnd: string
    deadlineHours: number
    minHoursBetween?: number
    status: "active" | "paused" | "completed"
    answers?: any[] // Answers when completed
    assignedAt?: string
    nextScheduledAt?: string
    questionnaire?: {
        id: number
        title: string
        icon: string
        questions: Question[]
    }
}

export interface QuestionnaireCompletion {
    id: string
    assignmentId: string
    patientId: string
    questionnaireId: string
    answers?: any[]
    scheduledAt?: string
    completedAt?: string
    status: "pending" | "completed" | "missed" | "sent"
    isDelayed: boolean
    deadlineHours?: number
    questionnaire?: {
        title: string
        icon: string
        questions?: Question[]
    }
}

export async function markQuestionnaireAsRead(completionId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assignments/completions/${completionId}/read`, {
            method: 'PATCH',
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function getQuestionnaires(): Promise<Questionnaire[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/questionnaires`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((q: any) => ({
            id: q.id.toString(),
            title: q.title,
            icon: q.icon || "FileQuestion",
            questions: q.questions,
            createdAt: q.created_at
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function createQuestionnaire(title: string, icon: string, questions: Question[]): Promise<Questionnaire | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/questionnaires`, {
            method: 'POST',
            body: JSON.stringify({ title, icon, questions })
        });
        if (!res.ok) return null;
        const q = await res.json();
        console.log("createQuestionnaire response:", q); // Debugging

        if (!q || typeof q.id === 'undefined') {
            console.error("Invalid questionnaire creation response:", q);
            return null;
        }

        return {
            id: q.id.toString(),
            title: q.title,
            icon: q.icon,
            questions: q.questions,
            createdAt: q.created_at
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateQuestionnaire(id: string, title: string, icon: string, questions: Question[]): Promise<Questionnaire | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/questionnaires/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ title, icon, questions })
        });
        if (!res.ok) return null;
        const q = await res.json();
        return {
            id: q.id.toString(),
            title: q.title,
            icon: q.icon,
            questions: q.questions,
            createdAt: q.created_at
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function deleteQuestionnaire(id: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/questionnaires/${id}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function getAssignments(): Promise<Assignment[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assignments`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((a: any) => ({
            id: a.id.toString(),
            patientId: a.patient_id.toString(),
            questionnaireId: a.questionnaire_id.toString(),
            startDate: a.start_date,
            endDate: a.end_date,
            frequencyType: a.frequency_type,
            frequencyCount: a.frequency_count,
            windowStart: a.window_start,
            windowEnd: a.window_end,
            deadlineHours: a.deadline_hours,
            minHoursBetween: a.min_hours_between,
            status: a.status,
            assignmentType: a.assignment_type,
            sentAt: a.sent_at,
            questionnaire: a.questionnaire ? {
                id: a.questionnaire.id.toString(),
                title: a.questionnaire.title,
                icon: a.questionnaire.icon || "FileQuestion",
                questions: a.questionnaire.questions
            } : undefined
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function createAssignment(assignment: Omit<Assignment, "id">): Promise<Assignment | null> {
    try {
        const payload = {
            patient_id: parseInt(assignment.patientId),
            questionnaire_id: parseInt(assignment.questionnaireId),
            start_date: assignment.startDate,
            end_date: assignment.endDate,
            frequency_type: assignment.frequencyType,
            frequency_count: assignment.frequencyCount,
            window_start: assignment.windowStart,
            window_end: assignment.windowEnd,
            deadline_hours: assignment.deadlineHours,
            min_hours_between: assignment.minHoursBetween,
            next_scheduled_at: assignment.nextScheduledAt,
            status: "active"
        };

        const res = await fetchWithAuth(`${API_URL}/assignments`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!res.ok) return null;
        const a = await res.json();

        return {
            id: a.id.toString(),
            patientId: a.patient_id.toString(),
            questionnaireId: a.questionnaire_id.toString(),
            startDate: a.start_date,
            endDate: a.end_date,
            frequencyType: a.frequency_type,
            frequencyCount: a.frequency_count,
            windowStart: a.window_start,
            windowEnd: a.window_end,
            deadlineHours: a.deadline_hours,
            minHoursBetween: a.min_hours_between,
            status: a.status
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function updateAssignmentStatus(id: string, status: "active" | "paused" | "completed"): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assignments/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function deleteAssignment(id: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assignments/${id}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function getQuestionnaireCompletions(patientId: string): Promise<QuestionnaireCompletion[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assignments/completions/${patientId}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((c: any) => ({
            id: c.id.toString(),
            assignmentId: c.assignment_id.toString(),
            patientId: c.patient_id.toString(),
            questionnaireId: c.questionnaire_id.toString(),
            answers: c.answers,
            scheduledAt: c.scheduled_at,
            completedAt: c.completed_at,
            status: c.status,
            isDelayed: c.is_delayed,
            deadlineHours: c.deadline_hours,
            questionnaire: c.questionnaire ? {
                title: c.questionnaire.title,
                icon: c.questionnaire.icon || "FileQuestion",
                questions: c.questionnaire.questions
            } : undefined
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function deleteQuestionnaireCompletion(id: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assignments/completions/${id}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

// Get assignments for a specific patient (admin view)
export async function getPatientAssignments(patientId: string): Promise<Assignment[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/assignments/patient-admin/${patientId}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((a: any) => ({
            id: a.id.toString(),
            patientId: a.patient_id.toString(),
            questionnaireId: a.questionnaire_id.toString(),
            startDate: a.start_date,
            endDate: a.end_date,
            frequencyType: a.frequency_type,
            frequencyCount: a.frequency_count,
            windowStart: a.window_start,
            windowEnd: a.window_end,
            deadlineHours: a.deadline_hours,
            status: a.status,
            answers: a.answers,
            assignedAt: a.assigned_at,
            questionnaire: a.questionnaire ? {
                id: a.questionnaire.id,
                title: a.questionnaire.title,
                icon: a.questionnaire.icon || 'FileQuestion',
                questions: a.questionnaire.questions || []
            } : undefined
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function updateQuestionnaireCompletion(id: string, updates: { scheduledAt?: string, status?: string }): Promise<QuestionnaireCompletion | null> {
    try {
        const payload: any = {};
        if (updates.scheduledAt) payload.scheduled_at = updates.scheduledAt;
        if (updates.status) payload.status = updates.status;

        const res = await fetchWithAuth(`${API_URL}/assignments/completions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) return null;
        const c = await res.json();
        console.log("updateQuestionnaireCompletion response:", c);

        return {
            id: c.id?.toString() || "",
            assignmentId: c.assignment_id?.toString() || "",
            patientId: c.patient_id?.toString() || "",
            questionnaireId: c.questionnaire_id?.toString() || "",
            answers: c.answers,
            scheduledAt: c.scheduled_at,
            completedAt: c.completed_at,
            status: c.status,
            isDelayed: c.is_delayed,
            questionnaire: c.questionnaire ? {
                title: c.questionnaire.title,
                icon: c.questionnaire.icon || "FileQuestion"
            } : undefined
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function generateQuestionnaireWithAI(prompt: string): Promise<{ title: string; description?: string; icon: string; questions: Question[] } | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/questionnaires/generate`, {
            method: 'POST',
            body: JSON.stringify({ prompt })
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
            title: data.title || "",
            description: data.description || "",
            icon: data.icon || "FileQuestion",
            questions: (data.questions || []).map((q: any) => ({
                id: q.id || Math.random().toString(),
                text: q.text || "",
                type: q.type || "openText",
                options: q.options,
                min: q.min,
                max: q.max,
                minLabel: q.minLabel,
                maxLabel: q.maxLabel
            }))
        };
    } catch (e) {
        console.error(e);
        return null;
    }
}

