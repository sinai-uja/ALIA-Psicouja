"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getCurrentPatient, type Patient } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowLeft, CheckCircle, Sparkles, ChevronRight, FileText, Check, AlertCircle, Clock } from "lucide-react"
import { getPendingAssignments, submitAssignment, type QuestionnaireCompletion } from "@/lib/api"
import { BottomNav } from "@/components/bottom-nav"

function FormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const assignmentIdParam = searchParams.get("assignmentId")

  const [patient, setPatient] = useState<Patient | null>(null)
  const [pendingCompletions, setPendingCompletions] = useState<QuestionnaireCompletion[]>([])
  const [completedList, setCompletedList] = useState<QuestionnaireCompletion[]>([])

  // State for Form Execution
  const [currentCompletion, setCurrentCompletion] = useState<QuestionnaireCompletion | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(true)

  // Timer for countdown
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000) // Update every minute
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const p = getCurrentPatient()
    if (!p) {
      router.push("/login")
      return
    }
    setPatient(p)

    getPendingAssignments().then(completions => {
      // Separate pending (sent/missed) and completed
      const pending = completions.filter(c => c.status === 'sent' || c.status === 'missed')
      const completed = completions.filter(c => c.status === 'completed')
      setPendingCompletions(pending)
      setCompletedList(completed)

      if (assignmentIdParam) {
        const found = pending.find(c => c.assignment_id.toString() === assignmentIdParam)
        if (found) {
          startForm(found)
        }
      }
      setLoading(false)
    })
  }, [assignmentIdParam, router])

  const startForm = (completion: QuestionnaireCompletion) => {
    setCurrentCompletion(completion)
    setCurrentQuestionIndex(0)
    setAnswers({})
    setCompleted(false)
  }

  const handleAnswer = (val: any) => {
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: val }))
  }

  const handleNext = () => {
    if (!currentCompletion) return
    const questions = currentCompletion.questionnaire.questions || []
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      handleSubmit()
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (!currentCompletion) return
    setSubmitting(true)

    const questions = currentCompletion.questionnaire.questions || []
    const answersList = questions.map((q, idx) => ({
      question_index: idx,
      question_text: q.text,
      answer: answers[idx]
    }))

    const success = await submitAssignment(currentCompletion.assignment_id, answersList)

    setCompleted(true)
    if (success) {
      //si es tardio, cambiar el estado a late 
      if (currentCompletion.status === 'sent') {
        currentCompletion.status = 'late'
      }

      setTimeout(() => {
        // Refresh data or return to list
        // For now, we stick to success screen
      }, 2000)
    } else {
      alert("Error al enviar las respuestas.")
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
  }



  const getStatusInfo = (scheduledAt: string, deadlineHours: number = 24) => {
    const start = new Date(scheduledAt)
    const deadline = new Date(start.getTime() + deadlineHours * 60 * 60 * 1000)
    const diff = deadline.getTime() - currentTime.getTime()

    if (diff <= 0) {
      return {
        isLate: true,
        text: "Fuera de plazo",
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-100 dark:bg-red-900/30",
        icon: AlertCircle
      }
    }

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return {
      isLate: false,
      text: `${hours}h ${minutes}m restantes`,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      icon: Clock
    }
  }

  // --- SUCCESS VIEW ---
  if (completed) {
    // ... (unchanged success view) ...
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-background dark:via-background dark:to-background flex items-center justify-center p-4 pb-24">
        <Card className="w-full max-w-md border-none shadow-2xl bg-white/80 dark:bg-card backdrop-blur">
          <CardContent className="pt-12 pb-8 text-center space-y-6">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-white dark:bg-card rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                ¡Excelente!
              </h2>
              <p className="text-base text-muted-foreground max-w-sm mx-auto leading-relaxed px-4">
                Tus respuestas han sido enviadas correctamente.
              </p>
            </div>
            <Button
              onClick={() => {
                setCompleted(false);
                setCurrentCompletion(null);
                router.push('/dashboard')
              }}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              Volver al Inicio
            </Button>
          </CardContent>
        </Card>
        <BottomNav />
      </div>
    )
  }

  // --- FORM EXECUTION VIEW ---
  if (currentCompletion) {
    const questions = currentCompletion.questionnaire.questions || []
    const question = questions[currentQuestionIndex]
    const currentAnswer = answers[currentQuestionIndex]
    const canProceed = currentAnswer !== undefined && currentAnswer !== ""
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100

    const statusInfo = getStatusInfo(currentCompletion.scheduled_at, currentCompletion.deadline_hours)

    return (
      <div className="h-[100dvh] overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-background dark:via-background dark:to-background flex flex-col">
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-card/80 backdrop-blur-lg border-b shadow-sm">
          <div className="container max-w-2xl mx-auto px-4 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentCompletion(null)}
                className="rounded-full hover:bg-white/50 dark:hover:bg-card h-8 w-8"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <h1 className="text-base font-bold">{currentCompletion.questionnaire.title}</h1>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    Paso {currentQuestionIndex + 1} de {questions.length}
                  </p>
                  {statusInfo.isLate && (
                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded-sm font-medium">Fuera de plazo</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-primary">{Math.round(progress)}%</div>
              </div>
            </div>

            <div className="relative w-full bg-white/50 dark:bg-muted/30 rounded-full h-2 overflow-hidden shadow-inner mt-2">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out shadow-lg"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-32">
          <div className="container max-w-2xl mx-auto px-4 py-8 space-y-4">
            <Card className="border-none shadow-xl bg-white/80 dark:bg-card backdrop-blur animate-in slide-in-from-bottom-4 duration-500">
              <CardHeader className="space-y-2 pb-3 pt-6">
                <CardTitle className="text-xl leading-snug text-balance">{question.text}</CardTitle>
                <CardDescription className="text-sm">
                  Responde honestamente para un mejor seguimiento.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-8">
                {/* Scale/Likert Questions - Show Big Number + Slider */}
                {(question.type === "scale" || question.type === "likert") && (
                  <Slider
                    value={[(currentAnswer as number) || (question.min || 1)]}
                    onValueChange={(value) => handleAnswer(value[0])}
                    min={question.min || 1}
                    max={question.max || 10}
                    step={1}
                    className="w-full h-52 relative flex items-center justify-center cursor-pointer touch-none"
                  >
                    <div className="absolute top-4 inset-x-0 text-center pointer-events-none space-y-2">
                      <div className="inline-flex items-baseline gap-1.5">
                        <span className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          {(currentAnswer as number) || (question.min || 1)}
                        </span>
                        <span className="text-2xl text-muted-foreground font-medium">/ {question.max || 10}</span>
                      </div>
                    </div>

                    <div className="absolute bottom-4 inset-x-0 flex justify-between text-sm font-medium px-2 pointer-events-none">
                      <span className="text-blue-500">{question.minLabel || "Mínimo"}</span>
                      <span className="text-indigo-500">{question.maxLabel || "Máximo"}</span>
                    </div>
                  </Slider>
                )}

                {/* Frequency Questions - Show Radio Options */}
                {question.type === "frequency" && (
                  <RadioGroup
                    value={currentAnswer as string || ""}
                    onValueChange={handleAnswer}
                    className="space-y-3"
                  >
                    {(question.options as string[]).map((option: string) => (
                      <div
                        key={option}
                        className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${currentAnswer === option
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                          : "border-gray-200 hover:border-blue-300 bg-white dark:bg-card"
                          }`}
                        onClick={() => handleAnswer(option)}
                      >
                        <RadioGroupItem value={option} id={option} className="text-blue-600" />
                        <Label
                          htmlFor={option}
                          className={`flex-1 cursor-pointer font-medium ${currentAnswer === option ? "text-blue-700" : "text-gray-700"
                            }`}
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {/* Text/Open Questions - Show Textarea */}
                {(question.type === "text" || question.type === "openText" || !["scale", "likert", "frequency"].includes(question.type)) && (
                  <div className="space-y-2">
                    <Textarea
                      value={(currentAnswer as string) || ""}
                      onChange={(e) => handleAnswer(e.target.value)}
                      placeholder="Escribe tu respuesta aquí..."
                      rows={6}
                      className="resize-none text-base leading-relaxed border-2 focus:border-primary rounded-xl bg-white/50"
                    />
                  </div>
                )}
              </CardContent>
            </Card>


          </div>
        </div>

        <div className="bg-white/80 dark:bg-card/80 backdrop-blur-lg border-t p-4 z-50">
          <div className="container max-w-2xl mx-auto flex gap-3">
            {currentQuestionIndex > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="flex-1 h-12 text-base font-semibold rounded-xl border-2 bg-white/50 dark:bg-card"
              >
                Anterior
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed && !submitting}
              className="flex-1 h-12 text-base font-bold rounded-xl shadow-lg disabled:opacity-50 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0"
            >
              {submitting ? "Enviando..." : (currentQuestionIndex === questions.length - 1 ? "Completar Formulario" : "Siguiente")}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // --- LIST VIEW (DASHBOARD) ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-background dark:via-background dark:to-background pb-24">
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        <div className="pt-6 space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Mis Formularios
          </h1>
          <p className="text-sm text-muted-foreground">Formularios pendientes</p>
        </div>



        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-foreground">Pendientes</h2>
          </div>

          {pendingCompletions.length === 0 ? (
            <Card className="border-dashed border-2 bg-white/50 dark:bg-card/50 shadow-none">
              <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                No tienes cuestionarios pendientes.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {pendingCompletions.map(completion => {
                const status = getStatusInfo(completion.scheduled_at, completion.deadline_hours)
                return (
                  <div key={completion.id} onClick={() => startForm(completion)} className="cursor-pointer">
                    <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-blue-50/50 dark:from-card dark:to-card overflow-hidden group">
                      <CardContent className="p-0">
                        <div className="p-5 flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <FileText className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <h3 className="font-bold text-lg text-foreground group-hover:text-blue-600 transition-colors">{completion.questionnaire.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-1">{completion.questionnaire.description}</p>
                          </div>
                          <div className="self-center">
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-sm">
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                        <div className="px-5 py-3 bg-white/50 dark:bg-black/5 border-t border-blue-100/50 dark:border-white/5 flex items-center justify-between text-xs font-medium">
                          <div className={`flex items-center gap-1.5 ${status.color}`}>
                            <status.icon className="w-3.5 h-3.5" />
                            <span>{status.text}</span>
                          </div>
                          <span className={`${status.bgColor} ${status.color} px-2 py-0.5 rounded-full`}>
                            {status.isLate ? "Tardío" : "Nuevo"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {completedList.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4 mt-8">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold text-foreground">Completados</h2>
            </div>
            <div className="space-y-3">
              {completedList.map(completion => (
                <Card key={completion.id} className="border-none shadow-sm bg-white/60 dark:bg-card/60 backdrop-blur">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground/80">{completion.questionnaire.title}</h3>
                      <p className="text-xs text-muted-foreground">Enviado</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Info Alert */}
        <div className="bg-blue-50/80 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 rounded-xl p-4 flex gap-3 text-sm text-blue-700 dark:text-blue-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="leading-snug">
            Es importante responder a los cuestionarios dentro del plazo asignado para un mejor seguimiento.
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

export default function FormPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
      <FormContent />
    </Suspense>
  )
}
