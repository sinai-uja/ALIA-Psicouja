"use client"

import { useState, useEffect, useMemo, useCallback, ChangeEvent, useRef } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Calendar,
  FileText,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Bold,
  Italic,
  BarChart2,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  ClipboardList,
  Clock,
  Activity,
  Heart,
  Brain,
  Smile,
  Zap,
  Moon,
  Sun,
  Flame,
  Star,
  FileQuestion,
  RefreshCw,
  Edit2,
  RotateCcw,
  Key,
  Copy,
  Download,
  Users,
  Bot,
  Search,
  Sparkles,
  Loader2,
  MessageSquareReply,
  CheckCircle2,
  ArrowRight
} from "lucide-react"
import { ChatTranscript } from "@/components/chat-transcript"
import { useLanguage } from "@/contexts/language-context"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import * as api from "@/lib/api"
import type { AssessmentStat as ApiAssessmentStat } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

const IA_PROFILES = [
  {
    id: "lucia",
    name: "Lucía",
    disorder: "Ansiedad",
    description: "19 años, 1º de carrera. Autoexigente y perfeccionista.",
    prompt: "Eres Lucía, una estudiante de 19 años en su primer año de Psicología en la Universidad de Jaén. Eres muy responsable y te exiges demasiado. Te preocupa constantemente no estar a la altura y te comparas con otros. Das muchas vueltas a las cosas y te cuesta desconectar, incluso cuando no estás estudiando. Hablas de forma rápida y algo tensa, con dudas como 'no sé' o 'igual es una tontería pero…'. En terapia quieres hacerlo bien, incluso responder correctamente, pero te frustras cuando no tienes respuestas claras. Aunque entiendes los consejos, dudas de si te servirán. No seas complaciente: muestra presión interna, inseguridad y dificultad para relajarte."
  },
  {
    id: "david",
    name: "David",
    disorder: "Estado de ánimo bajo",
    description: "22 años, último año. Desmotivado y perdido.",
    prompt: "Eres David, un estudiante de 22 años en su último año de Administración y Dirección de Empresas en la Universidad de Jaén. No tienes claro qué hacer con tu futuro y te sientes bastante desmotivado. Te cuesta concentrarte y encontrar sentido a lo que haces. Sueles restar importancia a las cosas o hacer comentarios como 'tampoco es para tanto'. Hablas de forma informal, con poca energía, a veces evasiva. En terapia no estás del todo convencido de que sirva, y te cuesta implicarte. Puedes evitar preguntas incómodas o responder con pocas ganas. No muestres cambios rápidos ni entusiasmo repentino: mantén apatía, dudas y cierta indiferencia."
  },
  {
    id: "sara",
    name: "Sara",
    disorder: "Inseguridad",
    description: "20 años, 2º de carrera. Miedo al juicio y baja autoestima.",
    prompt: "Eres Sara, una estudiante universitaria de 20 años que estudia Educación Primaria en la Universidad de Jaén. Te preocupa mucho lo que los demás piensen de ti y te sientes insegura en situaciones sociales. Te cuesta participar en clase o iniciar conversaciones. Hablas con dudas, pausas y cierta timidez, usando frases como 'perdón' o 'igual es una tontería…'. En terapia te cuesta abrirte y al principio respondes de forma breve. Poco a poco puedes decir algo más, pero con incomodidad. Evita sonar segura o extrovertida de repente. Mantén el miedo al juicio y la inseguridad presentes."
  }
]

const NOTE_COLORS = [
  { value: "bg-white", label: "White" },
  { value: "bg-soft-peach", label: "Peach" },
  { value: "bg-soft-lavender", label: "Lavender" },
  { value: "bg-calm-teal/20", label: "Mint" },
  { value: "bg-amber-100", label: "Yellow" },
]

// Available Icons for Questionnaires
const AVAILABLE_ICONS = [
  { name: "Activity", icon: Activity },
  { name: "Heart", icon: Heart },
  { name: "Brain", icon: Brain },
  { name: "Smile", icon: Smile },
  { name: "Zap", icon: Zap },
  { name: "Moon", icon: Moon },
  { name: "Sun", icon: Sun },
  { name: "Flame", icon: Flame },
  { name: "Star", icon: Star },
  { name: "FileQuestion", icon: FileQuestion },
]

interface Session extends api.Session { }

export default function PatientStatisticsPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const patientId = params.id as string
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const hasInitialTabSet = useRef(false)
  /* Removed mock data initialization */
  const [activeTab, setActiveTab] = useState<"assessment" | "sessions" | "chat" | "notes" | "questionnaires" | "ia-config" | "summary">("summary")
  const [isResettingIa, setIsResettingIa] = useState(false)
  const [isBitacoraExpanded, setIsBitacoraExpanded] = useState(false)
  const [chatKey, setChatKey] = useState(0)
  const [draftSessionNotes, setDraftSessionNotes] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem(`draftNotes_${patientId}`) || ""
    return ""
  })
  const [draftSessionDescription, setDraftSessionDescription] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem(`draftDesc_${patientId}`) || ""
    return ""
  })

  const updateDraftNotes = (val: string) => {
    setDraftSessionNotes(val)
    if (typeof window !== "undefined") localStorage.setItem(`draftNotes_${patientId}`, val)
  }

  const updateDraftDesc = (val: string) => {
    setDraftSessionDescription(val)
    if (typeof window !== "undefined") localStorage.setItem(`draftDesc_${patientId}`, val)
  }

  // --- Questionnaires History State ---
  interface AnsweredQuestionnaire {
    id: string
    questionnaireTitle: string
    icon: string
    date: string
    rawDate: Date
    time: string
    answers: {
      questionText: string
      answer: string | number
      type?: "likert" | "scale" | "frequency" | "openText"
      options?: string[]
      maxValue?: number
      minValue?: number
      minLabel?: string
      maxLabel?: string
    }[]
    readByTherapist: boolean
    isDelayed?: boolean
    delayTime?: string
  }

  const [questionnaireHistory, setQuestionnaireHistory] = useState<AnsweredQuestionnaire[]>([])
  const [questionnaireFilter, setQuestionnaireFilter] = useState<string>("all")

  // Compute unique titles for filter
  const uniqueQuestionnaires = Array.from(new Set(questionnaireHistory.map(q => q.questionnaireTitle)))
  const contentEditableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (patientId) {
      const fetchHistory = () => {
        api.getQuestionnaireCompletions(patientId).then((completions) => {
          // Filter for completed completions with answers
          const completed = completions.filter(c => c.status === 'completed' && c.answers && c.answers.length > 0)

          const parseUtc = (d: string) => {
            // If it looks like an ISO string but has no timezone info (Z, +, - after time part), treat as UTC
            // Standard ISO date contains dashes (YYYY-MM-DD), so we shouldn't check !d.includes('-') globally
            // We check if it ends with Z or has a timezone offset
            const hasTimezone = d.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(d);
            if (d.includes('T') && !hasTimezone) {
              return new Date(d + 'Z');
            }
            return new Date(d);
          }

          const history: AnsweredQuestionnaire[] = completed.map(c => ({
            id: c.id,
            questionnaireTitle: c.questionnaire?.title || "Cuestionario",
            icon: c.questionnaire?.icon || "FileQuestion",
            date: c.completedAt ? parseUtc(c.completedAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "Fecha desconocida",
            rawDate: c.completedAt ? parseUtc(c.completedAt) : new Date(),
            time: c.completedAt ? parseUtc(c.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--",
            answers: (c.answers || []).map((ans: any, idx: number) => {
              const qDef = c.questionnaire?.questions?.[idx]
              return {
                questionText: ans.question_text || qDef?.text || ans.questionId || "Pregunta",
                answer: ans.value || ans.answer, // Check both value and answer keys
                type: ans.type || qDef?.type || "openText",
                options: ans.options || qDef?.options || [],
                maxValue: ans.max_value || qDef?.max || 5,
                minValue: ans.min_value || qDef?.min || 1,
                minLabel: ans.min_label || qDef?.minLabel,
                maxLabel: ans.max_label || qDef?.maxLabel
              }
            }),
            readByTherapist: (c as any).read_by_therapist || false,
            // Calculate delayed status locally to avoid backend timezone issues
            ...(function () {
              if (c.scheduledAt && c.completedAt) {
                const deadlineHours = c.deadlineHours || 24;

                // Scheduled is "Patient Local Time" (e.g. 09:00 on their clock)
                const parseLocal = (d: string) => {
                  return new Date(d).getTime();
                }

                // Completed is "Server Time" (UTC in production)
                // We use the same fixed logic as above
                const parseUtc = (d: string) => {
                  const hasTimezone = d.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(d);
                  if (d.includes('T') && !hasTimezone) {
                    return new Date(d + 'Z').getTime();
                  }
                  return new Date(d).getTime();
                }

                const scheduledTime = parseLocal(c.scheduledAt);
                const completedTime = parseUtc(c.completedAt);

                const deadlineTime = scheduledTime + (deadlineHours * 60 * 60 * 1000);

                const diffMs = completedTime - deadlineTime;

                if (diffMs > 0) {
                  const diffMins = Math.floor(diffMs / 60000);
                  const hours = Math.floor(diffMins / 60);
                  const minutes = diffMins % 60;
                  const delayStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

                  return {
                    isDelayed: true,
                    delayTime: delayStr
                  };
                }
              }
              return {
                isDelayed: false,
                delayTime: undefined
              };
            })()
          }))
          setQuestionnaireHistory(history)
        })
      }

      fetchHistory()
      const interval = setInterval(fetchHistory, 60000)
      return () => clearInterval(interval)
    }
  }, [patientId])

  const [expandedQuestionnaireId, setExpandedQuestionnaireId] = useState<string | null>(null)
  const [selectedGraphQuestion, setSelectedGraphQuestion] = useState<string | null>(null)
  const [graphDateFilter, setGraphDateFilter] = useState<"all" | "week" | "month">("all")

  // Reset selected question when filter changes
  useEffect(() => {
    setSelectedGraphQuestion(null)
  }, [questionnaireFilter])

  // Get available questions for the selected questionnaire type
  const availableGraphQuestions = useMemo(() => {
    if (questionnaireFilter === "all") return []

    // Map question text to its number (index + 1) in the questionnaire history
    // We use the first completion of this type to determine the order
    const sample = questionnaireHistory.find(q => q.questionnaireTitle === questionnaireFilter)
    if (!sample) return []

    return sample.answers
      .map((ans, idx) => ({ text: ans.questionText, number: idx + 1, type: ans.type }))
      .filter(q => q.type === "likert" || q.type === "scale")
  }, [questionnaireHistory, questionnaireFilter])

  const graphData = useMemo(() => {
    if (questionnaireFilter === "all" || !selectedGraphQuestion) return []

    const now = new Date()
    let cutoffDate: Date | null = null
    if (graphDateFilter === "week") {
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (graphDateFilter === "month") {
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    return questionnaireHistory
      .filter(q => q.questionnaireTitle === questionnaireFilter)
      .filter(q => !cutoffDate || q.rawDate >= cutoffDate)
      .map(q => {
        const answer = q.answers.find(ans => ans.questionText === selectedGraphQuestion)
        return {
          date: q.date,
          dateTime: `${q.date} ${q.time}`,
          fullDate: q.rawDate,
          score: answer ? Number(answer.answer) : null,
          time: q.time
        }
      })
      .filter(d => d.score !== null)
      .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime())
  }, [questionnaireHistory, questionnaireFilter, selectedGraphQuestion, graphDateFilter])

  const toggleQuestionnaireDetails = async (id: string) => {
    if (expandedQuestionnaireId === id) {
      setExpandedQuestionnaireId(null)
    } else {
      setExpandedQuestionnaireId(id)

      // Find the questionnaire in history
      const q = questionnaireHistory.find(item => item.id === id)
      if (q && !q.readByTherapist) {
        const success = await api.markQuestionnaireAsRead(id)
        if (success) {
          // Update local state to reflect it's read
          setQuestionnaireHistory(prev => prev.map(item =>
            item.id === id ? { ...item, readByTherapist: true } : item
          ))
        }
      }
    }
  }

  const handleDownloadCSV = () => {
    if (questionnaireHistory.length === 0) {
      toast({
        title: "No hay datos",
        description: "No hay cuestionarios para descargar.",
        variant: "destructive",
      })
      return
    }

    // Define CSV headers
    const headers = [
      "ID",
      "Fecha",
      "Hora",
      "Cuestionario",
      "Pregunta",
      "Respuesta",
      "Valor Máximo",
      "Completado con retraso",
      "Tiempo de retraso"
    ]

    // Initialize rows with headers
    const rows: (string | number)[][] = [headers]

    // Filter based on current selection if needed, or download all?
    // Let's download currently filtered view to match user expectation, or all if "all" is selected.
    const dataToDownload = questionnaireHistory
      .filter(item => questionnaireFilter === "all" || item.questionnaireTitle === questionnaireFilter)
      .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())

    if (dataToDownload.length === 0) {
      toast({
        title: "No hay datos filtrados",
        description: "No hay cuestionarios que coincidan con el filtro actual.",
        variant: "destructive",
      })
      return
    }

    dataToDownload.forEach(q => {
      q.answers.forEach(ans => {
        const row = [
          q.id,
          q.date,
          q.time,
          `"${q.questionnaireTitle.replace(/"/g, '""')}"`, // Escape quotes
          `"${ans.questionText.replace(/"/g, '""')}"`,
          `"${String(ans.answer).replace(/"/g, '""')}"`,
          ans.maxValue || 5, // Default scalar
          q.isDelayed ? "Sí" : "No",
          q.delayTime || "-"
        ]
        rows.push(row)
      })
    })

    // Convert to CSV string with BOM for Excel compatibility
    const csvContent = "\uFEFF" + rows.map(e => e.join(",")).join("\n")

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)

    // User requested filename to be the case number + questionnaire type
    const caseNumber = patient?.patientCode || patientId || "paciente"
    const typeSuffix = questionnaireFilter === "all" ? "Todos" : questionnaireFilter
    const fileName = `${caseNumber}_${typeSuffix}`.replace(/ /g, "_") // Replace spaces with underscores for safer filenames

    link.setAttribute("download", `${fileName}.csv`)

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // --- Assessment Stats State ---
  type AssessmentStat = Omit<ApiAssessmentStat, "patient_id" | "created_at" | "updated_at">

  const [assessmentStats, setAssessmentStats] = useState<AssessmentStat[]>([])


  const [isStatDialogOpen, setIsStatDialogOpen] = useState(false)
  const [editingStat, setEditingStat] = useState<AssessmentStat | null>(null)
  const [statFormData, setStatFormData] = useState<Omit<AssessmentStat, "id">>({
    label: "",
    value: "",
    status: "mild",
    color: "teal",
  })

  // --- Clinical Summary State ---
  const [clinicalSummary, setClinicalSummary] = useState(
    "El paciente ha estado sintiendo ansiedad por el trabajo recientemente."
  )
  const [isEditingSummary, setIsEditingSummary] = useState(false)
  const [editedSummary, setEditedSummary] = useState("")

  // --- Notes State ---
  const [patientNotes, setPatientNotes] = useState<api.Note[]>([])

  const [sessions, setSessions] = useState<api.Session[]>([])
  const [messages, setMessages] = useState<api.ChatMessage[]>([])
  const [patient, setPatient] = useState<api.Patient | null>(null)
  const [sessionSearchTerm, setSessionSearchTerm] = useState("")

  // --- Bitacora Mapping ---
  const bitacoraEntries = useMemo(() => {
    if (!patient?.clinical_log) return {}
    const entries: Record<string, string> = {}
    patient.clinical_log.split('### ').filter(Boolean).forEach(entry => {
      const [title, ...content] = entry.split('\n')
      const sidMatch = title.match(/SID:(\d+)/)
      if (sidMatch) {
        entries[sidMatch[1]] = content.join('\n').trim()
      }
    })
    return entries
  }, [patient?.clinical_log])

  const filteredSessions = useMemo(() => {
    if (!sessionSearchTerm.trim()) return sessions.map(s => ({ session: s, matchReason: null }))
    const term = sessionSearchTerm.toLowerCase()
    
    return sessions.map(s => {
      let reason: string | null = null
      
      if (s.description.toLowerCase().includes(term)) {
        reason = "Coincidencia en título"
      } else if (bitacoraEntries[s.id]?.toLowerCase().includes(term)) {
        reason = "Coincidencia en análisis clínico"
      } else if (s.ai_summary?.toLowerCase().includes(term)) {
        reason = "Coincidencia en resumen IA"
      } else {
        // Search in chat history
        const matchingMsg = s.chatHistory?.find(m => m.text.toLowerCase().includes(term))
        if (matchingMsg) {
          const senderName = matchingMsg.sender === 'patient' ? 'Paciente' : 'Terapeuta'
          reason = `Encontrado en mensajes (${senderName}): "${matchingMsg.text.substring(0, 40)}..."`
        }
      }
      
      return reason ? { session: s, matchReason: reason } : null
    }).filter((item): item is { session: api.Session, matchReason: string | null } => item !== null)
  }, [sessions, sessionSearchTerm, bitacoraEntries])

  // --- Bitacora Editing State ---
  const [editingBitacoraIndex, setEditingBitacoraIndex] = useState<number | null>(null)
  const [editingBitacoraContent, setEditingBitacoraContent] = useState("")
  const [isRegeneratingIndex, setIsRegeneratingIndex] = useState<number | null>(null)

  const handleEditBitacora = (index: number, content: string) => {
    setEditingBitacoraIndex(index)
    setEditingBitacoraContent(content)
  }

  const handleSaveBitacora = async (index: number) => {
    if (!patient) return
    const entries = patient.clinical_log?.split('### ').filter(Boolean) || []
    if (index < 0 || index >= entries.length) return
    
    // Replace content of the specific entry
    const entryParts = entries[index].split('\n')
    const header = entryParts[0]
    entries[index] = `${header}\n${editingBitacoraContent}\n\n`
    
    const newLog = "### " + entries.join('### ')
    const ok = await api.updateClinicalLog(patientId, newLog)
    if (ok) {
      setPatient({ ...patient, clinical_log: newLog })
      setEditingBitacoraIndex(null)
      toast({
        title: "Bitácora actualizada",
        description: "La entrada ha sido guardada correctamente."
      })
    }
  }

  const handleRegenerateBitacora = async (index: number, title: string) => {
    // Extract SID if present: SID:{id} | ...
    const sidMatch = title.match(/SID:(\d+)/)
    if (!sidMatch) {
      alert("No se puede regenerar esta entrada porque no tiene un ID de sesión asociado (es una entrada antigua).")
      return
    }
    
    const sessionId = sidMatch[1]
    setIsRegeneratingIndex(index)
    try {
      const res = await api.regenerateBitacoraEntry(sessionId)
      if (res.ok && res.clinical_log) {
        setPatient({ ...patient, clinical_log: res.clinical_log })
        toast({
          title: "Bitácora regenerada",
          description: "La IA ha vuelto a generar este resumen con éxito."
        })
      } else {
        toast({
          title: "Error",
          description: "No se pudo regenerar la entrada.",
          variant: "destructive"
        })
      }
    } finally {
      setIsRegeneratingIndex(null)
    }
  }

  const changeTab = (tab: "assessment" | "sessions" | "chat" | "notes" | "questionnaires" | "ia-config" | "summary") => {
    setActiveTab(tab)
    const params = new URLSearchParams(window.location.search)
    params.set('tab', tab)
    params.delete('openChat')
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false })
  }

  const refreshSessions = useCallback(() => {
    if (!patientId) return
    api.getSessions(patientId).then(sessions => setSessions(sessions))
  }, [patientId])

  const fetchPatientData = useCallback(() => {
    if (!patientId) return
    
    // Load Notes
    api.getNotes(patientId).then(notes => setPatientNotes(notes))
    // Load Sessions
    refreshSessions()
    // Load Messages
    api.getMessages(patientId).then(msgs => setMessages(msgs))
    // Load Assessment Stats
    api.getAssessmentStats(patientId).then(stats => {
      setAssessmentStats(stats.map(s => ({
        id: s.id,
        label: s.label,
        value: s.value,
        status: s.status as any,
        color: s.color as any
      })))
    })
    // Load Patient Info and verify access
    api.getPatients().then(patients => {
      const found = patients.find(p => p.id === patientId)
      if (found) {
        // User has access to this patient (API already filters by psychologist)
        setPatient(found)
        // Only update if not editing
        setClinicalSummary(prev => {
          if (isEditingSummary) return prev
          return found.clinical_summary || ""
        })
      } else {
        // Patient not in the list - user doesn't have access
        // Redirect back to dashboard with error
        toast({
          title: "Acceso denegado",
          description: "No tienes acceso a este paciente",
          variant: "destructive",
        })
        router.push("/dashboard")
      }
    }).catch(() => {
      // API error (likely 403) - redirect
      router.push("/dashboard")
    })
  }, [patientId, router, toast, refreshSessions, isEditingSummary])

  useEffect(() => {
    fetchPatientData()
    const interval = setInterval(fetchPatientData, 10000) // Poll every 10 seconds
    return () => clearInterval(interval)
  }, [patientId, fetchPatientData])

  useEffect(() => {
    const openChat = searchParams.get('openChat') === 'true'
    const tab = searchParams.get('tab')

    if (openChat) {
      setActiveTab('chat')
      hasInitialTabSet.current = true
    } else if (tab) {
      setActiveTab(tab as any)
      hasInitialTabSet.current = true
    } else if (patient?.is_ia_patient && !tab && !hasInitialTabSet.current) {
      setActiveTab('ia-config')
      hasInitialTabSet.current = true
    }
  }, [searchParams, patient])

  // Assessment stats are now polled in fetchPatientData

  // ... (rest of the state from lines 129 onwards is unchanged, but I need to make sure I don't break the file structure)
  // I will just replace the useEffect block and verify the header part separately or in same tool call? 
  // I can't do non-contiguous edits easily without multi-replace, but here the edit is contiguous for the useEffect.
  // The header is further down.

  // Let's do the state and effect first.

  // Wait, I need to check where `useEffect` is.
  // It is lines 120-127.
  // Header is line 382.

  // I'll use multi_replace.


  const [newNoteTitle, setNewNoteTitle] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem(`newNoteTitle_${patientId}`) || ""
    return ""
  })
  const [newNoteContent, setNewNoteContent] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem(`newNoteContent_${patientId}`) || ""
    return ""
  })
  const [newNoteColor, setNewNoteColor] = useState("bg-white")
  
  const updateNewNoteTitle = (val: string) => {
    setNewNoteTitle(val)
    if (typeof window !== "undefined") localStorage.setItem(`newNoteTitle_${patientId}`, val)
  }

  const updateNewNoteContent = (val: string) => {
    setNewNoteContent(val)
    if (typeof window !== "undefined") localStorage.setItem(`newNoteContent_${patientId}`, val)
  }

  const [isPatientOnline, setIsPatientOnline] = useState(false)

  // Poll for patient status
  useEffect(() => {
    if (!patientId) return

    const checkStatus = async () => {
      try {
        const patients = await api.getPatients()
        const p = patients.find(p => p.id === patientId)
        if (p) {
          setIsPatientOnline(p.is_ia_patient ? true : (p.isOnline || false))
        }
      } catch (e) { console.error("Error polling status", e) }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 30000) // 30s polling
    return () => clearInterval(interval)
  }, [patientId])

  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null)
  const [chatAiSummary, setChatAiSummary] = useState("")
  const [chatNotes, setChatNotes] = useState("")
  const [chatDescription, setChatDescription] = useState("")
  const [isSavingChatNotes, setIsSavingChatNotes] = useState(false)
  const chatNotesRef = useRef<HTMLTextAreaElement>(null)
  const chatAiSummaryRef = useRef<HTMLTextAreaElement>(null)
  const editDialogNotesRef = useRef<HTMLTextAreaElement>(null)
  const [isRegeneratingSummary, setIsRegeneratingSummary] = useState(false)
  const [regeneratingSessionIds, setRegeneratingSessionIds] = useState<Set<string>>(new Set())
  const [isDetailsDirty, setIsDetailsDirty] = useState(false)



  useEffect(() => {
    if (viewingSessionId) {
      const session = sessions.find(s => s.id === viewingSessionId)
      if (session) {
        // Only update if we are not dirty OR if we just switched sessions
        // We use a ref to track the last loaded ID to distinguish between polling updates and session switches
        if (!isDetailsDirty) {
          setChatNotes(session.notes || "")
          setChatDescription(session.description || "")
          setChatAiSummary(session.ai_summary || "")
        }
      }
    }
  }, [viewingSessionId, sessions, isDetailsDirty])

  // Reset dirty state when switching sessions
  useEffect(() => {
    setIsDetailsDirty(false)
  }, [viewingSessionId])

  useEffect(() => {
    // Check if any session is waiting for a summary
    const sessionsWaiting = sessions.filter(s => 
      s.chatHistory && s.chatHistory.length > 0 && !s.ai_summary
    );

    if (sessionsWaiting.length > 0) {
      // Start polling more frequently (every 3 seconds) until all are ready
      const interval = setInterval(() => {
        refreshSessions();
      }, 3000);
      
      return () => clearInterval(interval);
    } else if (regeneratingSessionIds.size > 0) {
      // Also poll if we manually triggered a regeneration
      const interval = setInterval(() => {
        refreshSessions();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [sessions, refreshSessions, regeneratingSessionIds]);

  // Clean up regeneratingSessionIds when summary arrives
  useEffect(() => {
    if (regeneratingSessionIds.size > 0) {
      const newRegenerating = new Set(regeneratingSessionIds)
      let changed = false
      regeneratingSessionIds.forEach(id => {
        const session = sessions.find(s => s.id === id)
        if (session?.ai_summary) {
          newRegenerating.delete(id)
          changed = true
        }
      })
      if (changed) setRegeneratingSessionIds(newRegenerating)
    }
  }, [sessions, regeneratingSessionIds])

  const [activeMetric, setActiveMetric] = useState<"messages" | "responseTime" | "therapistMessages" | "duration" | "totalMessages">("messages")

  const metrics = [
    { id: "messages" as const, label: "patientMessages", dataKey: "messages", color: "#3B82F6", icon: MessageSquare },
    { id: "therapistMessages" as const, label: "therapistMessages", dataKey: "therapistMessages", color: "#6366F1", icon: MessageSquare },
    { id: "responseTime" as const, label: "avgResponseTime", dataKey: "responseTime", color: "#10B981", icon: Clock },
    { id: "duration" as const, label: "sessionDuration", dataKey: "duration", color: "#F59E0B", icon: Calendar },
    { id: "totalMessages" as const, label: "totalWords", dataKey: "totalMessages", color: "#EF4444", icon: BarChart2 },
  ]

  const [statsSessionId, setStatsSessionId] = useState<string | null>(null)
  const [showGeneralStats, setShowGeneralStats] = useState(false)

  const calculateStats = (session: Session) => {
    const patientMsgs = session.chatHistory.filter(m => m.sender === "patient")
    const therapistMsgs = session.chatHistory.filter(m => m.sender === "therapist")

    const patientWords = patientMsgs.reduce((acc, curr) => acc + (curr.text?.split(/\s+/).length || 0), 0)
    const therapistWords = therapistMsgs.reduce((acc, curr) => acc + (curr.text?.split(/\s+/).length || 0), 0)
    const totalWords = patientWords + therapistWords

    // Función auxiliar para parsear el formato "DD/MM/YYYY, HH:MM:SS"
    const parseTimestamp = (ts: string) => {
      try {
        if (!ts.includes(',')) return new Date(ts).getTime(); // ISO fallback
        const [datePart, timePart] = ts.split(', ');
        const [day, month, year] = datePart.split('/').map(Number);
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
      } catch (e) {
        return NaN;
      }
    };

    let duration = 0
    if (session.chatHistory.length > 1) {
      const start = parseTimestamp(session.chatHistory[0].timestamp)
      const end = parseTimestamp(session.chatHistory[session.chatHistory.length - 1].timestamp)
      if (!isNaN(start) && !isNaN(end)) {
        duration = Math.round((end - start) / (1000 * 60))
      }
    }

    // --- Cálculo del Tiempo de Respuesta Promedio ---
    let totalResponseTimeMs = 0
    let responseCount = 0

    for (let i = 1; i < session.chatHistory.length; i++) {
      const current = session.chatHistory[i]
      const previous = session.chatHistory[i - 1]

      // Solo calculamos si el paciente responde a un mensaje previo del terapeuta
      if (current.sender === "patient" && previous.sender === "therapist") {
        const currTime = parseTimestamp(current.timestamp)
        const prevTime = parseTimestamp(previous.timestamp)

        if (!isNaN(currTime) && !isNaN(prevTime)) {
          const diff = currTime - prevTime

          // Filtro de seguridad: Si la respuesta tarda más de 2 horas, 
          // probablemente no es una respuesta directa en la conversación activa.
          if (diff > 0 && diff < 1000 * 60 * 120) {
            totalResponseTimeMs += diff
            responseCount++
          }
        }
      }
    }

    // Convertimos a segundos para una lectura más fácil en las gráficas
    const avgResponseSeconds = responseCount > 0
      ? Math.round((totalResponseTimeMs / responseCount) / 1000)
      : 0

    return {
      patientCount: patientMsgs.length,
      therapistCount: therapistMsgs.length,
      patientWords,
      therapistWords,
      totalWords,
      duration: duration || parseInt(session.duration) || 0,
      avgResponseSeconds
    }
  }

  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated")
    if (!auth) {
      router.push("/login")
    } else {
      setIsAuthenticated(true)
    }
  }, [router])



  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)

  // --- Note Handlers ---
  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return

    const finalTitle = newNoteTitle.trim() || "Nota sin título"

    if (editingNoteId) {
      setPatientNotes(patientNotes.map(note =>
        note.id === editingNoteId
          ? { ...note, title: finalTitle, content: newNoteContent, color: newNoteColor, date: new Date().toISOString().split("T")[0] }
          : note
      ))
      setEditingNoteId(null)
    } else {
      const newNote = await api.createNote(patientId, finalTitle, newNoteContent, newNoteColor)
      if (newNote) {
        setPatientNotes([newNote, ...patientNotes])
      }
    }

    updateNewNoteTitle("")
    updateNewNoteContent("")
    if (contentEditableRef.current) {
      contentEditableRef.current.innerHTML = ""
    }
    setNewNoteColor("bg-white")
  }

  const handleEditNote = (note: api.Note) => {
    setEditingNoteId(note.id)
    updateNewNoteTitle(note.title)
    updateNewNoteContent(note.content)
    setNewNoteColor(note.color)

    const editor = document.getElementById("note-editor")
    if (editor) editor.innerHTML = note.content
  }

  const handleCancelEdit = () => {
    setEditingNoteId(null)
    updateNewNoteTitle("")
    updateNewNoteContent("")
    setNewNoteColor("bg-white")

    const editor = document.getElementById("note-editor")
    if (editor) editor.innerHTML = ""
  }

  const handleDeleteNote = (noteId: string) => {
    setPatientNotes(patientNotes.filter((note) => note.id !== noteId))
  }

  const execCommand = (command: string) => {
    document.execCommand(command, false)
  }

  // --- Session Handlers ---
  const handleSaveAndCloseChat = async (messages: any[], notes: string, description: string) => {

    try {
      const parseDate = (dateStr?: string) => {
        if (!dateStr) return null;

        const time = new Date(dateStr).getTime();
        return isNaN(time) ? null : time;
      };

      const chatSnapshot = messages.map(m => ({
        text: m.text,
        sender: m.sender,
        timestamp: m.timestamp,
        was_edited_by_human: m.was_edited_by_human ?? false,
        ai_suggestion_log_id: m.ai_suggestion_log_id ?? null
      }));

      let durationStr = "1 min";
      console.log("TIMESTAMPS:", chatSnapshot.map(m => m.timestamp))

      if (chatSnapshot.length >= 2) {
        const firstMsgTime = parseDate(chatSnapshot[0].timestamp);
        const lastMsgTime = parseDate(chatSnapshot[chatSnapshot.length - 1].timestamp);

        if (firstMsgTime && lastMsgTime) {
          const diffInMs = lastMsgTime - firstMsgTime;
          // Usamos Math.floor para minutos completos o Math.round para el más cercano
          const diffInMinutes = Math.floor(diffInMs / 60000);

          // Si la diferencia es de 3 minutos como en tu ejemplo, pondrá 3.
          durationStr = `${diffInMinutes > 0 ? diffInMinutes : 1} min`;
        }
      }
      console.log("Duracion------------------------------" + String(durationStr))
      const payload = {
        patient_id: patientId,
        duration: durationStr,
        description: description || "Sesión de Chat",
        notes: notes || "Sin notas adicionales",
        chatHistory: chatSnapshot // Tu api.ts lo convertirá a chat_snapshot
      };

      const newSession = await api.createSession(payload)

      if (newSession) {
        await api.clearChat(patientId)
        
        // Primero actualizamos el estado local y la URL para una transición inmediata
        setSessions(prev => [newSession, ...prev])
        changeTab("sessions")
        updateDraftNotes("")
        updateDraftDesc("")

        // Refrescamos los datos del paciente en segundo plano
        fetchPatientData()
        
        toast({
          title: t("success") || "Éxito",
          description: t("sessionSavedSuccessfully") || "Sesión guardada correctamente",
        })
      } else {
        toast({
          title: t("error") || "Error",
          description: t("errorSavingSession") || "Error al guardar la sesión",
          variant: "destructive",
        })
      }
    } catch (e) {
      console.error(e)
      toast({
        title: t("error") || "Error",
        description: "Error inesperado al guardar la sesión",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm(t("confirmDeleteSession") || "Are you sure you want to delete this session?")) return

    try {
      const success = await api.deleteSession(sessionId)
      if (success) {
        setSessions(sessions.filter(s => s.id !== sessionId))
        toast({
          title: t("success") || "Success",
          description: t("sessionDeleted") || "Session deleted successfully",
        })
      } else {
        toast({
          title: t("error") || "Error",
          description: t("errorDeletingSession") || "Failed to delete session",
          variant: "destructive",
        })
      }
    } catch (e) {
      console.error(e)
      toast({
        title: t("error") || "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const handleSaveSessionDetails = async () => {
    if (!viewingSessionId) return
    setIsSavingChatNotes(true)
    try {
      const updated = await api.updateSession(viewingSessionId, {
        notes: chatNotes,
        description: chatDescription,
        ai_summary: chatAiSummary
      })
      if (updated) {
        setSessions(prev => prev.map(s => s.id === viewingSessionId ? updated : s))
        setIsDetailsDirty(false)
        toast({ title: t("success"), description: t("sessionUpdated") || "Sesión actualizada" })
      }
    } catch (e) {
      toast({
        title: t("error"),
        description: t("errorSavingSession") || "Error al guardar la sesión",
        variant: "destructive"
      })
    } finally {
      setIsSavingChatNotes(false)
    }
  }

  const handleRegenerateSummary = async (sessionId: string) => {
    setIsRegeneratingSummary(true)
    try {
      const success = await api.regenerateSessionSummary(sessionId)
      if (success) {
        // Optimistically update local session to show loading
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ai_summary: "" } : s))
        setRegeneratingSessionIds(prev => new Set(prev).add(sessionId))
        toast({
          title: t("generating") || "Generando...",
          description: t("regeneratingSummaryDesc") || "El resumen se está regenerando. Aparecerá en breve."
        })
      }
    } catch (e) {
      toast({
        title: t("error"),
        description: t("errorRegeneratingSummary") || "Error al regenerar el resumen",
        variant: "destructive"
      })
    } finally {
      setIsRegeneratingSummary(false)
    }
  }

  // --- Assessment Stat Handlers ---
  const handleOpenStatDialog = (stat?: AssessmentStat) => {
    if (stat) {
      setEditingStat(stat)
      setStatFormData({
        label: stat.label,
        value: stat.value,
        status: stat.status,
        color: stat.color,
      })
    } else {
      setEditingStat(null)
      setStatFormData({
        label: "",
        value: "",
        status: "mild",
        color: "teal",
      })
    }
    setIsStatDialogOpen(true)
  }

  const [isEditSessionDetailsDialogOpen, setIsEditSessionDetailsDialogOpen] = useState(false)
  const [editingSessionForDetails, setEditingSessionForDetails] = useState<Session | null>(null)
  const [editSessionDetailsFormData, setEditSessionDetailsFormData] = useState({
    description: "",
    notes: ""
  })

  // --- Auto-resize Logic ---
  const adjustTextareaHeight = (ref: React.RefObject<HTMLTextAreaElement | null>) => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight(chatNotesRef);
  }, [chatNotes]);

  useEffect(() => {
    adjustTextareaHeight(chatAiSummaryRef);
  }, [chatAiSummary]);

  useEffect(() => {
    adjustTextareaHeight(editDialogNotesRef);
  }, [editSessionDetailsFormData.notes]);

  const handleOpenEditSessionDetailsDialog = (session: Session) => {
    setEditingSessionForDetails(session)
    setEditSessionDetailsFormData({
      description: session.description || "",
      notes: session.notes || ""
    })
    setIsEditSessionDetailsDialogOpen(true)
  }

  const handleSaveEditedSessionDetails = async () => {
    if (!editingSessionForDetails) return

    try {
      const updated = await api.updateSession(editingSessionForDetails.id, {
        description: editSessionDetailsFormData.description,
        notes: editSessionDetailsFormData.notes
      })
      if (updated) {
        setSessions(sessions.map(s => s.id === editingSessionForDetails.id ? updated : s))
        toast({
          title: t("success"),
          description: t("sessionUpdated") || "Sesión actualizada correctamente",
        })
        setIsEditSessionDetailsDialogOpen(false)
        setEditingSessionForDetails(null)
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: "Error al actualizar la sesión",
        variant: "destructive",
      })
    }
  }

  const handleSaveStat = async () => {
    if (!statFormData.label || !statFormData.value) return

    // Auto-assign color based on status if not manually set
    let color: "teal" | "amber" | "coral" = "teal"
    if (statFormData.status === "moderate") color = "amber"
    if (statFormData.status === "high" || statFormData.status === "severe") color = "coral"

    const dataToSave = { ...statFormData, color }

    try {
      if (editingStat) {
        const updated = await api.updateAssessmentStat(editingStat.id, dataToSave)
        if (updated) {
          setAssessmentStats(
            assessmentStats.map((s) => (s.id === editingStat.id ? { id: updated.id, ...dataToSave } : s))
          )
          toast({ title: "Stat updated", description: "Assessment stat has been updated successfully." })
        }
      } else {
        const created = await api.createAssessmentStat(patientId, dataToSave)
        if (created) {
          setAssessmentStats([
            ...assessmentStats,
            { id: created.id, ...dataToSave },
          ])
          toast({ title: "Stat created", description: "Assessment stat has been created successfully." })
        }
      }
      setIsStatDialogOpen(false)
      setEditingStat(null)
      setStatFormData({ label: "", value: "", status: "mild", color: "teal" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to save assessment stat.", variant: "destructive" })
    }
  }

  const handleDeleteStat = async (id: string) => {
    try {
      const success = await api.deleteAssessmentStat(id)
      if (success) {
        setAssessmentStats(assessmentStats.filter((s) => s.id !== id))
        toast({ title: "Stat deleted", description: "Assessment stat has been removed." })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete assessment stat.", variant: "destructive" })
    }
  }

  const handleStartEditSummary = () => {
    setEditedSummary(clinicalSummary)
    setIsEditingSummary(true)
  }

  const handleSaveSummary = async () => {
    try {
      const success = await api.updateClinicalSummary(patientId, editedSummary)
      if (success) {
        setClinicalSummary(editedSummary)
        setIsEditingSummary(false)
        toast({ title: "Summary saved", description: "Clinical summary has been updated." })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save clinical summary.", variant: "destructive" })
    }
  }

  const handleCancelEditSummary = () => {
    setIsEditingSummary(false)
  }

  const totalSessions = sessions.length

  const handleRegenerateCode = async () => {
    if (!confirm(t("confirmRegenerateCode"))) return

    try {
      const newCode = await api.regeneratePatientCode(patientId)
      if (newCode) {
        if (patient) {
          setPatient({ ...patient, access_code: newCode })
        }
        toast({
          title: t("codeRegenerated"),
          description: `${t("newCode")}: ${newCode}`,
        })
      } else {
        toast({
          title: t("error"),
          description: t("errorRegeneratingCode"),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error(error)
      toast({
        title: t("error"),
        description: "Unexpected error",
        variant: "destructive",
      })
    }
  }

  if (!isAuthenticated) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="rounded-xl hover:bg-muted">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-semibold text-neutral-charcoal mb-2">
              {patient?.is_ia_patient ? "Simulador de Paciente IA" : `${t("patient")} #${patient?.patientCode || patientId}`}
            </h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <p>{patient?.is_ia_patient ? "Entorno de práctica y configuración" : t("viewPatientInfo")}</p>
              {patient?.is_ia_patient && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {t("online") || "En línea"}
                </span>
              )}
              {patient?.access_code && !patient?.is_ia_patient && (
                <div className="flex items-center gap-2 bg-muted/40 px-3 py-1 rounded-full border border-soft-gray ml-2">
                  <Key className="h-3 w-3 text-calm-teal" />
                  <span className="text-xs font-mono font-medium text-neutral-charcoal tracking-wider">
                    ••••••
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 hover:bg-calm-teal/10 text-muted-foreground hover:text-calm-teal rounded-full"
                    onClick={() => {
                      navigator.clipboard.writeText(patient.access_code)
                      alert("Código copiado: " + patient.access_code)
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          {patient?.is_ia_patient ? (
            <Button
              onClick={async () => {

                setIsResettingIa(true)
                try {
                  const ok = await api.resetIaPatient(patientId)
                  if (ok) {
                    toast({ title: "Paciente IA reseteado", description: "Todos los datos han sido eliminados" })
                    // Refresh data
                    setSessions([])
                    setChatKey(prev => prev + 1)
                    fetchPatientData()
                  } else {
                    toast({ title: "Error", description: "No se pudo resetear el paciente IA", variant: "destructive" })
                  }
                } finally { setIsResettingIa(false) }
              }}
              disabled={isResettingIa}
              variant="outline"
              className="rounded-xl border-calm-teal text-calm-teal hover:bg-calm-teal hover:text-white transition-colors"
            >
              {isResettingIa ? (
                <div className="h-4 w-4 border-2 border-calm-teal/30 border-t-calm-teal rounded-full animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Reiniciar Paciente
            </Button>
          ) : (
            <Button
              onClick={handleRegenerateCode}
              variant="outline"
              className="rounded-xl border-calm-teal text-calm-teal hover:bg-calm-teal hover:text-white transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("generateNewCode")}
            </Button>
          )}
        </div>

        <Card className="gap-0 py-0 rounded-2xl border-soft-gray shadow-soft p-0 overflow-hidden">
          <CardHeader className="border-b border-soft-gray p-0 pb-0 pb-[0!important] [&.border-b]:pb-0">
            <div className="flex gap-2 px-6 pt-2">
              {patient?.is_ia_patient && (
                <button
                  onClick={() => changeTab("ia-config")}
                  className={`px-6 py-3 text-sm font-medium transition-all rounded-t-xl translate-y-[1px] ${activeTab === "ia-config"
                    ? "bg-calm-teal text-white border-b-0 shadow-sm"
                    : "text-muted-foreground hover:text-neutral-charcoal hover:bg-muted/30"
                    }`}
                >
                  Paciente IA
                </button>
              )}
              <button
                onClick={() => changeTab("summary")}
                className={`px-6 py-3 text-sm font-medium transition-all rounded-t-xl translate-y-[1px] ${activeTab === "summary"
                  ? "bg-calm-teal text-white border-b-0 shadow-sm"
                  : "text-muted-foreground hover:text-neutral-charcoal hover:bg-muted/30"
                  }`}
              >
                Resumen
              </button>
              <button
                onClick={() => changeTab("chat")}
                className={`px-6 py-3 text-sm font-medium transition-all rounded-t-xl translate-y-[1px] ${activeTab === "chat"
                  ? "bg-calm-teal text-white border-b-0 shadow-sm"
                  : "text-muted-foreground hover:text-neutral-charcoal hover:bg-muted/30"
                  }`}
              >
                {t("chat")}
              </button>
              <button
                onClick={() => changeTab("sessions")}
                className={`px-6 py-3 text-sm font-medium transition-all rounded-t-xl translate-y-[1px] ${activeTab === "sessions"
                  ? "bg-calm-teal text-white border-b-0 shadow-sm"
                  : "text-muted-foreground hover:text-neutral-charcoal hover:bg-muted/30"
                  }`}
              >
                {t("sessions")} ({totalSessions})
              </button>
              <button
                onClick={() => changeTab("notes")}
                className={`px-6 py-3 text-sm font-medium transition-all rounded-t-xl translate-y-[1px] ${activeTab === "notes"
                  ? "bg-calm-teal text-white border-b-0 shadow-sm"
                  : "text-muted-foreground hover:text-neutral-charcoal hover:bg-muted/30"
                  }`}
              >
                {t("notes")}
              </button>
              <button
                onClick={() => changeTab("questionnaires")}
                className={`px-6 py-3 text-sm font-medium transition-all rounded-t-xl translate-y-[1px] ${activeTab === "questionnaires"
                  ? "bg-calm-teal text-white border-b-0 shadow-sm"
                  : "text-muted-foreground hover:text-neutral-charcoal hover:bg-muted/30"
                  }`}
              >
                {t("questionnaires")}
              </button>
              <button
                onClick={() => changeTab("assessment")}
                className={`px-6 py-3 text-sm font-medium transition-all rounded-t-xl translate-y-[1px] ${activeTab === "assessment"
                  ? "bg-calm-teal text-white border-b-0 shadow-sm"
                  : "text-muted-foreground hover:text-neutral-charcoal hover:bg-muted/30"
                  }`}
              >
                Evaluación
              </button>
            </div>
          </CardHeader>
        </Card>
        
        {activeTab === "ia-config" && patient?.is_ia_patient && (
          <div className="p-0 space-y-6">
            <Card className="rounded-2xl border-soft-gray shadow-soft overflow-hidden">
               <CardHeader className="bg-gradient-to-br from-calm-teal/5 to-white border-b border-soft-gray p-8 text-center">
                  <h2 className="text-3xl font-bold text-neutral-charcoal mb-3">Configuración del Paciente IA</h2>
                  <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Selecciona uno de los perfiles universitarios para iniciar una nueva simulación. Al elegir uno, se resetearán todos los datos previos para asegurar una práctica limpia.</p>
               </CardHeader>
               <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {IA_PROFILES.map((profile) => {
                    const isActive = patient.ia_patient_prompt === profile.prompt;
                    return (
                      <Card 
                        key={profile.id}
                        className={`relative flex flex-col h-full overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 p-0 ${
                          isActive ? "ring-2 ring-calm-teal shadow-lg scale-[1.02]" : "hover:border-calm-teal/50"
                        }`}
                        onClick={async () => {
                          if (isActive) {
                            changeTab("chat");
                            return;
                          }

                          
                          setIsResettingIa(true);
                          try {
                            await api.resetIaPatient(patientId);
                            const ok = await api.updateIaPatientPrompt(patientId, profile.prompt);
                            if (ok) {
                              toast({ title: "Perfil actualizado", description: `Simulando a ${profile.name} (${profile.disorder})` });
                              setChatKey(prev => prev + 1);
                              fetchPatientData();
                              changeTab("chat");
                            }
                          } finally {
                            setIsResettingIa(false);
                          }
                        }}
                      >
                        <CardHeader className={`${isActive ? "bg-calm-teal/15" : "bg-gray-50/50"} border-b border-soft-gray pt-8 pb-6`}>
                          <div className="flex justify-between items-start">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                <Users className="h-5 w-5 text-calm-teal" />
                                <CardTitle className="text-xl font-bold text-neutral-charcoal">{profile.name}</CardTitle>
                               </div>
                               <Badge className="bg-calm-teal/10 text-calm-teal border-calm-teal/20 font-bold uppercase tracking-wider text-[10px]">{profile.disorder}</Badge>
                            </div>
                            {isActive && <Badge className="bg-calm-teal text-white shadow-sm ring-2 ring-white">Activo</Badge>}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-8 pb-8 flex-1 flex flex-col">
                          <p className="text-[15px] text-neutral-charcoal mb-6 font-medium leading-relaxed italic border-l-4 border-calm-teal/30 pl-4">
                              "{profile.description}"
                          </p>
                          <div className="mt-auto space-y-4">
                            <Button 
                              className={`w-full h-11 rounded-xl text-sm font-bold transition-all ${
                                isActive 
                                  ? "bg-calm-teal hover:bg-calm-teal/90 text-white" 
                                  : "bg-white border-2 border-neutral-charcoal text-neutral-charcoal hover:bg-neutral-charcoal hover:text-white"
                              }`}
                              disabled={isResettingIa}
                            >
                              {isActive ? "Abrir Chat" : "Seleccionar y Resetear"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
               </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "summary" && (() => {
          // --- Summary computed values ---
          const totalSessionMessages = sessions.reduce((acc, s) => {
            const stats = calculateStats(s)
            return acc + stats.patientCount + stats.therapistCount
          }, 0)
          const avgSessionDuration = sessions.length > 0
            ? Math.round(sessions.reduce((acc, s) => acc + calculateStats(s).duration, 0) / sessions.length)
            : 0
          const recentSessions = [...sessions].slice(0, 5).reverse()
          const recentQuestionnaires = [...questionnaireHistory]
            .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
            .slice(0, 4)
          const recentNotes = [...patientNotes].slice(0, 3)
          const lastPatientMessage = [...messages].reverse().find(m => m.is_from_patient)
          const isUnanswered = messages.length > 0 && messages[messages.length - 1].is_from_patient

          const sessionChartData = [...sessions].reverse().map(s => {
            const st = calculateStats(s)
            return {
              date: new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
              paciente: st.patientCount,
              terapeuta: st.therapistCount,
              duración: st.duration,
            }
          })

          // Questionnaire score trend per unique questionnaire
          const questionnaireTypes = Array.from(new Set(questionnaireHistory.map(q => q.questionnaireTitle)))

          return (
            <div className="space-y-6">
              {/* --- KPI Cards --- */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Sessions */}
                <div className="group p-5 rounded-2xl bg-white border border-soft-gray shadow-soft hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-calm-teal/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-calm-teal" />
                    </div>
                    <span className="text-xs font-semibold text-calm-teal uppercase tracking-wider">Sesiones</span>
                  </div>
                  <div>
                    <p className="text-4xl font-bold text-neutral-charcoal">{sessions.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">sesiones realizadas</p>
                  </div>
                </div>
                {/* Questionnaires */}
                <div className="group p-5 rounded-2xl bg-white border border-soft-gray shadow-soft hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-calm-teal/10 flex items-center justify-center">
                      <ClipboardList className="h-5 w-5 text-calm-teal" />
                    </div>
                    <span className="text-xs font-semibold text-calm-teal uppercase tracking-wider">Cuestionarios</span>
                  </div>
                  <div>
                    <p className="text-4xl font-bold text-neutral-charcoal">{questionnaireHistory.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">completados</p>
                  </div>
                </div>
                {/* Notes */}
                <div className="group p-5 rounded-2xl bg-white border border-soft-gray shadow-soft hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-calm-teal/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-calm-teal" />
                    </div>
                    <span className="text-xs font-semibold text-calm-teal uppercase tracking-wider">Notas</span>
                  </div>
                  <div>
                    <p className="text-4xl font-bold text-neutral-charcoal">{patientNotes.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">notas del terapeuta</p>
                  </div>
                </div>
                {/* Avg Duration */}
                <div className="group p-5 rounded-2xl bg-white border border-soft-gray shadow-soft hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-calm-teal/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-calm-teal" />
                    </div>
                    <span className="text-xs font-semibold text-calm-teal uppercase tracking-wider">Duración media</span>
                  </div>
                  <div>
                    <p className="text-4xl font-bold text-neutral-charcoal">{avgSessionDuration}<span className="text-lg text-muted-foreground font-normal"> min</span></p>
                    <p className="text-xs text-muted-foreground mt-1">por sesión</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* --- Left column: chart + assessment --- */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Clinical summary */}
                  <div className="bg-white rounded-2xl border border-soft-gray shadow-soft p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-neutral-charcoal flex items-center gap-2">
                        <FileText className="h-5 w-5 text-calm-teal" />
                        Resumen clínico
                      </h3>
                      <button
                        onClick={() => changeTab("assessment")}
                        className="text-xs text-calm-teal font-medium hover:underline"
                      >
                        Editar en Evaluación →
                      </button>
                    </div>
                    {clinicalSummary ? (
                      <p className="text-sm text-neutral-charcoal leading-relaxed">{clinicalSummary}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Sin resumen clínico registrado.</p>
                    )}
                  </div>

                    {/* Session activity chart */}
                  <div className="bg-white rounded-2xl border border-soft-gray shadow-soft p-6">
                    <h3 className="font-semibold text-neutral-charcoal mb-1 flex items-center gap-2">
                      <BarChart2 className="h-5 w-5 text-calm-teal" />
                      Actividad por sesión
                    </h3>
                    <p className="text-xs text-muted-foreground mb-5">Mensajes del paciente y terapeuta a lo largo del tiempo</p>
                    {sessions.length > 0 ? (
                      <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sessionChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 11 }} dy={8} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: "#FFF", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                            <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }} />
                            <Line type="monotone" dataKey="paciente" name="Paciente" stroke="#F87171" strokeWidth={3} dot={{ r: 4, fill: "#F87171", strokeWidth: 2, stroke: "#FFF" }} activeDot={{ r: 6 }} animationDuration={800} />
                            <Line type="monotone" dataKey="terapeuta" name="Terapeuta" stroke="#0D9488" strokeWidth={3} dot={{ r: 4, fill: "#0D9488", strokeWidth: 2, stroke: "#FFF" }} activeDot={{ r: 6 }} animationDuration={800} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[240px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-soft-gray rounded-xl">
                        <BarChart2 className="h-10 w-10 mb-2 opacity-20" />
                        <p className="text-sm">Sin sesiones registradas</p>
                      </div>
                    )}
                  </div>

                  {/* Assessment Stats */}
                  {assessmentStats.length > 0 && (
                    <div className="bg-white rounded-2xl border border-soft-gray shadow-soft p-6">
                      <h3 className="font-semibold text-neutral-charcoal mb-4 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-calm-teal" />
                        Resultados de evaluación
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {assessmentStats.map(stat => (
                          <div
                            key={stat.id}
                            className={`p-4 rounded-xl border transition-all ${
                              stat.color === "coral"
                                ? "bg-soft-coral/5 border-soft-coral/30"
                                : stat.color === "amber"
                                  ? "bg-amber-50 border-amber-200"
                                  : "bg-calm-teal/5 border-calm-teal/20"
                            }`}
                          >
                            <p className="text-xs text-muted-foreground mb-1 font-medium">{stat.label}</p>
                            <p className="text-2xl font-bold text-neutral-charcoal">{stat.value}</p>
                            <span className={`mt-1 inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              stat.color === "coral"
                                ? "bg-soft-coral/15 text-soft-coral"
                                : stat.color === "amber"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-calm-teal/10 text-calm-teal"
                            }`}>{t(stat.status)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Questionnaires */}
                  {recentQuestionnaires.length > 0 && (
                    <div className="bg-white rounded-2xl border border-soft-gray shadow-soft p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-neutral-charcoal flex items-center gap-2">
                          <ClipboardList className="h-5 w-5 text-calm-teal" />
                          Últimos cuestionarios
                        </h3>
                        <button onClick={() => changeTab("questionnaires")} className="text-xs text-calm-teal font-medium hover:underline">Ver todos →</button>
                      </div>
                      <div className="space-y-3">
                        {recentQuestionnaires.map(item => {
                          const IconComponent = AVAILABLE_ICONS.find(i => i.name === item.icon)?.icon || ClipboardList
                          const numericAnswers = item.answers.filter(a => a.type === 'likert' || a.type === 'scale')
                          const avgScore = numericAnswers.length > 0
                            ? numericAnswers.reduce((acc, a) => acc + Number(a.answer), 0) / numericAnswers.length
                            : null
                          const maxVal = numericAnswers[0]?.maxValue || 5
                          return (
                            <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-soft-gray hover:border-calm-teal/30 transition-colors">
                              <div className="h-10 w-10 rounded-xl bg-calm-teal flex items-center justify-center shrink-0 shadow-sm">
                                <IconComponent className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-sm font-semibold text-neutral-charcoal truncate">{item.questionnaireTitle}</p>
                                  {item.isDelayed && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">+retraso</span>}
                                </div>
                                <p className="text-xs text-muted-foreground">{item.date} · {item.time} · {item.answers.length} preguntas</p>
                                {avgScore !== null && (
                                  <div className="mt-2">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-calm-teal rounded-full transition-all duration-500" style={{ width: `${(avgScore / maxVal) * 100}%` }} />
                                      </div>
                                      <span className="text-xs font-bold text-calm-teal shrink-0">{avgScore.toFixed(1)}/{maxVal}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* --- Right column: clinical summary + notes + last sessions --- */}
                <div className="space-y-6">

                  {/* Pending Messages Card */}
                  <div className="bg-white rounded-2xl border border-soft-gray shadow-soft p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-xl bg-calm-teal/10 flex items-center justify-center shrink-0">
                          <MessageSquareReply className="h-5 w-5 text-calm-teal" />
                        </div>
                        <h3 className="font-semibold text-neutral-charcoal text-[17px]">Mensajes Pendientes</h3>
                      </div>
                      {(patient?.unreadMessages ?? 0) > 0 || isUnanswered ? (
                        <Badge className="bg-calm-teal/10 text-calm-teal border-transparent hover:bg-calm-teal/10 tabular-nums">
                          {isUnanswered ? (patient?.unreadMessages || 1) : patient?.unreadMessages}
                        </Badge>
                      ) : null}
                    </div>
                    
                    {!isUnanswered ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        </div>
                        <p className="text-sm font-medium text-neutral-charcoal">¡Al día!</p>
                        <p className="text-xs text-muted-foreground mt-1">Has respondido a todos los mensajes.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-col gap-3 p-4 rounded-xl bg-calm-teal/5 border border-calm-teal/10">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-calm-teal animate-pulse" />
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Último mensaje del paciente</p>
                          </div>
                          <p className="text-sm text-neutral-charcoal italic line-clamp-3 leading-relaxed">
                            "{lastPatientMessage?.content || "No hay mensajes recientes"}"
                          </p>
                        </div>
                        <Button 
                          onClick={() => changeTab("chat")}
                          className="w-full h-10 rounded-xl bg-calm-teal text-white hover:bg-calm-teal/90 shadow-sm transition-all text-sm font-semibold"
                        >
                          Ir a responder <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Recent sessions */}
                  <div className="bg-white rounded-2xl border border-soft-gray shadow-soft p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-neutral-charcoal flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-calm-teal" />
                        Últimas sesiones
                      </h3>
                      <button onClick={() => changeTab("sessions")} className="text-xs text-calm-teal font-medium hover:underline">Ver todas →</button>
                    </div>
                    {recentSessions.length > 0 ? (
                      <div className="space-y-3">
                        {recentSessions.map(session => {
                          const st = calculateStats(session)
                          const totalMsgs = st.patientCount + st.therapistCount
                          return (
                            <div key={session.id} className="p-3 rounded-xl border border-soft-gray bg-muted/20 hover:border-calm-teal/30 transition-colors">
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <p className="text-sm font-medium text-neutral-charcoal truncate flex-1">{session.description || "Sesión"}</p>
                                <span className="text-[10px] font-bold text-calm-teal bg-calm-teal/10 px-2 py-0.5 rounded-full shrink-0">{st.duration} min</span>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">{new Date(session.date + "Z").toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                              {session.ai_summary && (
                                <p className="text-[11px] text-muted-foreground italic line-clamp-2 leading-relaxed">{session.ai_summary}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MessageSquare className="h-3 w-3 text-soft-coral" />
                                  <span>{st.patientCount}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MessageSquare className="h-3 w-3 text-calm-teal" />
                                  <span>{st.therapistCount}</span>
                                </div>
                                <div className="ml-auto flex-1 h-1 bg-muted rounded-full overflow-hidden flex">
                                  {totalMsgs > 0 ? (
                                    <>
                                      <div className="h-full bg-soft-coral" style={{ width: `${(st.patientCount / totalMsgs) * 100}%` }} />
                                      <div className="h-full bg-calm-teal" style={{ width: `${(st.therapistCount / totalMsgs) * 100}%` }} />
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="py-8 flex flex-col items-center text-muted-foreground">
                        <Calendar className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm">Sin sesiones aún</p>
                      </div>
                    )}
                  </div>

                  {/* Recent Notes */}
                  {recentNotes.length > 0 && (
                    <div className="bg-white rounded-2xl border border-soft-gray shadow-soft p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-neutral-charcoal flex items-center gap-2">
                          <FileText className="h-5 w-5 text-calm-teal" />
                          Notas recientes
                        </h3>
                        <button onClick={() => changeTab("notes")} className="text-xs text-calm-teal font-medium hover:underline">Ver todas →</button>
                      </div>
                      <div className="space-y-3">
                        {recentNotes.map(note => (
                          <div key={note.id} className={`p-3 rounded-xl border border-soft-gray ${note.color} hover:shadow-sm transition-all`}>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-semibold text-neutral-charcoal">{note.title}</p>
                              <span className="text-[10px] text-muted-foreground">{note.date}</span>
                            </div>
                            <div
                              className="text-xs text-neutral-charcoal/70 line-clamp-2 leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: note.content }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {activeTab === "assessment" && (
          <Card className="rounded-2xl border-soft-gray shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-neutral-charcoal">{t("assessmentResults")}</CardTitle>
              <Button onClick={() => handleOpenStatDialog()} size="sm" className="rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                {t("addResult")}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                {assessmentStats.map((stat) => (
                  <div key={stat.id} className="group relative p-4 rounded-xl bg-muted/30 border border-soft-gray hover:border-calm-teal/50 transition-colors">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleOpenStatDialog(stat)}
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-soft-coral hover:text-soft-coral"
                        onClick={() => handleDeleteStat(stat.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                    <p className="text-2xl font-semibold text-neutral-charcoal mb-1">{stat.value}</p>
                    <Badge
                      className={`${stat.color === "coral"
                        ? "bg-soft-coral/10 text-soft-coral"
                        : stat.color === "amber"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-calm-teal/10 text-calm-teal"
                        } border-0 capitalize`}
                    >
                      {t(stat.status)}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-6 rounded-xl bg-muted/30 border border-soft-gray">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-neutral-charcoal flex items-center gap-2">
                    <FileText className="h-5 w-5 text-soft-lavender" />
                    {t("clinicalSummary")}
                  </h3>
                  {!isEditingSummary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartEditSummary}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-neutral-charcoal"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {isEditingSummary ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editedSummary}
                      onChange={(e) => setEditedSummary(e.target.value)}
                      className="min-h-[100px] rounded-xl border-soft-gray bg-white"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEditSummary}
                        className="rounded-lg"
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t("cancel")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveSummary}
                        className="rounded-lg bg-calm-teal hover:bg-calm-teal/90 text-white"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {t("save")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-charcoal leading-relaxed">
                    {clinicalSummary}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* --- Dialog for Add/Edit Stat --- */}
        {isStatDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md rounded-2xl border-soft-gray shadow-soft bg-white p-6">
              <h2 className="text-lg font-semibold mb-4">
                {editingStat ? t("editResult") : t("addResult")}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("scaleName")}</label>
                  <input
                    className="w-full rounded-xl border border-soft-gray px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-calm-teal/20"
                    placeholder="e.g. PHQ-9"
                    value={statFormData.label}
                    onChange={(e) => setStatFormData({ ...statFormData, label: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("scoreResult")}</label>
                  <input
                    className="w-full rounded-xl border border-soft-gray px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-calm-teal/20"
                    placeholder="e.g. 12/27"
                    value={statFormData.value}
                    onChange={(e) => setStatFormData({ ...statFormData, value: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("status")}</label>
                  <select
                    className="w-full rounded-xl border border-soft-gray px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-calm-teal/20"
                    value={statFormData.status}
                    onChange={(e) => setStatFormData({ ...statFormData, status: e.target.value as any })}
                  >
                    <option value="mild">{t("mild")}</option>
                    <option value="moderate">{t("moderate")}</option>
                    <option value="high">{t("high")}</option>
                    <option value="severe">{t("severe")}</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="ghost" onClick={() => setIsStatDialogOpen(false)} className="rounded-xl">
                  {t("cancel")}
                </Button>
                <Button onClick={handleSaveStat} className="rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white">
                  {t("save")}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="space-y-6">
            {/* AI Clinical Log (Bitácora) */}
            {/* AI Clinical Log (Bitácora) removed and integrated below */}

            <Card className="rounded-2xl border-soft-gray shadow-soft">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle className="text-neutral-charcoal">{t("sessionHistory")}</CardTitle>
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar sesiones..."
                      value={sessionSearchTerm}
                      onChange={(e) => setSessionSearchTerm(e.target.value)}
                      className="pl-9 h-9 w-[200px] lg:w-[300px] rounded-xl border-soft-gray focus-visible:ring-calm-teal/20"
                    />
                    {sessionSearchTerm && (
                      <button 
                        onClick={() => setSessionSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-neutral-charcoal"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <Button
                    onClick={() => setShowGeneralStats(!showGeneralStats)}
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-soft-gray text-calm-teal hover:text-calm-teal/80 hover:bg-calm-teal/5"
                  >
                    <BarChart2 className="h-4 w-4 mr-2" />
                    {showGeneralStats ? t("hideGeneralStats") : t("viewGeneralStats")}
                  </Button>
                </div>
                <Badge className="bg-calm-teal/10 text-calm-teal hover:bg-calm-teal/20 border-0">
                  {totalSessions} {t("totalSessions")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {showGeneralStats && (
                <div className="mb-8 p-6 rounded-2xl border border-soft-gray bg-muted/10">
                  <h3 className="text-sm font-semibold text-neutral-charcoal mb-6 flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-calm-teal" />
                    {t("statisticsOverTime")}
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                    {metrics.map((metric) => {
                      const Icon = metric.icon
                      const isActive = activeMetric === metric.id
                      return (
                        <button
                          key={metric.id}
                          onClick={() => setActiveMetric(metric.id)}
                          className={`p-4 rounded-xl border transition-all flex flex-col items-center text-center gap-2 ${isActive
                            ? "border-calm-teal bg-calm-teal/5 shadow-sm"
                            : "border-soft-gray bg-white hover:border-calm-teal/30"
                            }`}
                        >
                          <div className={`p-2 rounded-lg ${isActive ? "bg-calm-teal text-white" : "bg-muted text-muted-foreground"}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className={`text-xs font-medium ${isActive ? "text-calm-teal" : "text-muted-foreground"}`}>
                            {t(metric.label)}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[...sessions].reverse().map(s => {
                          const stats = calculateStats(s)
                          return {
                            date: new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                            messages: stats.patientCount,
                            therapistMessages: stats.therapistCount,
                            responseTime: stats.avgResponseSeconds,
                            duration: stats.duration,
                            totalMessages: stats.patientCount + stats.therapistCount
                          }
                        })}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6B7280", fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6B7280", fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#FFF",
                            borderRadius: "12px",
                            border: "1px solid #E5E7EB",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey={metrics.find(m => m.id === activeMetric)?.dataKey}
                          name={t(metrics.find(m => m.id === activeMetric)?.label || "")}
                          stroke={metrics.find(m => m.id === activeMetric)?.color}
                          strokeWidth={4}
                          dot={{ r: 6, fill: metrics.find(m => m.id === activeMetric)?.color, strokeWidth: 2, stroke: "#FFF" }}
                          activeDot={{ r: 8, strokeWidth: 0 }}
                          animationDuration={1000}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <div className="space-y-4">
                {filteredSessions.length > 0 ? (
                  filteredSessions.map(({ session, matchReason }) => (
                  <div
                    key={session.id}
                    onClick={() => setViewingSessionId(session.id)}
                    className="group relative flex flex-col gap-4 p-6 rounded-2xl bg-white border border-soft-gray hover:border-calm-teal/30 hover:shadow-xl hover:shadow-calm-teal/5 transition-all duration-300 cursor-pointer active:scale-[0.995]"
                  >
                    {/* Header: Icon, Title, Actions */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-calm-teal/10 to-calm-teal/20 flex items-center justify-center border border-calm-teal/20 group-hover:scale-110 transition-transform duration-500">
                          <Calendar className="h-6 w-6 text-calm-teal" />
                        </div>
                        <div>
                          <h4 className="font-bold text-neutral-charcoal text-lg group-hover:text-calm-teal transition-colors">
                            {session.description}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-soft-gray/50">
                              {new Date(session.date + "Z").toLocaleDateString("es-ES", { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-xs text-muted-foreground/60">•</span>
                            <span className="text-xs font-medium text-muted-foreground">
                              {new Date(session.date + "Z").toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {matchReason && (
                              <>
                                <span className="text-xs text-muted-foreground/60">•</span>
                                <Badge variant="secondary" className="bg-calm-teal/10 text-calm-teal border-calm-teal/20 text-[10px] font-bold py-0 h-5 px-2">
                                  {matchReason}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleOpenEditSessionDetailsDialog(session); }}
                          className="h-9 w-9 p-0 text-muted-foreground hover:text-calm-teal hover:bg-calm-teal/5 rounded-xl border border-transparent hover:border-calm-teal/10"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                          className="h-9 w-9 p-0 text-soft-coral hover:text-soft-coral/80 hover:bg-soft-coral/5 rounded-xl border border-transparent hover:border-soft-coral/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* AI Clinical Summary (if exists) */}
                    {bitacoraEntries[session.id] ? (
                      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-calm-teal/[0.03] to-calm-teal/[0.08] border border-calm-teal/10 p-5 group/bitacora hover:border-calm-teal/20 transition-colors">
                        <div className="absolute top-0 right-0 h-24 w-24 bg-calm-teal/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                        
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="h-4 w-4 text-calm-teal" />
                          <span className="text-[11px] font-bold uppercase tracking-widest text-calm-teal/70">Resumen breve</span>
                          
                          {/* Bitacora Actions (Edit/Regen) */}
                          <div className="ml-auto flex gap-1.5 opacity-0 group-hover/bitacora:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                const entries = patient?.clinical_log?.split('### ').filter(Boolean) || [];
                                const idx = entries.findIndex(e => e.includes(`SID:${session.id}`));
                                if (idx !== -1) handleEditBitacora(idx, bitacoraEntries[session.id]);
                              }}
                              className="p-1.5 rounded-lg hover:bg-calm-teal/10 text-calm-teal transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                const entries = patient?.clinical_log?.split('### ').filter(Boolean) || [];
                                const idx = entries.findIndex(e => e.includes(`SID:${session.id}`));
                                if (idx !== -1) handleRegenerateBitacora(idx, `SID:${session.id}`);
                              }}
                              disabled={isRegeneratingIndex !== null}
                              className="p-1.5 rounded-lg hover:bg-calm-teal/10 text-calm-teal transition-colors disabled:opacity-50"
                              title="Regenerar"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${isRegeneratingIndex !== null && patient?.clinical_log?.split('### ').filter(Boolean).findIndex(e => e.includes(`SID:${session.id}`)) === isRegeneratingIndex ? 'animate-spin' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {editingBitacoraIndex !== null && patient?.clinical_log?.split('### ').filter(Boolean).findIndex(e => e.includes(`SID:${session.id}`)) === editingBitacoraIndex ? (
                           <div className="space-y-3 pt-1">
                              <Textarea
                                value={editingBitacoraContent}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setEditingBitacoraContent(e.target.value)}
                                className="min-h-[100px] text-sm border-calm-teal/20 focus-visible:ring-calm-teal/10 rounded-xl bg-white shadow-inner"
                              />
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingBitacoraIndex(null); }} className="h-8 rounded-lg">
                                  Cancelar
                                </Button>
                                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleSaveBitacora(editingBitacoraIndex!); }} className="h-8 bg-calm-teal text-white rounded-lg px-4">
                                  Guardar Cambios
                                </Button>
                              </div>
                            </div>
                        ) : (
                          <p className="text-[14px] text-neutral-charcoal/80 leading-relaxed font-medium italic relative z-10">
                            "{bitacoraEntries[session.id]}"
                          </p>
                        )}
                      </div>
                    ) : (Date.now() - new Date(session.date + "Z").getTime()) < 180000 || regeneratingSessionIds.has(session.id) ? (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-calm-teal/[0.02] border border-dashed border-calm-teal/20">
                        <Loader2 className="h-4 w-4 animate-spin text-calm-teal" />
                        <p className="text-xs text-calm-teal font-semibold tracking-wide uppercase">Generando resumen de la sesión...</p>
                      </div>
                    ) : null}

                    {/* Footer: Quick Stats & Primary Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-soft-gray/50">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground/70">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">{calculateStats(session).patientCount + calculateStats(session).therapistCount} mensajes</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground/70">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">{Math.floor(calculateStats(session).duration / 60)} min</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={(e) => { e.stopPropagation(); setViewingSessionId(session.id); }}
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-calm-teal/20 text-calm-teal hover:bg-calm-teal/5 font-bold text-xs px-4 h-9 shadow-sm"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Transcripción
                        </Button>
                        <Button
                          onClick={(e) => { e.stopPropagation(); setStatsSessionId(session.id); }}
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-calm-teal/20 text-calm-teal hover:bg-calm-teal/5 font-bold text-xs px-4 h-9 shadow-sm"
                        >
                          <BarChart2 className="h-4 w-4 mr-2" />
                          Estadísticas
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
                ) : (
                  <div className="py-12 flex flex-col items-center text-center px-6 text-muted-foreground border-2 border-dashed border-soft-gray rounded-2xl bg-muted/5">
                    <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                      <Search className="h-6 w-6 opacity-30" />
                    </div>
                    <p className="text-sm font-medium text-neutral-charcoal mb-1">No se encontraron sesiones</p>
                    <p className="text-xs max-w-[250px]">Intenta con otros términos de búsqueda.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* --- Statistics Modal --- */}
        {statsSessionId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-lg rounded-2xl border-soft-gray shadow-soft bg-white">
              <CardHeader className="flex flex-row items-center justify-between border-b border-soft-gray pb-4">
                <CardTitle className="text-xl text-neutral-charcoal flex items-center gap-2">
                  <BarChart2 className="h-6 w-6 text-calm-teal" />
                  {t("sessionStatistics")}
                </CardTitle>
                <Button variant="ghost" onClick={() => setStatsSessionId(null)} className="rounded-full h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {(() => {
                  const session = sessions.find(s => s.id === statsSessionId)
                  if (!session) return null
                  const stats = calculateStats(session)

                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-soft-peach/20 border border-soft-peach/50 flex flex-col items-center justify-center text-center">
                          <p className="text-3xl font-bold text-neutral-charcoal mb-1">{stats.patientCount}</p>
                          <p className="text-sm text-muted-foreground">{t("patientMessages")}</p>
                          <p className="text-xs text-muted-foreground mt-1">({stats.patientWords} {t("words")})</p>
                        </div>
                        <div className="p-4 rounded-xl bg-calm-teal/10 border border-calm-teal/30 flex flex-col items-center justify-center text-center">
                          <p className="text-3xl font-bold text-neutral-charcoal mb-1">{stats.therapistCount}</p>
                          <p className="text-sm text-muted-foreground">{t("therapistMessages")}</p>
                          <p className="text-xs text-muted-foreground mt-1">({stats.therapistWords} {t("words")})</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-soft-gray">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <BarChart2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="font-medium text-neutral-charcoal">{t("avgResponseTime")}</span>
                          </div>
                          <span className="text-xl font-semibold text-neutral-charcoal">{stats.avgResponseSeconds} {t("seconds")}</span>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-soft-gray">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-soft-lavender/20 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-soft-lavender" />
                            </div>
                            <span className="font-medium text-neutral-charcoal">{t("totalWords")}</span>
                          </div>
                          <span className="text-xl font-semibold text-neutral-charcoal">{stats.patientCount + stats.therapistCount}</span>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-soft-gray">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                              <Calendar className="h-5 w-5 text-amber-600" />
                            </div>
                            <span className="font-medium text-neutral-charcoal">{t("sessionDuration")}</span>
                          </div>
                          <span className="text-xl font-semibold text-neutral-charcoal">
                            {Math.floor(stats.duration / 60) > 0
                              ? `${Math.floor(stats.duration / 60)} ${t("hours")} ${stats.duration % 60} ${t("minutes")} `
                              : `${stats.duration} ${t("minutes")} `
                            }
                          </span>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </CardContent>
            </Card>
          </div>
        )}
        {/* Chat actual */}
        {viewingSessionId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-6xl h-[85vh] rounded-2xl border-soft-gray shadow-soft flex flex-col">
              <CardHeader className="border-b border-soft-gray bg-white z-10 shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-neutral-charcoal">
                    {t("sessionChat")} - {chatDescription || "Sin descripción"} ({(() => {
                      const session = sessions.find((s) => s.id === viewingSessionId);
                      return session?.date ? new Date(session.date).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      }) : "";
                    })()})
                  </CardTitle>
                  <Button variant="ghost" onClick={() => setViewingSessionId(null)} className="rounded-xl">
                    {t("close")}
                  </Button>
                </div>
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder={t("searchMessages")}
                    className="w-full px-4 py-2 rounded-xl border border-soft-gray focus:outline-none focus:ring-2 focus:ring-calm-teal/20"
                    onChange={(e) => {
                      const searchTerm = e.target.value.toLowerCase()
                      // Simple highlight logic
                      if (searchTerm) {
                        const elements = document.querySelectorAll(".session-message-text")
                        elements.forEach((el) => {
                          const text = el.textContent || ""
                          if (text.toLowerCase().includes(searchTerm)) {
                            el.classList.add("bg-amber-200/50")
                          } else {
                            el.classList.remove("bg-amber-200/50")
                          }
                        })
                      } else {
                        document.querySelectorAll(".session-message-text").forEach((el) => {
                          el.classList.remove("bg-amber-200/50")
                        })
                      }
                    }}
                  />
                </div>
              </CardHeader>
              <div className="flex flex-1 min-h-0">
                {/* Chat transcript with fixed size and scroll */}
                <CardContent className="flex-1 pt-6 overflow-y-auto">
                  <div className="space-y-4 pr-2">
                    {sessions
                      .find((s) => s.id === viewingSessionId)
                      ?.chatHistory.map((message, index) => (
                        <div
                          key={message.id || index}
                          className={`flex gap-4 p-4 rounded-xl w-full ${message.sender === "patient" ? "justify-start" : "justify-end"}`}
                        >
                          {message.sender === "patient" && (
                            <Avatar className="h-14 w-14 bg-white shrink-0 shadow-sm border border-soft-gray/50">
                              <AvatarFallback className="text-2xl text-neutral-charcoal">👤</AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`flex flex-col min-w-0 max-w-[85%] ${message.sender === "patient" ? "items-start" : "items-end"}`}>
                            <div className="flex items-center gap-2 mb-1.5 px-1 opacity-80">
                              <span className="text-xs font-semibold text-neutral-charcoal">
                                {message.sender === "patient" ? `Paciente #${patient?.patientCode || patientId}` : t("therapist")}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {new Date(message.timestamp + "Z").toLocaleTimeString("es-ES", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            <div
                              className={`px-4 py-3 rounded-2xl shadow-sm text-[15px] max-w-full overflow-hidden ${message.sender === "patient"
                                ? "bg-white border border-soft-gray text-neutral-charcoal rounded-tl-sm ring-1 ring-gray-900/5"
                                : "bg-calm-teal text-white rounded-tr-sm ring-1 ring-calm-teal/5"
                                }`}
                            >
                              <p className="leading-relaxed whitespace-pre-wrap break-words session-message-text transition-colors">
                                {message.text}
                              </p>
                            </div>
                          </div>
                          {message.sender === "therapist" && (
                            <Avatar className="h-14 w-14 bg-calm-teal/10 shrink-0 shadow-sm border border-calm-teal/20">
                              <AvatarFallback className="text-2xl text-calm-teal">👨‍⚕️</AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
                {/* Session notes panel next to chat */}
                <div className="w-80 border-l border-soft-gray bg-muted/20 overflow-y-auto">
                  <div className="p-6 min-h-full flex flex-col space-y-6">
                    <div className="shrink-0">
                      <label className="text-xs font-bold text-calm-teal uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Edit className="h-3 w-3" />
                        {t("sessionDescription") || "Descripción de la sesión"}
                      </label>
                      <Input
                        value={chatDescription}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setChatDescription(e.target.value)
                          setIsDetailsDirty(true)
                        }}
                        placeholder={t("enterDescription") || "Añadir descripción..."}
                        className="rounded-xl border-gray-200 hover:border-gray-300 focus:border-calm-teal focus:ring-2 focus:ring-calm-teal/20 bg-gray-50 transition-all font-medium text-neutral-charcoal h-11 shadow-sm focus:bg-white px-4 placeholder:text-gray-400 placeholder:font-normal"
                      />
                    </div>

                    <div className="flex flex-col min-h-0">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-calm-teal uppercase tracking-widest flex items-center gap-1">
                          <Brain className="h-3 w-3" />
                          {t("aiSummary") || "Resumen IA (Editable)"}
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewingSessionId && handleRegenerateSummary(viewingSessionId)}
                          disabled={isRegeneratingSummary || (viewingSessionId ? regeneratingSessionIds.has(viewingSessionId) : false)}
                          className="h-6 w-6 p-0 hover:bg-calm-teal/10 text-calm-teal"
                          title={t("regenerate") || "Regenerar resumen"}
                        >
                          <RefreshCw className={`h-3 w-3 ${isRegeneratingSummary || (viewingSessionId ? regeneratingSessionIds.has(viewingSessionId) : false) ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                      {!chatAiSummary && ((Date.now() - new Date((sessions.find(s => s.id === viewingSessionId)?.date || "") + "Z").getTime() < 180000) || (viewingSessionId ? regeneratingSessionIds.has(viewingSessionId) : false)) ? (
                        <div className="w-full rounded-xl border-gray-200 bg-muted/30 p-4 text-sm text-muted-foreground italic flex flex-col items-center justify-center gap-3 min-h-[100px] text-center border-dashed">
                          <Loader2 className="h-6 w-6 animate-spin text-calm-teal" />
                          <div>
                            <p className="font-semibold text-calm-teal">{t("generatingAiSummary") || "Generando resumen..."}</p>
                            <p className="text-[10px] mt-1">Esto puede tardar unos segundos</p>
                          </div>
                        </div>
                      ) : (
                        <Textarea
                          ref={chatAiSummaryRef}
                          value={chatAiSummary}
                          onChange={(e) => {
                            setChatAiSummary(e.target.value)
                            setIsDetailsDirty(true)
                          }}
                          className="w-full rounded-xl border-gray-200 bg-calm-teal/5 p-4 text-sm text-neutral-charcoal leading-relaxed shadow-sm resize-none overflow-hidden focus:bg-white transition-all whitespace-pre-wrap"
                          placeholder={t("aiSummaryPlaceholder") || "Resumen de la sesión..."}
                        />
                      )}
                    </div>

                    <div className="flex flex-col min-h-0">
                      <label className="text-xs font-bold text-calm-teal uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Edit className="h-3 w-3" />
                        {t("sessionNotes") || "Notas de la sesión"}
                      </label>
                      <Textarea
                        ref={chatNotesRef}
                        value={chatNotes}
                        onChange={(e) => {
                          setChatNotes(e.target.value)
                          setIsDetailsDirty(true)
                        }}
                        className="w-full rounded-xl border-gray-200 hover:border-gray-300 focus:border-calm-teal focus:ring-2 focus:ring-calm-teal/20 bg-gray-50 transition-all font-medium text-neutral-charcoal shadow-sm focus:bg-white px-4 py-3 placeholder:text-gray-400 placeholder:font-normal text-sm resize-none overflow-hidden"
                        placeholder={t("addSessionNotes") || "Añadir notas de la sesión..."}
                      />
                    </div>

                      <div className="mt-auto pt-4">
                        {(() => {
                          const session = sessions.find(s => s.id === viewingSessionId)
                          const hasChanges = session && (
                            chatNotes !== (session.notes || "") ||
                            chatDescription !== (session.description || "") ||
                            chatAiSummary !== (session.ai_summary || "")
                          )

                          return (
                            <Button
                              onClick={handleSaveSessionDetails}
                              disabled={isSavingChatNotes || !hasChanges}
                              className={`w-full shadow-sm h-11 rounded-xl transition-all duration-300 ${
                                !hasChanges && !isSavingChatNotes 
                                ? "bg-calm-teal/20 text-calm-teal border border-calm-teal/30 hover:bg-calm-teal/30" 
                                : "bg-calm-teal hover:bg-calm-teal/90 text-white"
                              }`}
                            >
                              {isSavingChatNotes ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  {t("saving") || "Guardando..."}
                                </>
                              ) : !hasChanges ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  {t("saved") || "Guardado"}
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
                                  {t("saveNotes") || "Guardar Cambios"}
                                </>
                              )}
                            </Button>
                          )
                        })()}
                      </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "chat" && <ChatTranscript key={chatKey} patientId={patientId} caseNumber={patient?.patientCode || patientId} onSaveAndClose={handleSaveAndCloseChat} isOnline={isPatientOnline} initialAiInstructions={patient?.ai_instructions} isIaPatient={patient?.is_ia_patient || false} iaPatientPrompt={patient?.ia_patient_prompt || ""} draftNotes={draftSessionNotes} onNotesChange={updateDraftNotes} draftDescription={draftSessionDescription} onDescriptionChange={updateDraftDesc} />}

        {/* Notes*/}
        {activeTab === "notes" && (
          <Card className="rounded-2xl border-soft-gray shadow-soft">
            <CardHeader>
              <CardTitle className="text-neutral-charcoal">{t("patientNotes")}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t("patientNotesDescription")}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-charcoal">{t("addNewNote")}</label>
                  <div className={`rounded-xl border border-soft-gray overflow-hidden transition-colors ${newNoteColor}`}>
                    <div className="p-3 border-b border-soft-gray flex gap-2 items-center bg-white/50">
                      <input
                        placeholder={t("noteTitle")}
                        value={newNoteTitle}
                        onChange={(e) => updateNewNoteTitle(e.target.value)}
                        className="flex-1 bg-transparent border-none focus:outline-none text-sm font-medium"
                      />
                      <div className="flex items-center gap-1 border-l border-soft-gray pl-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => execCommand("bold")}
                          className="h-7 w-7 p-0"
                          title="Bold"
                        >
                          <Bold className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => execCommand("italic")}
                          className="h-7 w-7 p-0"
                          title="Italic"
                        >
                          <Italic className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div
                      id="note-editor"
                      ref={contentEditableRef}
                      contentEditable
                      suppressContentEditableWarning={true}
                      className="min-h-[120px] p-3 focus:outline-none text-sm leading-relaxed"
                      onInput={(e) => updateNewNoteContent(e.currentTarget.innerHTML)}
                      style={{ minHeight: "120px" }}
                      dangerouslySetInnerHTML={{ __html: newNoteContent }}
                    />

                    <div className="p-2 border-t border-soft-gray bg-white/50 flex gap-1">
                      {NOTE_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setNewNoteColor(color.value)}
                          className={`w-6 h-6 rounded-full border border-black/10 transition-transform hover:scale-110 ${color.value} ${newNoteColor === color.value ? "ring-2 ring-calm-teal ring-offset-1" : ""
                            }`}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleAddNote}
                  disabled={!newNoteContent.trim()}
                  className="flex-1 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md"
                >
                  {editingNoteId && <Save className="h-4 w-4 mr-2" />}
                  {!editingNoteId && <Plus className="h-4 w-4 mr-2" />}
                  {editingNoteId ? t("updateNote") : t("addNote")}
                </Button>
                {editingNoteId && (
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    className="rounded-xl border-soft-gray"
                  >
                    {t("cancelEdit")}
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-neutral-charcoal">{t("previousNotes")}</h3>
                {patientNotes.map((note) => (
                  <div key={note.id} className={`p-4 rounded-xl border border-soft-gray ${note.color}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-neutral-charcoal">{note.title}</h4>
                        <p className="text-xs text-muted-foreground">{note.date}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditNote(note)}
                          className="h-8 w-8 p-0 text-calm-teal hover:text-calm-teal/80 hover:bg-calm-teal/10 rounded-lg"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNote(note.id)}
                          className="h-8 w-8 p-0 text-soft-coral hover:text-soft-coral/80 hover:bg-soft-coral/10 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div
                      className="text-sm text-neutral-charcoal leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: note.content }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "questionnaires" && (
          <Card className="rounded-2xl border-soft-gray shadow-soft">
            <CardHeader>
              <div className="flex items-center gap-3 justify-between w-full">
                <div className="flex items-center gap-4">
                  <CardTitle className="text-neutral-charcoal">{t("questionnaires")}</CardTitle>
                  <Button
                    onClick={handleDownloadCSV}
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-soft-gray text-calm-teal hover:text-calm-teal/80 hover:bg-calm-teal/5"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar CSV
                  </Button>
                </div>
                <div className="w-[200px]">
                  <Select value={questionnaireFilter} onValueChange={setQuestionnaireFilter}>
                    <SelectTrigger className="h-9 rounded-xl border-soft-gray bg-white">
                      <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los cuestionarios</SelectItem>
                      {uniqueQuestionnaires.map((title) => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {questionnaireFilter !== "all" && availableGraphQuestions.length > 0 && (
                <div className="mb-8 p-6 rounded-2xl border border-soft-gray bg-muted/10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h3 className="text-sm font-semibold text-neutral-charcoal flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-calm-teal" />
                      Evolución de puntuaciones
                    </h3>
                    <div className="flex flex-col md:flex-row gap-2">
                      <div className="w-full md:w-[200px]">
                        <Select value={graphDateFilter} onValueChange={(v) => setGraphDateFilter(v as "all" | "week" | "month")}>
                          <SelectTrigger className="h-9 rounded-xl border-soft-gray bg-white">
                            <SelectValue placeholder="Período" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todo el tiempo</SelectItem>
                            <SelectItem value="week">Última semana</SelectItem>
                            <SelectItem value="month">Último mes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-full md:w-[250px]">
                        <Select value={selectedGraphQuestion || ""} onValueChange={setSelectedGraphQuestion}>
                          <SelectTrigger className="h-9 rounded-xl border-soft-gray bg-white">
                            <SelectValue placeholder="Selecciona una pregunta" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableGraphQuestions.map((q) => (
                              <SelectItem key={q.text} value={q.text}>
                                Pregunta {q.number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {selectedGraphQuestion ? (
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={graphData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis
                            dataKey="dateTime"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#6B7280", fontSize: 10 }}
                            dy={10}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#6B7280", fontSize: 11 }}
                            domain={[0, 'auto']}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#FFF",
                              borderRadius: "12px",
                              border: "1px solid #E5E7EB",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="score"
                            name="Puntuación"
                            stroke="#0D9488"
                            strokeWidth={3}
                            dot={{ r: 4, fill: "#0D9488", strokeWidth: 2, stroke: "#FFF" }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            animationDuration={1000}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-soft-gray rounded-xl">
                      <BarChart2 className="h-10 w-10 mb-2 opacity-20" />
                      <p className="text-sm font-medium">Selecciona una pregunta para ver la gráfica</p>
                    </div>
                  )}
                </div>
              )}
              {questionnaireHistory.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-2">{t("noQuestionnairesHistory")}</p>
                  <p className="text-sm">Los cuestionarios completados se mostrarán aquí</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    // Group by week
                    const filtered = questionnaireHistory
                      .filter(item => questionnaireFilter === "all" || item.questionnaireTitle === questionnaireFilter)
                      .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())

                    const grouped: Record<string, AnsweredQuestionnaire[]> = {}

                    filtered.forEach(item => {
                      const date = new Date(item.rawDate)
                      // Get Monday of the week
                      const day = date.getDay()
                      const diff = date.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
                      const monday = new Date(date.setDate(diff))
                      monday.setHours(0, 0, 0, 0)

                      const key = monday.toISOString()
                      if (!grouped[key]) grouped[key] = []
                      grouped[key].push(item)
                    })

                    // Sort weeks (newest first)
                    const sortedWeeks = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

                    return sortedWeeks.map(weekKey => {
                      const weekDate = new Date(weekKey)
                      const weekLabel = `Semana del ${weekDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`

                      return (
                        <div key={weekKey} className="relative">
                          <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm py-2 px-3 rounded-lg border border-gray-100 mb-4 inline-block shadow-sm">
                            <h4 className="text-sm font-semibold text-neutral-charcoal capitalize flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-calm-teal" />
                              {weekLabel}
                            </h4>
                          </div>

                          <div className="space-y-4 pl-2 border-l-2 border-soft-gray/30 ml-3">
                            {grouped[weekKey].map((item, index) => (
                              <div key={item.id} className="group relative pl-6">


                                <div
                                  className="relative p-5 rounded-2xl border border-soft-gray bg-white bg-gradient-to-br from-white to-calm-teal/5 hover:shadow-lg transition-all duration-300 hover:border-calm-teal/50 cursor-pointer"
                                  onClick={() => toggleQuestionnaireDetails(item.id)}
                                >
                                  <div className="flex items-start gap-4">
                                    {/* Date badge */}
                                    <div className="shrink-0">
                                      {(() => {
                                        const IconComponent = AVAILABLE_ICONS.find(i => i.name === item.icon)?.icon || Calendar
                                        return (
                                          <div className="h-12 w-12 rounded-xl bg-calm-teal flex items-center justify-center shadow-md">
                                            <IconComponent className="h-5 w-5 text-white" />
                                          </div>
                                        )
                                      })()}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex-1">
                                          <h3 className="font-bold text-lg text-neutral-charcoal mb-1 group-hover:text-calm-teal transition-colors">
                                            {item.questionnaireTitle}
                                          </h3>
                                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                              <Calendar className="h-3.5 w-3.5 text-calm-teal" />
                                              <span className="font-medium">{item.date}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                              <Clock className="h-3.5 w-3.5 text-calm-teal" />
                                              <span className="font-medium">{item.time}</span>
                                            </div>
                                            <span className="bg-gray-50 px-2 py-1 rounded-md border border-gray-100 font-medium">{item.answers.length} {item.answers.length === 1 ? t("question") : t("questions")}</span>
                                            {item.isDelayed && (
                                              <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 text-amber-700">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span className="font-medium text-xs">Con retraso {item.delayTime ? `(${item.delayTime})` : ''}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="shrink-0 flex items-center pr-2">
                                          {expandedQuestionnaireId === item.id ? (
                                            <ChevronUp className="h-5 w-5 text-calm-teal" />
                                          ) : (
                                            <ChevronDown className="h-5 w-5 text-muted-foreground/30" />
                                          )}
                                        </div>
                                      </div>

                                      {/* Expanded details */}
                                      {expandedQuestionnaireId === item.id && (
                                        <div className="mt-4 pt-4 border-t border-soft-gray/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                          <div className="grid gap-3">
                                            {item.answers.map((ans, idx) => (
                                              <div
                                                key={idx}
                                                className="bg-white/60 border border-soft-gray/50 p-5 rounded-xl hover:border-calm-teal/50 transition-colors shadow-sm"
                                              >
                                                <p className="text-sm font-medium text-neutral-charcoal mb-4 leading-relaxed">
                                                  <span className="text-calm-teal font-bold mr-2">{idx + 1}.</span>
                                                  {ans.questionText}
                                                </p>

                                                {/* Render based on Type */}
                                                {(ans.type === 'likert' || ans.type === 'scale') ? (
                                                  <div className="space-y-4">
                                                    <div className="text-center py-2">
                                                      <div className="inline-flex items-baseline gap-1.5">
                                                        <span className="text-4xl font-bold text-calm-teal">
                                                          {ans.answer}
                                                        </span>
                                                        <span className="text-lg text-muted-foreground font-medium">/ {ans.maxValue || 5}</span>
                                                      </div>
                                                    </div>
                                                    {/* Slider-like Visualization */}
                                                    <div className="relative w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                                                      <div
                                                        className="absolute top-0 left-0 h-full bg-calm-teal rounded-full transition-all duration-500"
                                                        style={{ width: `${(Number(ans.answer) / (ans.maxValue || 5)) * 100}%` }}
                                                      />
                                                    </div>
                                                    <div className="flex justify-between text-xs font-medium px-1 mt-1">
                                                      <span className="text-calm-teal">{ans.minLabel || "Mínimo"} ({ans.minValue || 1})</span>
                                                      <span className="text-calm-teal">{ans.maxLabel || "Máximo"} ({ans.maxValue || 5})</span>
                                                    </div>
                                                  </div>
                                                ) : ans.type === 'frequency' ? (
                                                  <div className="flex flex-wrap gap-2 mt-2">
                                                    {(ans.options && ans.options.length > 0
                                                      ? ans.options
                                                      : ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"]
                                                    ).map((opt, i) => (
                                                      <span
                                                        key={i}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${(ans.answer === opt || ans.answer === i) // Simple check, might need refinement based on exact stored value
                                                          ? "bg-calm-teal text-white border-calm-teal shadow-md"
                                                          : "bg-white text-muted-foreground border-soft-gray/50"
                                                          }`}
                                                      >
                                                        {opt}
                                                      </span>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <div className="bg-white p-3 rounded-lg border border-soft-gray/50 text-neutral-charcoal/80 text-sm">
                                                    {ans.answer}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      {/* --- Dialog for Edit Session Details --- */}
      {isEditSessionDetailsDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md rounded-2xl border-soft-gray shadow-soft bg-white p-6">
            <h2 className="text-lg font-semibold mb-4 text-neutral-charcoal">
              {t("editSession") || "Editar Sesión"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-calm-teal uppercase tracking-widest mb-2 block">
                  {t("sessionDescription") || "Descripción"}
                </label>
                <Input
                  className="rounded-xl border-gray-200 hover:border-gray-300 focus:border-calm-teal focus:ring-2 focus:ring-calm-teal/20 bg-gray-50 transition-all font-medium text-neutral-charcoal h-11 shadow-sm focus:bg-white px-4 placeholder:text-gray-400 placeholder:font-normal"
                  placeholder={t("enterDescription") || "Descripción de la sesión..."}
                  value={editSessionDetailsFormData.description}
                  onChange={(e) => setEditSessionDetailsFormData({ ...editSessionDetailsFormData, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-calm-teal uppercase tracking-widest mb-2 block">
                  {t("sessionNotes") || "Notas"}
                </label>
                <Textarea
                  ref={editDialogNotesRef}
                  className="w-full rounded-xl border-gray-200 hover:border-gray-300 focus:border-calm-teal focus:ring-2 focus:ring-calm-teal/20 bg-gray-50 transition-all font-medium text-neutral-charcoal shadow-sm focus:bg-white px-4 py-3 placeholder:text-gray-400 placeholder:font-normal text-sm resize-none overflow-hidden"
                  placeholder={t("addSessionNotes") || "Notas adicionales..."}
                  value={editSessionDetailsFormData.notes}
                  onChange={(e) => setEditSessionDetailsFormData({ ...editSessionDetailsFormData, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="ghost" 
                onClick={() => setIsEditSessionDetailsDialogOpen(false)} 
                className="rounded-xl"
              >
                {t("cancel")}
              </Button>
              <Button 
                onClick={handleSaveEditedSessionDetails} 
                className="rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white"
              >
                {t("save")}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout >
  )
}
