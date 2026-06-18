import { API_URL, fetchWithAuth, getToken } from './client';

// --- Chat Messages ---
export interface ChatMessage {
    id: number;
    patient_id: number;
    content: string;
    is_from_patient: boolean;
    created_at: string;
    was_edited_by_human: boolean;
    ai_suggestion_log_id: number;
    safety_status?: string;
    safety_explanation?: string;
    safety_keywords?: string;
}

export interface AiRecommendationsResponse {
    recommendations: string[];
    ai_suggestion_log_id: number;
}

export interface StreamOption {
    type: "option";
    index: number;
    text: string;
}

export interface StreamDone {
    type: "done";
    ai_suggestion_log_id: number | null;
    options: string[];
}

export async function getMessages(patientId: string): Promise<ChatMessage[]> {
    try {
        const res = await fetchWithAuth(`${API_URL}/messages/${patientId}`);
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function sendMessage(payload: {
    patient_id: number | string,
    content: string,
    is_from_patient: boolean,
    ai_suggestion_log_id?: number | null,
    selected_option?: number | null,
    was_edited_by_human?: boolean,
}) {
    const res = await fetchWithAuth(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Error sending message");
    return await res.json();
}

export async function markMessagesAsRead(patientId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/messages/mark-read/${patientId}`, {
            method: 'POST',
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function clearChat(patientId: string): Promise<boolean> {
    try {
        const res = await fetchWithAuth(`${API_URL}/messages/${patientId}`, {
            method: 'DELETE',
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
}

export async function getChatRecommendations(messages: any[], patientId: number, temporaryInstructions?: string, previousSessionSummary?: string, suggestedStrategies?: string[], parentLogId?: number | null): Promise<AiRecommendationsResponse | null> {
    try {
        const payload = messages.map(m => ({
            role: m.sender === "therapist" ? "assistant" : "user",
            content: m.text
        }));

        const res = await fetchWithAuth(`${API_URL}/chat/recommendations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: payload,
                patient_id: patientId,
                temporary_instructions: temporaryInstructions,
                previous_session_summary: previousSessionSummary,
                suggested_strategies: suggestedStrategies,
                parent_log_id: parentLogId
            }),
        });

        if (!res.ok) {
            console.error("Error en la respuesta de recomendaciones:", await res.text());
            return null;
        }

        const data = await res.json();
        return data;
    } catch (e) {
        console.error("Error en getChatRecommendations:", e);
        return null;
    }
}

export async function getStrategicOptions(messages: any[], patientId: number, previousSessionSummary?: string): Promise<string[]> {
    try {
        const payload = messages.map(m => ({
            role: m.sender === "therapist" ? "assistant" : "user",
            content: m.text
        }));

        const res = await fetchWithAuth(`${API_URL}/chat/strategies`, {
            method: 'POST',
            body: JSON.stringify({
                messages: payload,
                patient_id: patientId,
                previous_session_summary: previousSessionSummary
            }),
        });

        if (!res.ok) return [];
        const data = await res.json();
        return data.strategies || [];
    } catch (e) {
        console.error("Error fetching dynamic strategies:", e);
        return [];
    }
}

/**
 * Streaming version of getChatRecommendations.
 * Reads SSE from /chat/recommendations/stream and calls callbacks as events arrive.
 * Returns an AbortController so the caller can cancel if needed.
 */
export function getChatRecommendationsStream(
    messages: any[],
    patientId: number,
    temporaryInstructions: string | undefined,
    previousSessionSummary: string | undefined,
    suggestedStrategies: string[] | undefined,
    parentLogId: number | null | undefined,
    onOption: (index: number, text: string) => void,
    onDone: (logId: number | null, options: string[]) => void,
    onError?: (err: string) => void
): AbortController {
    const controller = new AbortController();

    const token = getToken();
    const payload = messages.map(m => ({
        role: m.sender === "therapist" ? "assistant" : "user",
        content: m.text
    }));

    (async () => {
        try {
            const res = await fetch(`${API_URL}/chat/recommendations/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ 
                    messages: payload, 
                    patient_id: patientId,
                    temporary_instructions: temporaryInstructions,
                    previous_session_summary: previousSessionSummary,
                    suggested_strategies: suggestedStrategies,
                    parent_log_id: parentLogId
                }),
                signal: controller.signal,
            });

            if (!res.ok || !res.body) {
                const text = await res.text().catch(() => "Unknown error");
                onError?.(`Stream request failed: ${text}`);
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // SSE lines are separated by \n\n
                const parts = buffer.split("\n\n");
                buffer = parts.pop() ?? "";

                for (const part of parts) {
                    const line = part.trim();
                    if (!line.startsWith("data:")) continue;
                    const jsonStr = line.slice("data:".length).trim();
                    if (!jsonStr) continue;
                    try {
                        const event = JSON.parse(jsonStr);
                        if (event.type === "option") {
                            onOption(event.index, event.text);
                        } else if (event.type === "done") {
                            onDone(event.ai_suggestion_log_id ?? null, event.options ?? []);
                        } else if (event.type === "error") {
                            onError?.(event.message ?? "Unknown stream error");
                        }
                    } catch (parseErr) {
                        console.error("SSE parse error:", parseErr, jsonStr);
                    }
                }
            }
        } catch (err: any) {
            if (err?.name !== "AbortError") {
                console.error("Stream fetch error:", err);
                onError?.(String(err));
            }
        }
    })();

    return controller;
}

export async function setTypingStatus(patientId: number | string, isTyping: boolean): Promise<void> {
    try {
        await fetchWithAuth(`${API_URL}/messages/typing`, {
            method: 'POST',
            body: JSON.stringify({ patient_id: patientId, is_typing: isTyping }),
        });
    } catch (e) {
        // Silent fail
    }
}

export async function getTypingStatus(patientId: number | string): Promise<{ psychologist_is_typing: boolean; patient_is_typing: boolean } | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/messages/${patientId}/typing`);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

// --- Session Notes (AI-generated) ---
export async function generateSessionNotes(patientId: string, messages: any[]): Promise<{ description: string, notes: string } | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/chat/generate-session-notes`, {
            method: 'POST',
            body: JSON.stringify({ patient_id: parseInt(patientId), messages })
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error("Error generating session notes:", e);
        return null;
    }
}

export interface DistressAnalysisResult {
    reasons: string[];
    context: string;
    recommendations: string[];
}

export async function exploreDistressReasons(patientId: number | string, targetMessageId?: number | string): Promise<DistressAnalysisResult | null> {
    try {
        const res = await fetchWithAuth(`${API_URL}/chat/patients/${patientId}/explore-reasons`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                target_message_id: targetMessageId ? parseInt(targetMessageId.toString()) : null
            })
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error("Error exploring distress reasons:", e);
        return null;
    }
}
