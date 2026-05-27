"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    CheckCircle2,
    ClipboardList,
    Plus,
    Trash2,
    Edit,
    Save,
    ArrowLeft,
    ChevronDown,
    ChevronUp,
    Eye,
    X,
    Calendar,
    Clock,
    Play,
    Pause,
    FileQuestion,
    Activity,
    Heart,
    Brain,
    Smile,
    Zap,
    Moon,
    Sun,
    Flame,
    Star,
    MoreHorizontal
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import * as api from "@/lib/api"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"

// Types
type QuestionType = "likert" | "frequency" | "openText"

interface Question {
    id: string
    text: string
    type: QuestionType
    // Configuration
    min?: number
    max?: number
    minLabel?: string
    maxLabel?: string
    options?: string[]
}

interface Questionnaire {
    id: string
    title: string
    icon: string
    questions: Question[]
    createdAt: string
}

interface Assignment {
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
}

interface QuestionnaireCompletion {
    id: string
    assignmentId: string
    patientId: string
    questionnaireId: string
    answers?: any[]
    scheduledAt?: string
    completedAt?: string
    status: "pending" | "completed" | "missed" | "sent"
    isDelayed: boolean
    questionnaire?: {
        title: string
        icon: string
    }
}

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

// Helper to generic safe date object from string (handling potential missing Z from backend)
const getSafeDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    // If it looks like ISO but no Z and no offset, assume UTC and append Z
    if (dateStr.includes('T') && !dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.split('T')[1].includes('-')) {
        return new Date(dateStr + 'Z');
    }
    return new Date(dateStr);
}

// ... inside component ...

export default function QuestionnairePage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // State
    const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([])
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [completions, setCompletions] = useState<QuestionnaireCompletion[]>([])
    const [patients, setPatients] = useState<any[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const [isAssigning, setIsAssigning] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [previewId, setPreviewId] = useState<string | null>(null)
    const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null)
    const [viewingCompletion, setViewingCompletion] = useState<QuestionnaireCompletion | null>(null)
    const [editingCompletionId, setEditingCompletionId] = useState<string | null>(null)
    const [editDate, setEditDate] = useState("")
    const [editTime, setEditTime] = useState("")

    // Form State (Questionnaire)
    const [title, setTitle] = useState("")
    const [questions, setQuestions] = useState<Question[]>([])
    const [newQuestionText, setNewQuestionText] = useState("")
    const [newQuestionType, setNewQuestionType] = useState<QuestionType>("likert")
    // Question Config State
    const [likertMin, setLikertMin] = useState(1)
    const [likertMax, setLikertMax] = useState(10)
    const [likertMinLabel, setLikertMinLabel] = useState("Nada")
    const [likertMaxLabel, setLikertMaxLabel] = useState("Mucho")
    const [frequencyOptions, setFrequencyOptions] = useState("Nunca, Raramente, A veces, Frecuentemente, Siempre")

    const [selectedIcon, setSelectedIcon] = useState("FileQuestion")

    // Form State (Assignment)
    const [selectedPatient, setSelectedPatient] = useState("")
    const [selectedQuestionnaire, setSelectedQuestionnaire] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [frequencyType, setFrequencyType] = useState<"weekly" | "daily">("weekly")
    const [frequencyCount, setFrequencyCount] = useState(3)
    const [windowStart, setWindowStart] = useState("09:00")
    const [windowEnd, setWindowEnd] = useState("21:00")
    const [deadlineHours, setDeadlineHours] = useState(2)
    const [minHoursBetween, setMinHoursBetween] = useState(8)
    const [isRecurrent, setIsRecurrent] = useState(true)

    useEffect(() => {
        const auth = localStorage.getItem("isAuthenticated")
        if (!auth) {
            router.push("/login")
        } else {
            setIsAuthenticated(true)
            fetchData()
        }
    }, [router])

    const fetchData = async () => {
        const userId = localStorage.getItem("userId")
        const [q, a, p] = await Promise.all([
            api.getQuestionnaires(),
            api.getAssignments(),
            api.getPatients(userId || undefined)
        ])
        setQuestionnaires(q)

        const validPatientIds = new Set(p.map((patient: any) => patient.id))
        // @ts-ignore
        const allAssignments = a.sort((x: Assignment, y: Assignment) => Number(y.id) - Number(x.id))
        const filteredAssignments = allAssignments.filter((assignment: Assignment) => validPatientIds.has(assignment.patientId))

        setAssignments(filteredAssignments)
        setPatients(p)

        if (p.length > 0) {
            const allCompletions = await Promise.all(p.map((patient: any) => api.getQuestionnaireCompletions(patient.id)))
            // Sort by scheduledAt if available, else completedAt
            setCompletions(allCompletions.flat().sort((a, b) => {
                const dateA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : (a.completedAt ? new Date(a.completedAt).getTime() : 0)
                const dateB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : (b.completedAt ? new Date(b.completedAt).getTime() : 0)
                return dateB - dateA
            }))
        }
        setIsLoading(false)
    }

    // --- Questionnaire Handlers ---
    const handleStartCreate = () => {
        setIsCreating(true)
        setEditingId(null)
        setTitle("")
        setSelectedIcon("FileQuestion")
        setQuestions([])
        setNewQuestionText("")
        setNewQuestionType("likert")
        resetQuestionConfig()
    }

    const resetQuestionConfig = () => {
        setLikertMin(1)
        setLikertMax(10)
        setLikertMinLabel("Nada")
        setLikertMaxLabel("Mucho")
        setFrequencyOptions("Nunca, Raramente, A veces, Frecuentemente, Siempre")
    }

    const handleEdit = (q: Questionnaire) => {
        setIsCreating(true)
        setEditingId(q.id)
        setTitle(q.title)
        setSelectedIcon(q.icon || "FileQuestion")
        setQuestions([...q.questions])
        setNewQuestionText("")
        setNewQuestionType("likert")
    }

    const handleDeleteQuestionnaire = async (id: string) => {
        if (confirm(t("confirmDeleteQuestionnaire"))) {
            const success = await api.deleteQuestionnaire(id)
            if (success) {
                setQuestionnaires(questionnaires.filter(q => q.id !== id))
            } else {
                alert("Failed to delete")
            }
        }
    }

    const handleAddQuestion = () => {
        if (!newQuestionText.trim()) return
        const newQuestion: Question = {
            id: Date.now().toString(),
            text: newQuestionText,
            type: newQuestionType,
        }

        if (newQuestionType === 'likert') {
            newQuestion.min = likertMin
            newQuestion.max = likertMax
            newQuestion.minLabel = likertMinLabel
            newQuestion.maxLabel = likertMaxLabel
        } else if (newQuestionType === 'frequency') {
            newQuestion.options = frequencyOptions.split(',').map(o => o.trim()).filter(Boolean)
        }

        setQuestions([...questions, newQuestion])
        setNewQuestionText("")
        resetQuestionConfig()
    }

    const handleDeleteQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id))
    }

    const handleSaveQuestionnaire = async () => {
        if (!title.trim()) return
        if (editingId) {
            alert("Update not fully implemented in API wrapper yet")
            return
        }
        const newQ = await api.createQuestionnaire(title, selectedIcon, questions)
        if (newQ) {
            setQuestionnaires([...questionnaires, newQ])
            setIsCreating(false)
            setEditingId(null)
        } else {
            alert("Error creating questionnaire")
        }
    }

    const handlePreview = (id: string) => {
        setPreviewId(id)
    }

    // --- Assignment Handlers ---
    const handleStartAssign = () => {
        setIsAssigning(true)
        setSelectedPatient("")
        setSelectedQuestionnaire("")
        setStartDate("")
        setEndDate("")
        setFrequencyType("weekly")
        setFrequencyCount(3)
        setWindowStart("09:00")
        setWindowEnd("21:00")
        setDeadlineHours(2)
        setMinHoursBetween(8)
        setIsRecurrent(true)
    }

    // Helper to convert local time "HH:mm" to UTC "HH:mm"
    const toUTC = (timeStr: string) => {
        if (!timeStr) return timeStr;
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date.toISOString().substr(11, 5);
    };

    const handleSaveAssignment = async () => {
        if (!selectedPatient || !selectedQuestionnaire || !startDate || (isRecurrent && !endDate)) return

        // Validate start date
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        if (start < today) {
            alert("La fecha de inicio no puede ser anterior a hoy")
            return
        }

        // Time Check
        if (!isRecurrent && start.getTime() === today.getTime()) {
            const activeWindowStart = windowStart
            if (activeWindowStart) {
                const now = new Date()
                const currentHours = now.getHours()
                const currentMinutes = now.getMinutes()

                const [startHours, startMinutes] = activeWindowStart.split(':').map(Number)

                if (startHours < currentHours || (startHours === currentHours && startMinutes < currentMinutes)) {
                    alert("La hora de inicio no puede ser anterior a la hora actual para el día de hoy.")
                    return
                }
            }
        }


        // Convert window times to UTC for server
        const utcWindowStart = toUTC(windowStart);
        const utcWindowEnd = isRecurrent ? toUTC(windowEnd) : utcWindowStart; // For one-time, start/end times are same concept if used

        const newAssignment = await api.createAssignment({
            patientId: selectedPatient,
            questionnaireId: selectedQuestionnaire,
            startDate,
            endDate: isRecurrent ? endDate : startDate,
            frequencyType: isRecurrent ? frequencyType : "daily",
            frequencyCount: isRecurrent ? frequencyCount : 1,
            windowStart: utcWindowStart,
            windowEnd: utcWindowEnd,
            deadlineHours,
            minHoursBetween,
            status: "active"
        })

        if (newAssignment) {
            fetchData()
            setIsAssigning(false)
        } else {
            alert("Error assigning questionnaire")
        }
    }

    const handleToggleStatus = async (id: string) => {
        const assignment = assignments.find(a => a.id === id)
        if (!assignment) return
        const newStatus = assignment.status === "active" ? "paused" : "active"
        const success = await api.updateAssignmentStatus(id, newStatus)
        if (success) {
            setAssignments(assignments.map(a => a.id === id ? { ...a, status: newStatus } : a))
        }
    }

    const handleDeleteAssignment = async (id: string) => {
        if (confirm(t("confirmDeleteQuestionnaire"))) {
            const success = await api.deleteAssignment(id)
            if (success) {
                setAssignments(assignments.filter(a => a.id !== id))
            }
        }
    }

    const previewQuestionnaire = questionnaires.find(q => q.id === previewId)

    // Helpers
    const getPatientName = (id: string) => patients.find((p: any) => p.id === id)?.patientCode || t("unknownPatient")
    const getQuestionnaireTitle = (id: string) => questionnaires.find(q => q.id === id)?.title || id
    const getQuestionnaireIcon = (id: string) => {
        const q = questionnaires.find(q => q.id === id)
        return AVAILABLE_ICONS.find(i => i.name === q?.icon)?.icon || FileQuestion
    }

    if (!isAuthenticated) return null

    if (isCreating) {
        return (
            <DashboardLayout>
                <div className="space-y-6 max-w-3xl">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => setIsCreating(false)} className="rounded-xl hover:bg-muted">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-2xl font-semibold text-neutral-charcoal">
                            {editingId ? t("editQuestionnaire") : t("createQuestionnaire")}
                        </h1>
                    </div>
                    <Card className="rounded-2xl border-soft-gray shadow-soft">
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title" className="text-sm font-medium text-neutral-charcoal">{t("questionnaireTitle")}</Label>
                                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-xl border-soft-gray" placeholder={t("enterDescription")} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-neutral-charcoal">{t("selectIcon")}</Label>
                                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                                        {AVAILABLE_ICONS.map((item) => {
                                            const IconComponent = item.icon
                                            return (
                                                <button
                                                    key={item.name}
                                                    type="button"
                                                    onClick={() => setSelectedIcon(item.name)}
                                                    className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all ${selectedIcon === item.name
                                                        ? "bg-calm-teal text-white shadow-md scale-110"
                                                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                                        }`}
                                                >
                                                    <IconComponent className="h-5 w-5" />
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-neutral-charcoal px-1">{t("questions")}</h2>
                        {questions.map((q, index) => (
                            <Card key={q.id} className="rounded-2xl border-soft-gray bg-white/50">
                                <CardContent className="flex items-center justify-between p-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-calm-teal bg-calm-teal/10 px-2 py-0.5 rounded-full uppercase">{t(q.type)}</span>
                                            <span className="text-xs text-muted-foreground">Q{index + 1}</span>
                                        </div>
                                        <p className="font-medium text-neutral-charcoal">{q.text}</p>
                                        {q.type === 'likert' && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Rango: {q.min}-{q.max} | Etiquetas: "{q.minLabel}" - "{q.maxLabel}"
                                            </p>
                                        )}
                                        {q.type === 'frequency' && q.options && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Opciones: {q.options.join(", ")}
                                            </p>
                                        )}
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(q.id)} className="h-8 w-8 p-0 text-soft-coral hover:bg-soft-coral/10 rounded-lg shrink-0">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                        <Card className="rounded-2xl border-dashed border-2 border-soft-gray bg-muted/20">
                            <CardHeader><CardTitle className="text-base font-medium text-neutral-charcoal">{t("addQuestion")}</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2 space-y-2">
                                        <Label className="text-xs text-muted-foreground">{t("questionText")}</Label>
                                        <Input value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} className="h-10 rounded-xl bg-white border-soft-gray" placeholder="e.g., ¿Cómo de ansioso te sientes ahora?" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">{t("questionType")}</Label>
                                        <select value={newQuestionType} onChange={(e) => setNewQuestionType(e.target.value as QuestionType)} className="w-full h-10 px-3 rounded-xl bg-white border border-soft-gray text-sm focus:outline-none focus:ring-2 focus:ring-calm-teal/20">
                                            <option value="likert">{t("likert")}</option>
                                            <option value="frequency">{t("frequency")}</option>
                                            <option value="openText">{t("openText")}</option>
                                        </select>
                                    </div>
                                </div>
                                {newQuestionType === 'likert' && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-xl">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Mínimo</Label>
                                            <Input type="number" value={likertMin} onChange={(e) => setLikertMin(Number(e.target.value))} className="h-8 bg-white" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Máximo</Label>
                                            <Input type="number" value={likertMax} onChange={(e) => setLikertMax(Number(e.target.value))} className="h-8 bg-white" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Etiqueta Mín</Label>
                                            <Input value={likertMinLabel} onChange={(e) => setLikertMinLabel(e.target.value)} className="h-8 bg-white" placeholder="Nada" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Etiqueta Máx</Label>
                                            <Input value={likertMaxLabel} onChange={(e) => setLikertMaxLabel(e.target.value)} className="h-8 bg-white" placeholder="Mucho" />
                                        </div>
                                    </div>
                                )}
                                {newQuestionType === 'frequency' && (
                                    <div className="space-y-2 p-4 bg-muted/30 rounded-xl">
                                        <Label className="text-xs text-muted-foreground">Opciones (separadas por coma)</Label>
                                        <Input value={frequencyOptions} onChange={(e) => setFrequencyOptions(e.target.value)} className="h-9 bg-white" placeholder="Nunca, Raramente, A veces, Frecuentemente, Siempre" />
                                    </div>
                                )}
                                <div className="flex justify-end pt-2">
                                    <Button onClick={handleAddQuestion} disabled={!newQuestionText.trim()} className="rounded-xl bg-neutral-charcoal text-white hover:bg-neutral-charcoal/90" size="sm">
                                        <Plus className="h-4 w-4 mr-2" />
                                        {t("addQuestion")}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="flex justify-end pt-6 pb-12">
                        <Button onClick={handleSaveQuestionnaire} disabled={!title.trim() || questions.length === 0} className="px-8 h-12 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md text-lg">
                            <Save className="h-5 w-5 mr-2" />
                            {t("saveQuestionnaire")}
                        </Button>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 w-full max-w-[1600px] mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold text-neutral-charcoal flex items-center gap-3 mb-2">
                            <ClipboardList className="h-8 w-8 text-calm-teal" />
                            {t("questionnaires")}
                        </h1>
                        <p className="text-muted-foreground">{t("manageQuestionnaires")}</p>
                    </div>
                </div>

                <Tabs defaultValue="assignments" className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl bg-white p-1">
                        <TabsTrigger value="assignments" className="rounded-lg data-[state=active]:bg-calm-teal data-[state=active]:text-white data-[state=active]:shadow-sm">
                            {t("assignments")}
                        </TabsTrigger>
                        <TabsTrigger value="questionnaires" className="rounded-lg data-[state=active]:bg-calm-teal data-[state=active]:text-white data-[state=active]:shadow-sm">
                            {t("questionnaires")}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="questionnaires" className="mt-6 space-y-4">
                        <div className="flex justify-end">
                            <Button onClick={handleStartCreate} className="rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md">
                                <Plus className="h-4 w-4 mr-2" />
                                {t("createQuestionnaire")}
                            </Button>
                        </div>
                        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {questionnaires.length === 0 ? (
                                <Card className="rounded-2xl border-soft-gray bg-muted/20">
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                        <ClipboardList className="h-12 w-12 mb-4 opacity-50" />
                                        <p>{t("noQuestionnaires")}</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                questionnaires.map((q) => {
                                    const IconComponent = AVAILABLE_ICONS.find(i => i.name === q.icon)?.icon || FileQuestion

                                    return (
                                        <Card
                                            key={q.id}
                                            className="group rounded-3xl border border-gray-200/80 bg-white hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                                        >
                                            <CardContent className="p-6 space-y-4">
                                                {/* Icon Section */}
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="h-14 w-14 rounded-2xl bg-calm-teal/10 flex items-center justify-center shrink-0 group-hover:bg-calm-teal/20 transition-colors">
                                                        <IconComponent className="h-7 w-7 text-calm-teal" />
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleEdit(q)
                                                            }}
                                                            className="h-9 w-9 p-0 text-gray-600 hover:text-calm-teal hover:bg-calm-teal/10 rounded-xl transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDeleteQuestionnaire(q.id)
                                                            }}
                                                            className="h-9 w-9 p-0 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Content Section */}
                                                <div className="space-y-2" onClick={() => handlePreview(q.id)}>
                                                    <CardTitle className="text-xl font-bold text-neutral-charcoal leading-tight group-hover:text-calm-teal transition-colors">
                                                        {q.title}
                                                    </CardTitle>

                                                    {/* Metadata */}
                                                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-calm-teal" />
                                                            <span className="font-medium">{q.questions.length}</span>
                                                            <span>{q.questions.length === 1 ? 'pregunta' : 'preguntas'}</span>
                                                        </div>
                                                        <span className="text-gray-300">•</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            <span className="text-xs">{new Date(q.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer Action */}
                                                <div className="pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handlePreview(q.id)}
                                                        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-calm-teal hover:text-calm-teal/80 transition-colors py-1"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        <span>Vista previa</span>
                                                    </button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="assignments" className="mt-6 space-y-4">
                        <div className="flex justify-end">
                            <Button onClick={handleStartAssign} className="rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md">
                                <Plus className="h-4 w-4 mr-2" />
                                {t("assignQuestionnaire")}
                            </Button>
                        </div>
                        <Card className="rounded-2xl border-soft-gray shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50/50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 font-medium text-gray-500 text-left">{t("patient")}</th>
                                            <th className="px-6 py-4 font-medium text-gray-500 text-left">{t("questionnaire")}</th>
                                            <th className="px-6 py-4 font-medium text-gray-500 text-left">{t("details")}</th>
                                            <th className="px-6 py-4 font-medium text-gray-500 text-left">{t("status")}</th>
                                            <th className="px-6 py-4 font-medium text-gray-500 text-left">{t("progress")} / {t("scheduled")}</th>
                                            <th className="px-6 py-4 font-medium text-gray-500 text-right">{t("actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-calm-teal"></div>
                                                        <p>Cargando...</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : assignments.filter(a => a.status !== 'completed').length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Clock className="h-8 w-8 opacity-20" />
                                                        <p>{t("noAssignments")}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            assignments.filter(a => a.status !== 'completed').map((a) => {
                                                const assignmentCompletions = completions.filter(c => c.assignmentId === a.id)
                                                const totalScheduled = assignmentCompletions.length
                                                const completedCount = assignmentCompletions.filter(c => c.status === 'completed').length
                                                const isAssignmentRecurrent = a.startDate !== a.endDate || a.frequencyCount > 1
                                                const singleCompletion = assignmentCompletions[0]
                                                const isExpanded = expandedAssignmentId === a.id

                                                return (
                                                    <React.Fragment key={a.id}>
                                                        <tr className={`group hover:bg-gray-50/50 transition-colors ${isExpanded ? 'bg-gray-50/30' : ''}`}>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="font-semibold text-neutral-charcoal">{getPatientName(a.patientId)}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    {(() => {
                                                                        const Icon = getQuestionnaireIcon(a.questionnaireId)
                                                                        return <Icon className="h-4 w-4 text-calm-teal" />
                                                                    })()}
                                                                    <span className="text-neutral-charcoal">{getQuestionnaireTitle(a.questionnaireId)}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Calendar className="h-3.5 w-3.5" />
                                                                        <span>
                                                                            {a.startDate === a.endDate ?
                                                                                new Date(a.startDate).toLocaleDateString() :
                                                                                `${new Date(a.startDate).toLocaleDateString()} - ${new Date(a.endDate).toLocaleDateString()}`
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Clock className="h-3.5 w-3.5" />
                                                                        <span>
                                                                            {a.startDate === a.endDate ? "Una vez" : `${a.frequencyCount}x/${t(a.frequencyType === 'weekly' ? 'sem' : 'dia')}`}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {isAssignmentRecurrent ? (
                                                                    <div className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${a.status === 'active'
                                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                                        }`}>
                                                                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 self-center ${a.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                                                                        {t(a.status)}
                                                                    </div>
                                                                ) : (
                                                                    singleCompletion && (
                                                                        <div className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${singleCompletion.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                            singleCompletion.status === 'missed' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                                singleCompletion.status === 'sent' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                                    'bg-gray-100 text-gray-600 border-gray-200'
                                                                            }`}>
                                                                            {t(singleCompletion.status) || singleCompletion.status}
                                                                        </div>
                                                                    )
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {isAssignmentRecurrent ? (
                                                                    <div className="w-full max-w-[140px]">
                                                                        <div className="flex justify-between text-[10px] font-medium text-muted-foreground mb-1">
                                                                            <span>{Math.round((completedCount / (totalScheduled || 1)) * 100)}%</span>
                                                                            <span>{completedCount}/{totalScheduled}</span>
                                                                        </div>
                                                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                                            <div
                                                                                className="h-full bg-calm-teal rounded-full transition-all duration-500"
                                                                                style={{ width: `${(completedCount / (totalScheduled || 1)) * 100}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    singleCompletion && (
                                                                        <div className="flex flex-col gap-1">
                                                                            {editingCompletionId === singleCompletion.id ? (
                                                                                <div className="flex items-center gap-1">
                                                                                    <Input
                                                                                        type="datetime-local"
                                                                                        className="h-7 w-[150px] text-xs px-1"
                                                                                        value={`${editDate}T${editTime}`}
                                                                                        onChange={(e) => {
                                                                                            const val = e.target.value
                                                                                            if (val) {
                                                                                                const [d, t] = val.split("T")
                                                                                                setEditDate(d)
                                                                                                setEditTime(t)
                                                                                            }
                                                                                        }}
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                    />
                                                                                    <Button size="icon" className="h-7 w-7 bg-calm-teal text-white" onClick={(e) => {
                                                                                        e.stopPropagation()
                                                                                        if (singleCompletion.id && editDate && editTime) {
                                                                                            const localDate = new Date(`${editDate}T${editTime}`)
                                                                                            api.updateQuestionnaireCompletion(singleCompletion.id, { scheduledAt: localDate.toISOString() })
                                                                                                .then(() => { fetchData(); setEditingCompletionId(null) })
                                                                                        }
                                                                                    }}>
                                                                                        <Save className="h-3.5 w-3.5" />
                                                                                    </Button>
                                                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => {
                                                                                        e.stopPropagation()
                                                                                        setEditingCompletionId(null)
                                                                                    }}>
                                                                                        <X className="h-3.5 w-3.5" />
                                                                                    </Button>
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    {singleCompletion.status === 'pending' && singleCompletion.scheduledAt && (() => {
                                                                                        const now = new Date()
                                                                                        const scheduled = getSafeDate(singleCompletion.scheduledAt)
                                                                                        const diffMs = scheduled.getTime() - now.getTime()

                                                                                        if (diffMs < 0) {
                                                                                            return (
                                                                                                <div className="flex flex-col">
                                                                                                    <span className="text-xs font-semibold text-neutral-charcoal">
                                                                                                        {scheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                                    </span>
                                                                                                    <span className="text-[10px] text-red-600 font-medium">
                                                                                                        Vencido
                                                                                                    </span>
                                                                                                </div>
                                                                                            )
                                                                                        }

                                                                                        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                                                                                        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                                                                                        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

                                                                                        let timeRemaining = ""
                                                                                        if (days > 0) {
                                                                                            timeRemaining = `${days}d ${hours}h`
                                                                                        } else if (hours > 0) {
                                                                                            timeRemaining = `${hours}h ${minutes}m`
                                                                                        } else {
                                                                                            timeRemaining = `${minutes}m`
                                                                                        }

                                                                                        return (
                                                                                            <div className="flex items-center gap-1 group/time">
                                                                                                <div className="flex flex-col">
                                                                                                    <span className="text-xs font-semibold text-neutral-charcoal">
                                                                                                        {scheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                                    </span>
                                                                                                    <div className="flex items-center gap-1">
                                                                                                        <Clock className="h-3 w-3 text-calm-teal" />
                                                                                                        <span className="text-[10px] text-calm-teal font-medium">
                                                                                                            {timeRemaining}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <Button
                                                                                                    size="icon"
                                                                                                    variant="ghost"
                                                                                                    className="h-5 w-5 p-0 text-muted-foreground opacity-0 group-hover/time:opacity-100 transition-opacity"
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation()
                                                                                                        setEditingCompletionId(singleCompletion.id)
                                                                                                        if (singleCompletion.scheduledAt) {
                                                                                                            const d = getSafeDate(singleCompletion.scheduledAt)
                                                                                                            const year = d.getFullYear()
                                                                                                            const month = String(d.getMonth() + 1).padStart(2, '0')
                                                                                                            const day = String(d.getDate()).padStart(2, '0')
                                                                                                            const hours = String(d.getHours()).padStart(2, '0')
                                                                                                            const minutes = String(d.getMinutes()).padStart(2, '0')
                                                                                                            setEditDate(`${year}-${month}-${day}`)
                                                                                                            setEditTime(`${hours}:${minutes}`)
                                                                                                        }
                                                                                                    }}
                                                                                                >
                                                                                                    <Edit className="h-3 w-3" />
                                                                                                </Button>
                                                                                            </div>
                                                                                        )
                                                                                    })()}

                                                                                    {singleCompletion.status === 'sent' && singleCompletion.scheduledAt && (() => {
                                                                                        const scheduled = getSafeDate(singleCompletion.scheduledAt)
                                                                                        return (
                                                                                            <div className="flex flex-col">
                                                                                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                                                                                                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                                                                                                    <span>{scheduled.toLocaleDateString()}</span>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                                                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                                                                                                    <span>{scheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        )
                                                                                    })()}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex justify-end items-center gap-2">
                                                                    {isAssignmentRecurrent && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => setExpandedAssignmentId(isExpanded ? null : a.id)}
                                                                            className={`h-8 w-8 p-0 rounded-full transition-colors mr-1 ${isExpanded ? 'bg-calm-teal text-white hover:bg-calm-teal/90' : 'text-gray-400 hover:text-calm-teal hover:bg-calm-teal/10'}`}
                                                                        >
                                                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                                        </Button>
                                                                    )}

                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-neutral-charcoal hover:bg-gray-100 rounded-full">
                                                                                <span className="sr-only">Open menu</span>
                                                                                <MoreHorizontal className="h-4 w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end" className="w-[160px] rounded-xl shadow-lg border-gray-100">
                                                                            <DropdownMenuLabel className="text-xs text-muted-foreground">{t("actions")}</DropdownMenuLabel>

                                                                            {a.status !== 'completed' && isAssignmentRecurrent && (
                                                                                <>
                                                                                    <DropdownMenuItem onClick={() => handleToggleStatus(a.id)} className="cursor-pointer">
                                                                                        {a.status === 'active' ? (
                                                                                            <>
                                                                                                <Pause className="mr-2 h-4 w-4 text-gray-500" />
                                                                                                <span>{t("pause")}</span>
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                <Play className="mr-2 h-4 w-4 text-gray-500" />
                                                                                                <span>{t("resume")}</span>
                                                                                            </>
                                                                                        )}
                                                                                    </DropdownMenuItem>
                                                                                    <DropdownMenuItem onClick={async () => {
                                                                                        if (confirm(t("confirmComplete"))) {
                                                                                            await api.updateAssignmentStatus(a.id, "completed")
                                                                                            fetchData()
                                                                                        }
                                                                                    }} className="cursor-pointer">
                                                                                        <CheckCircle2 className="mr-2 h-4 w-4 text-gray-500" />
                                                                                        <span>{t("completed")}</span>
                                                                                    </DropdownMenuItem>
                                                                                    <DropdownMenuSeparator />
                                                                                </>
                                                                            )}

                                                                            <DropdownMenuItem onClick={() => handleDeleteAssignment(a.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                                <span>{t("delete")}</span>
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (() => {

                                                            // Helper function to get week number and year
                                                            const getWeekInfo = (date: Date) => {
                                                                const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
                                                                const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
                                                                const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
                                                                return { week: weekNumber, year: date.getFullYear() }
                                                            }

                                                            // Group completions by week
                                                            const sortedCompletions = assignmentCompletions.sort((x, y) => {
                                                                const tA = x.scheduledAt ? getSafeDate(x.scheduledAt).getTime() : 0
                                                                const tB = y.scheduledAt ? getSafeDate(y.scheduledAt).getTime() : 0
                                                                return tA - tB
                                                            })

                                                            const completionsByWeek: { [key: string]: typeof assignmentCompletions } = {}
                                                            sortedCompletions.forEach((c) => {
                                                                if (c.scheduledAt) {
                                                                    const date = getSafeDate(c.scheduledAt)
                                                                    const { week, year } = getWeekInfo(date)
                                                                    const key = `${year}-W${week}`
                                                                    if (!completionsByWeek[key]) {
                                                                        completionsByWeek[key] = []
                                                                    }
                                                                    completionsByWeek[key].push(c)
                                                                }
                                                            })

                                                            return (
                                                                <tr className="bg-gray-50/30 animate-in fade-in zoom-in-95 duration-200">
                                                                    <td colSpan={6} className="px-6 py-4 border-t border-gray-100 border-b border-gray-200 shadow-inner">
                                                                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm w-full">
                                                                            <table className="w-full text-sm">
                                                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                                                    <tr>
                                                                                        <th className="px-4 py-3 font-semibold text-gray-500 text-left">Fecha Programada</th>
                                                                                        <th className="px-4 py-3 font-semibold text-gray-500 text-left">{t('status')}</th>
                                                                                        <th className="px-4 py-3 font-semibold text-gray-500 text-left">Tiempo Restante</th>
                                                                                        <th className="px-4 py-3 font-semibold text-gray-500 text-right">Acciones</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {Object.keys(completionsByWeek).map((weekKey) => {
                                                                                        const [yearStr, weekStr] = weekKey.split('-W')
                                                                                        const weekCompletions = completionsByWeek[weekKey]
                                                                                        const firstDate = weekCompletions[0].scheduledAt ? new Date(weekCompletions[0].scheduledAt) : new Date()

                                                                                        // Calculate week start and end dates
                                                                                        const startOfWeek = new Date(firstDate)
                                                                                        startOfWeek.setDate(firstDate.getDate() - firstDate.getDay() + 1) // Monday
                                                                                        const endOfWeek = new Date(startOfWeek)
                                                                                        endOfWeek.setDate(startOfWeek.getDate() + 6) // Sunday

                                                                                        return (
                                                                                            <React.Fragment key={weekKey}>
                                                                                                {/* Week Header */}
                                                                                                <tr className="bg-calm-teal/5 border-t-2 border-calm-teal/20">
                                                                                                    <td colSpan={4} className="px-4 py-2">
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <Calendar className="h-4 w-4 text-calm-teal" />
                                                                                                            <span className="font-bold text-sm text-calm-teal">
                                                                                                                Semana {weekStr} - {yearStr}
                                                                                                            </span>
                                                                                                            <span className="text-xs text-gray-500">
                                                                                                                ({startOfWeek.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {endOfWeek.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    </td>
                                                                                                </tr>
                                                                                                {/* Completions for this week */}
                                                                                                {weekCompletions.map((c) => (
                                                                                                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                                                                                        <td className="px-4 py-3 text-neutral-charcoal">
                                                                                                            {c.scheduledAt ? (
                                                                                                                <div className="flex flex-col gap-1">
                                                                                                                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                                                                                                                        <Calendar className="h-3.5 w-3.5 text-calm-teal" />
                                                                                                                        <span>{getSafeDate(c.scheduledAt).toLocaleDateString()}</span>
                                                                                                                    </div>
                                                                                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                                                                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                                                                                                                        <span>{getSafeDate(c.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            ) : "—"}
                                                                                                        </td>
                                                                                                        <td className="px-4 py-3">
                                                                                                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${c.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                                                                c.status === 'missed' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                                                                    c.status === 'sent' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                                                                        'bg-gray-100 text-gray-600 border-gray-200'
                                                                                                                }`}>
                                                                                                                {t(c.status) || c.status}
                                                                                                            </span>
                                                                                                            {c.isDelayed && (
                                                                                                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                                                                                    Fuera de plazo
                                                                                                                </span>
                                                                                                            )}
                                                                                                        </td>
                                                                                                        <td className="px-4 py-3">
                                                                                                            {c.status === 'pending' && c.scheduledAt && (() => {
                                                                                                                const now = new Date()
                                                                                                                const scheduled = getSafeDate(c.scheduledAt)
                                                                                                                const diffMs = scheduled.getTime() - now.getTime()

                                                                                                                if (diffMs < 0) {
                                                                                                                    return (
                                                                                                                        <div className="flex items-center gap-1.5">
                                                                                                                            <span className="text-xs text-red-600 font-medium">⏰ Vencido</span>
                                                                                                                        </div>
                                                                                                                    )
                                                                                                                }

                                                                                                                const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                                                                                                                const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                                                                                                                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

                                                                                                                let timeRemaining = ""
                                                                                                                if (days > 0) {
                                                                                                                    timeRemaining = `${days}d ${hours}h`
                                                                                                                } else if (hours > 0) {
                                                                                                                    timeRemaining = `${hours}h ${minutes}m`
                                                                                                                } else {
                                                                                                                    timeRemaining = `${minutes}m`
                                                                                                                }

                                                                                                                return (
                                                                                                                    <div className="flex items-center gap-1.5">
                                                                                                                        <Clock className="h-4 w-4 text-calm-teal" />
                                                                                                                        <span className="text-xs text-calm-teal font-medium">{timeRemaining}</span>
                                                                                                                    </div>
                                                                                                                )
                                                                                                            })()}
                                                                                                        </td>
                                                                                                        <td className="px-4 py-3 text-right">
                                                                                                            {/* Reuse edit logic here if needed, keeping it simple for now as requested */}
                                                                                                            {editingCompletionId === c.id ? (
                                                                                                                <div className="flex items-center justify-end gap-2">
                                                                                                                    {/* Simplified Edit View for Recurrent Child */}
                                                                                                                    <Input
                                                                                                                        type="datetime-local" className="h-8 w-[180px] text-xs"
                                                                                                                        value={`${editDate}T${editTime}`}
                                                                                                                        onChange={(e) => { const val = e.target.value; if (val) { const [d, t] = val.split("T"); setEditDate(d); setEditTime(t); } }}
                                                                                                                    />
                                                                                                                    <Button size="icon" className="h-7 w-7 bg-calm-teal text-white" onClick={async () => {
                                                                                                                        if (!c.id || !editDate || !editTime) return
                                                                                                                        const localDate = new Date(`${editDate}T${editTime}`)
                                                                                                                        await api.updateQuestionnaireCompletion(c.id, { scheduledAt: localDate.toISOString() })
                                                                                                                        fetchData(); setEditingCompletionId(null)
                                                                                                                    }}><Save className="h-3.5 w-3.5" /></Button>
                                                                                                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCompletionId(null)}><X className="h-3.5 w-3.5" /></Button>
                                                                                                                </div>
                                                                                                            ) : (
                                                                                                                c.status === 'pending' && (
                                                                                                                    <div className="flex items-center justify-end gap-1">
                                                                                                                        <Button
                                                                                                                            size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-calm-teal"
                                                                                                                            onClick={() => {
                                                                                                                                setEditingCompletionId(c.id)
                                                                                                                                if (c.scheduledAt) {
                                                                                                                                    const d = getSafeDate(c.scheduledAt)
                                                                                                                                    const year = d.getFullYear()
                                                                                                                                    const month = String(d.getMonth() + 1).padStart(2, '0')
                                                                                                                                    const day = String(d.getDate()).padStart(2, '0')
                                                                                                                                    const hours = String(d.getHours()).padStart(2, '0')
                                                                                                                                    const minutes = String(d.getMinutes()).padStart(2, '0')
                                                                                                                                    setEditDate(`${year}-${month}-${day}`)
                                                                                                                                    setEditTime(`${hours}:${minutes}`)
                                                                                                                                }
                                                                                                                            }}
                                                                                                                        >
                                                                                                                            <Edit className="h-3 w-3" />
                                                                                                                        </Button>
                                                                                                                        <Button
                                                                                                                            size="icon" variant="ghost" className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                                                                                                            onClick={async () => {
                                                                                                                                if (confirm(t("confirmDeleteQuestionnaire"))) {
                                                                                                                                    await api.deleteQuestionnaireCompletion(c.id)
                                                                                                                                    fetchData()
                                                                                                                                }
                                                                                                                            }}
                                                                                                                        >
                                                                                                                            <Trash2 className="h-3 w-3" />
                                                                                                                        </Button>
                                                                                                                    </div>
                                                                                                                )

                                                                                                            )}
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                ))}
                                                                                            </React.Fragment>
                                                                                        )
                                                                                    })}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })()}
                                                    </React.Fragment>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </TabsContent>


                </Tabs >

                {/* Assignment Modal */}
                {
                    isAssigning && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-soft-gray shadow-soft bg-white">
                                <CardHeader className="border-b border-soft-gray pb-4">
                                    <CardTitle className="text-xl font-semibold text-neutral-charcoal">{t("assignQuestionnaire")}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="space-y-2">
                                        <Label>{t("selectPatient")}</Label>
                                        <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-white border border-soft-gray text-sm focus:outline-none focus:ring-2 focus:ring-calm-teal/20">
                                            <option value="">-- {t("selectPatient")} --</option>
                                            {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("questionnaireTitle")}</Label>
                                        <select value={selectedQuestionnaire} onChange={(e) => setSelectedQuestionnaire(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-white border border-soft-gray text-sm focus:outline-none focus:ring-2 focus:ring-calm-teal/20">
                                            <option value="">-- {t("selectQuestionnaire")} --</option>
                                            {questionnaires.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center space-x-2 pb-2">
                                        <Switch
                                            id="recurrence-mode"
                                            checked={isRecurrent}
                                            onCheckedChange={setIsRecurrent}
                                        />
                                        <Label htmlFor="recurrence-mode">{t("recurrente") || "Recurrente"}</Label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>{isRecurrent ? t("startDate") : "Fecha"}</Label>
                                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl" />
                                        </div>
                                        {isRecurrent ? (
                                            <div className="space-y-2">
                                                <Label>{t("endDate")}</Label>
                                                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl" />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-2">
                                                    <Label>Hora</Label>
                                                    <div className="flex gap-2">
                                                        <Input type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} className="rounded-xl" />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => {
                                                                const now = new Date()
                                                                const h = String(now.getHours()).padStart(2, '0')
                                                                const m = String(now.getMinutes() + 1).padStart(2, '0')
                                                                setWindowStart(`${h}:${m}`)
                                                                setStartDate(now.toISOString().split('T')[0])
                                                            }}
                                                            className="whitespace-nowrap rounded-xl text-calm-teal hover:text-calm-teal/80 border-calm-teal/30 hover:bg-calm-teal/5"
                                                        >
                                                            Enviar Ahora
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t("responseDeadline")} ({t("hours")})</Label>
                                                    <Input type="number" min="1" value={deadlineHours} onChange={(e) => setDeadlineHours(parseInt(e.target.value))} className="rounded-xl" />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    {isRecurrent && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>{t("frequency")}</Label>
                                                <div className="flex gap-2">
                                                    <Input type="number" min="1" value={frequencyCount} onChange={(e) => setFrequencyCount(parseInt(e.target.value))} className="w-20 rounded-xl" />
                                                    <select value={frequencyType} onChange={(e) => setFrequencyType(e.target.value as "weekly" | "daily")} className="flex-1 h-10 px-3 rounded-xl bg-white border border-soft-gray text-sm focus:outline-none focus:ring-2 focus:ring-calm-teal/20">
                                                        <option value="weekly">{t("timesPerWeek")}</option>
                                                        <option value="daily">{t("timesPerDay")}</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>{t("startTime")}</Label>
                                                    <Input type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} className="rounded-xl" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t("endTime")}</Label>
                                                    <Input type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} className="rounded-xl" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>{t("responseDeadline")} ({t("hours")})</Label>
                                                    <Input type="number" min="1" value={deadlineHours} onChange={(e) => setDeadlineHours(parseInt(e.target.value))} className="rounded-xl" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Horas mín. entre envíos</Label>
                                                    <Input type="number" min="0" value={minHoursBetween} onChange={(e) => setMinHoursBetween(parseInt(e.target.value))} className="rounded-xl" />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                                <div className="p-4 border-t border-soft-gray flex justify-end gap-2 bg-white rounded-b-2xl">
                                    <Button variant="ghost" onClick={() => setIsAssigning(false)} className="rounded-xl">{t("cancel")}</Button>
                                    <Button onClick={handleSaveAssignment} disabled={!selectedPatient || !selectedQuestionnaire || !startDate || (isRecurrent && !endDate)} className="rounded-xl bg-calm-teal text-white">
                                        {t("save")}
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )
                }

                {/* Preview Modal (Same as before) */}
                {
                    previewQuestionnaire && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-soft-gray shadow-soft bg-white">
                                <CardHeader className="flex flex-row items-center justify-between border-b border-soft-gray pb-4 sticky top-0 bg-white z-10">
                                    <CardTitle className="text-xl font-semibold text-neutral-charcoal">
                                        {previewQuestionnaire.title}
                                    </CardTitle>
                                    <Button variant="ghost" size="icon" onClick={() => setPreviewId(null)} className="rounded-full hover:bg-muted">
                                        <X className="h-5 w-5" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    {previewQuestionnaire.questions.map((quest, i) => (
                                        <div key={quest.id} className="space-y-2">
                                            <Label className="text-base font-medium text-neutral-charcoal">{i + 1}. {quest.text}</Label>
                                            {quest.type === "likert" && (
                                                <div className="space-y-4 pt-2">
                                                    <div className="flex justify-between px-2">
                                                        {(() => {
                                                            const min = quest.min || 1
                                                            const max = quest.max || 5
                                                            // Generate up to 5 points for preview or just min/max if large range
                                                            const range = max - min
                                                            const steps = range <= 10 ? Array.from({ length: range + 1 }, (_, i) => min + i) : [min, Math.round((min + max) / 2), max]

                                                            return steps.map((val) => (
                                                                <div key={val} className="flex flex-col items-center gap-1">
                                                                    <div className="w-4 h-4 rounded-full border border-soft-gray" />
                                                                    <span className="text-xs text-muted-foreground">{val}</span>
                                                                </div>
                                                            ))
                                                        })()}
                                                    </div>
                                                    <div className="flex justify-between text-xs font-medium text-muted-foreground px-1">
                                                        <span>{quest.minLabel || "Mínimo"}</span>
                                                        <span>{quest.maxLabel || "Máximo"}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {quest.type === "frequency" && (
                                                <div className="flex flex-col gap-2 pt-1">
                                                    {(quest.options && quest.options.length > 0 ? quest.options : ["Nunca", "Raramente", "A veces", "A menudo", "Siempre"]).map((opt) => (
                                                        <div key={opt} className="flex items-center gap-2">
                                                            <div className="w-4 h-4 rounded-full border border-soft-gray" />
                                                            <span className="text-sm text-neutral-charcoal">{opt}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {quest.type === "openText" && (
                                                <Input disabled className="bg-muted/10 border-soft-gray" placeholder="Respuesta..." />
                                            )}
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    )
                }
            </div >
            {viewingCompletion && (
                <Dialog open={!!viewingCompletion} onOpenChange={(open) => !open && setViewingCompletion(null)}>
                    <DialogContent className="sm:max-w-md bg-white">
                        <DialogHeader>
                            <DialogTitle>Respuestas del Cuestionario</DialogTitle>
                            <DialogDescription>
                                {viewingCompletion.questionnaire?.title} - {getPatientName(viewingCompletion.patientId)}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            {viewingCompletion.answers && viewingCompletion.answers.length > 0 ? (
                                viewingCompletion.answers.map((answer: any, index: number) => {
                                    const qDef = questionnaires.find(q => q.id === viewingCompletion.questionnaireId)
                                    // Handle answer structure: could be {questionId, value} or just value? Assuming {questionId, value}
                                    const questionId = answer.questionId || answer.id
                                    const questionText = qDef?.questions.find((q: any) => q.id === questionId)?.text || `Pregunta ${index + 1}`

                                    return (
                                        <div key={index} className="bg-muted/10 p-3 rounded-lg border border-soft-gray">
                                            <p className="text-sm font-medium text-neutral-charcoal mb-1">{questionText}</p>
                                            <p className="text-sm text-muted-foreground">{typeof answer.value === 'object' ? JSON.stringify(answer.value) : answer.value}</p>
                                        </div>
                                    )
                                })
                            ) : (
                                <p className="text-center text-muted-foreground py-4">No hay respuestas registradas.</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button onClick={() => setViewingCompletion(null)}>Cerrar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </DashboardLayout >
    )
}
