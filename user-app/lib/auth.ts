"use client"

import { API_URL } from "./api"

export interface Patient {
  id: string
  // name: string // Removed
  patientCode: string
  accessCode: string
  psychologistName: string
  psychologistOnline?: boolean
  psychologistSchedule?: string
  token?: string
}

export async function validatePatientLogin(patientCode: string, code: string): Promise<Patient | null> {
  try {
    const res = await fetch(`${API_URL}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patient_code: patientCode,
        access_code: code
      }),
      cache: 'no-store'
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id.toString(),
      patientCode: data.patient_code,
      accessCode: data.access_code,
      psychologistName: data.psychologist_name || "Tu Psicólogo",
      psychologistSchedule: data.psychologist_schedule || "Disponible 9:00 - 18:00",
      psychologistOnline: data.psychologist_is_online, // Map the new field
      token: data.access_token
    };
  } catch (e) {
    console.error("Auth error", e);
    return null;
  }
}

export function getCurrentPatient(): Patient | null {
  if (typeof window === "undefined") return null

  const patientData = localStorage.getItem("patient")
  if (!patientData) return null

  try {
    return JSON.parse(patientData)
  } catch {
    return null
  }
}

export function setCurrentPatient(patient: Patient): void {
  localStorage.setItem("patient", JSON.stringify(patient))
}

export function updateCurrentPatient(updates: Partial<Patient>): void {
  const current = getCurrentPatient()
  if (!current) return

  const updated = { ...current, ...updates }
  setCurrentPatient(updated)
}

import { logout as apiLogout } from "./api"

export async function logout(): Promise<void> {
  await apiLogout() // Notify backend
  localStorage.removeItem("patient")
}

export function isPsychologistOnline(patientId: string): boolean {
  // En producción, esto consultaría el estado real del psicólogo
  // Por ahora, simulamos que está online aleatoriamente
  const storedStatus = localStorage.getItem(`psychologist_online_${patientId}`)
  if (storedStatus !== null) {
    return storedStatus === "true"
  }

  // Simular estado online (70% de probabilidad de estar online)
  const isOnline = Math.random() > 0.3
  localStorage.setItem(`psychologist_online_${patientId}`, String(isOnline))
  return isOnline
}

export function togglePsychologistStatus(patientId: string): void {
  const currentStatus = isPsychologistOnline(patientId)
  localStorage.setItem(`psychologist_online_${patientId}`, String(!currentStatus))
}
