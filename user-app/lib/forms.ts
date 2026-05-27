"use client"

export interface FormQuestion {
  id: string
  question: string
  type: "scale" | "text" | "multipleChoice"
  options?: string[]
}

export interface FormResponse {
  id: string
  patientId: string
  timestamp: Date
  answers: Record<string, string | number>
  completed: boolean
}

export interface ActiveForm {
  id: string
  patientId: string
  availableAt: Date
  expiresAt: Date
  completed: boolean
}

export const MOOD_FORMS: FormQuestion[] = [
  {
    id: "mood",
    question: "¿Cómo te sientes hoy?",
    type: "scale",
  },
  {
    id: "sleep",
    question: "¿Cómo has dormido?",
    type: "multipleChoice",
    options: ["Muy bien", "Bien", "Regular", "Mal", "Muy mal"],
  },
  {
    id: "anxiety",
    question: "Nivel de ansiedad (1-10)",
    type: "scale",
  },
  {
    id: "notes",
    question: "¿Algo que quieras compartir sobre tu día?",
    type: "text",
  },
]

export function generateActiveForm(patientId: string): ActiveForm {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 horas para completar

  return {
    id: `form-${Date.now()}`,
    patientId,
    availableAt: now,
    expiresAt,
    completed: false,
  }
}

export function getActiveForm(patientId: string): ActiveForm | null {
  const data = localStorage.getItem(`activeForm-${patientId}`)

  if (!data) {
    const newForm = generateActiveForm(patientId)
    saveActiveForm(newForm)
    return newForm
  }

  try {
    const form = JSON.parse(data)
    form.availableAt = new Date(form.availableAt)
    form.expiresAt = new Date(form.expiresAt)

    // Si ya expiró o está completado, crear uno nuevo para demostración
    if (new Date() > form.expiresAt || form.completed) {
      localStorage.removeItem(`activeForm-${patientId}`)
      const newForm = generateActiveForm(patientId)
      saveActiveForm(newForm)
      return newForm
    }

    return form
  } catch {
    const newForm = generateActiveForm(patientId)
    saveActiveForm(newForm)
    return newForm
  }
}

export function saveActiveForm(form: ActiveForm): void {
  localStorage.setItem(`activeForm-${form.patientId}`, JSON.stringify(form))
}

export function completeActiveForm(patientId: string): void {
  const form = getActiveForm(patientId)
  if (form) {
    form.completed = true
    saveActiveForm(form)
  }
}

export function shouldShowForm(): boolean {
  const lastFormTime = localStorage.getItem("lastFormTime")

  if (!lastFormTime) return true

  const lastTime = new Date(lastFormTime)
  const now = new Date()
  const hoursSince = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60)

  // Mostrar formulario cada 6 horas
  return hoursSince >= 6
}

export function saveFormResponse(response: FormResponse): void {
  const responses = getFormResponses()
  responses.push(response)
  localStorage.setItem("formResponses", JSON.stringify(responses))
  localStorage.setItem("lastFormTime", new Date().toISOString())
}

export function getFormResponses(): FormResponse[] {
  const data = localStorage.getItem("formResponses")
  if (!data) return []

  try {
    const responses = JSON.parse(data)
    return responses.map((r: any) => ({
      ...r,
      timestamp: new Date(r.timestamp),
    }))
  } catch {
    return []
  }
}
