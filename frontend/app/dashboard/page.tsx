"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import * as api from "@/lib/api"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  MessageSquare,
  MessageCircle,
  MessageCircleOff,
  ClipboardList,
  LayoutDashboard,
  ArrowUpRight,
  ArrowRight,
  Wifi,
  WifiOff,
  Send,
  Inbox,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Activity,
  TrendingUp,
  FileText,
  UserCheck,
  MessageSquareReply,
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts"

// ---------- helper: animated number counter ----------
function AnimatedNumber({ value, duration = 600 }: { value: number; duration?: number }) {
  const [displayed, setDisplayed] = useState(0)
  useEffect(() => {
    if (value === 0) { setDisplayed(0); return }
    const start = performance.now()
    const from = displayed
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplayed(Math.round(from + (value - from) * eased))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return <>{displayed}</>
}

// ---------- Types ----------
interface DashboardStats {
  total_patients: number
  total_messages: number
  unread_messages: number
  completed_questionnaires: number
  unread_questionnaires: number
  pending_questionnaires: number
  recent_activity: any[]
  online_patients: number
  open_sessions: number
  unanswered_messages: number
  unanswered_details: { id: number; patient_code: string }[]
  ai_stats: {
    total_sent: number
    ai_generated: number
    ai_edited: number
    ai_original: number
    manual: number
  }
}

const EMPTY: DashboardStats = {
  total_patients: 0,
  total_messages: 0,
  unread_messages: 0,
  recent_activity: [],
  completed_questionnaires: 0,
  unread_questionnaires: 0,
  pending_questionnaires: 0,
  online_patients: 0,
  open_sessions: 0,
  unanswered_messages: 0,
  unanswered_details: [],
  ai_stats: {
    total_sent: 0,
    ai_generated: 0,
    ai_edited: 0,
    ai_original: 0,
    manual: 0,
  },
}

// ---------- Colors ----------
const TEAL = "oklch(0.55 0.12 200)"
const TEAL_LIGHT = "oklch(0.75 0.10 200)"
const CORAL = "oklch(0.65 0.15 25)"
const LAVENDER = "oklch(0.65 0.10 290)"
const PEACH = "oklch(0.75 0.1 50)"
const PIE_COLORS = [TEAL, CORAL, LAVENDER, PEACH]

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState("Dr. Smith")
  const [stats, setStats] = useState<DashboardStats>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated")
    const storedName = localStorage.getItem("userName")
    if (!auth) {
      router.push("/login")
    } else {
      setIsAuthenticated(true)
      if (storedName) setUserName(storedName)
      loadStats()

      // Poll stats every 10 seconds
      const interval = setInterval(loadStats, 10000)
      return () => clearInterval(interval)
    }
  }, [router])

  const loadStats = async () => {
    try {
      const id = localStorage.getItem("userId")
      const filterId = id ? id : undefined
      const data = await api.getDashboardStats(filterId)
      setStats(data)
    } catch (error) {
      console.error("Failed to load stats", error)
    } finally {
      setLoading(false)
    }
  }

  // ---------- Derived data ----------
  const onlinePercent = useMemo(
    () => (stats.total_patients > 0 ? Math.round((stats.online_patients / stats.total_patients) * 100) : 0),
    [stats.online_patients, stats.total_patients],
  )

  const offlinePatients = stats.total_patients - stats.online_patients

  const questionnaireData = useMemo(
    () => [
      { name: "Completados", value: stats.completed_questionnaires, color: TEAL },
      { name: "Sin leer", value: stats.unread_questionnaires, color: CORAL },
      { name: "Pendientes", value: stats.pending_questionnaires, color: LAVENDER },
    ].filter((d) => d.value > 0),
    [stats.completed_questionnaires, stats.unread_questionnaires, stats.pending_questionnaires],
  )

  const aiChartData = useMemo(
    () =>
      [
        { name: "IA Original", value: stats.ai_stats.ai_original, color: TEAL },
        { name: "IA Editada", value: stats.ai_stats.ai_edited, color: PEACH },
        { name: "Manual", value: stats.ai_stats.manual, color: CORAL },
      ].filter((d) => d.value > 0),
    [stats.ai_stats],
  )

  const aiEfficiency = useMemo(() => {
    if (stats.ai_stats.total_sent === 0) return 0
    return Math.round((stats.ai_stats.ai_generated / stats.ai_stats.total_sent) * 100)
  }, [stats.ai_stats])

  const readMessages = stats.total_messages - stats.unread_messages

  // ---------- Activity icon helper ----------
  const activityIcon = (type: string) => {
    if (type === "assignment") return <ClipboardList className="h-4 w-4 text-calm-teal" />
    return <MessageSquare className="h-4 w-4 text-soft-coral" />
  }

  const activityBadge = (type: string) => {
    if (type === "assignment")
      return (
        <Badge variant="outline" className="text-[10px] border-calm-teal/30 text-calm-teal bg-calm-teal/5">
          Cuestionario
        </Badge>
      )
    return (
      <Badge variant="outline" className="text-[10px] border-soft-coral/30 text-soft-coral bg-soft-coral/5">
        Mensaje
      </Badge>
    )
  }

  if (!isAuthenticated) return null

  // ---------- Render ----------
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div>
          <h1 className="text-3xl font-semibold text-neutral-charcoal flex items-center gap-3 mb-2">
            <LayoutDashboard className="h-8 w-8 text-calm-teal" />
            {t("welcomeBack", { name: userName })}
          </h1>
          <p className="text-muted-foreground">{t("overviewToday")}</p>
        </div>

        {/* ══════════ ROW 1: KPI Stat Cards ══════════ */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* ── Total Pacientes (Prioridad Online) ── */}
          <Card className="rounded-2xl border-soft-gray shadow-soft hover:shadow-md transition-shadow group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("totalPatients")}
              </CardTitle>
              <div className="h-9 w-9 rounded-xl bg-calm-teal/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-calm-teal" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-calm-teal tabular-nums">
                  <AnimatedNumber value={stats.online_patients} />
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  de {stats.total_patients}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  <span>En línea ahora</span>
                  <span>{onlinePercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-calm-teal transition-all duration-1000 ease-out relative"
                    style={{ width: `${onlinePercent}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Mensajes sin leer ── */}
          <Card className="rounded-2xl border-soft-gray shadow-soft hover:shadow-md transition-shadow group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("unreadMessages")}
              </CardTitle>
              <div className="h-9 w-9 rounded-xl bg-soft-coral/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Inbox className="h-5 w-5 text-soft-coral" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neutral-charcoal tabular-nums">
                <AnimatedNumber value={stats.unread_messages} />
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{readMessages} leídos</span>
                  <span>{stats.total_messages} total</span>
                </div>
                <Progress
                  value={stats.total_messages > 0 ? (readMessages / stats.total_messages) * 100 : 0}
                  className="h-1.5"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Cuestionarios sin leer ── */}
          <Card className="rounded-2xl border-soft-gray shadow-soft hover:shadow-md transition-shadow group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cuestionarios Sin Leer
              </CardTitle>
              <div className="h-9 w-9 rounded-xl bg-soft-lavender/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ClipboardList className="h-5 w-5 text-[oklch(0.55_0.10_290)]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neutral-charcoal tabular-nums">
                <AnimatedNumber value={stats.unread_questionnaires} />
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{stats.completed_questionnaires} completados</span>
                  <span>{stats.pending_questionnaires} pendientes</span>
                </div>
                <Progress
                  value={
                    stats.completed_questionnaires + stats.pending_questionnaires > 0
                      ? (stats.completed_questionnaires /
                          (stats.completed_questionnaires + stats.pending_questionnaires)) *
                        100
                      : 0
                  }
                  className="h-1.5"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Sesiones abiertas (Chats con mensajes) ── */}
          <Card className="rounded-2xl border-soft-gray shadow-soft hover:shadow-md transition-shadow group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("openSessions")}
              </CardTitle>
              <div className="h-9 w-9 rounded-xl bg-calm-teal/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageCircle className="h-5 w-5 text-calm-teal" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neutral-charcoal tabular-nums">
                <AnimatedNumber value={stats.open_sessions} />
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {stats.total_patients > 0
                      ? Math.round((stats.open_sessions / stats.total_patients) * 100)
                      : 0}
                    % conversaciones
                  </span>
                  <span>{stats.total_patients} pacientes</span>
                </div>
                <Progress
                  value={
                    stats.total_patients > 0 ? (stats.open_sessions / stats.total_patients) * 100 : 0
                  }
                  className="h-1.5"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ══════════ ROW 2: Charts ══════════ */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Pie: Cuestionarios ── */}
          <Card className="rounded-2xl border-soft-gray shadow-soft">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-calm-teal" />
                  <CardTitle className="text-neutral-charcoal">Estado de Cuestionarios</CardTitle>
                </div>
                <button
                  onClick={() => router.push("/questionnaires")}
                  className="inline-flex items-center gap-1 text-xs text-calm-teal font-medium hover:underline cursor-pointer"
                >
                  Gestionar <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {questionnaireData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Sin datos de cuestionarios</p>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <div className="w-[180px] h-[180px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={questionnaireData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {questionnaireData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "1px solid oklch(0.93 0.01 240)",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3">
                    {questionnaireData.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-baseline">
                            <span className="text-sm text-neutral-charcoal font-medium">{entry.name}</span>
                            <span className="text-lg font-bold text-neutral-charcoal tabular-nums">
                              {entry.value}
                            </span>
                          </div>
                          <Progress
                            value={
                              (stats.completed_questionnaires +
                                stats.unread_questionnaires +
                                stats.pending_questionnaires) >
                              0
                                ? (entry.value /
                                    (stats.completed_questionnaires +
                                      stats.unread_questionnaires +
                                      stats.pending_questionnaires)) *
                                  100
                                : 0
                            }
                            className="h-1 mt-1"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Pie/Bar: Estadísticas de IA ── */}
          <Card className="rounded-2xl border-soft-gray shadow-soft">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-calm-teal" />
                  <CardTitle className="text-neutral-charcoal">Estadísticas de IA</CardTitle>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-calm-teal">
                    <TrendingUp className="h-3 w-3" /> {aiEfficiency}% eficacia
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {stats.ai_stats.total_sent === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <UserCheck className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Sin uso de IA registrado</p>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <div className="w-[180px] h-[180px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={aiChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {aiChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "1px solid oklch(0.93 0.01 240)",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3">
                    {aiChartData.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-baseline">
                            <span className="text-sm text-neutral-charcoal font-medium">{entry.name}</span>
                            <span className="text-lg font-bold text-neutral-charcoal tabular-nums">
                              {entry.value}
                            </span>
                          </div>
                          <Progress
                            value={(entry.value / stats.ai_stats.total_sent) * 100}
                            className="h-1 mt-1"
                          />
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-soft-gray mt-2">
                      <p className="text-[11px] text-muted-foreground">
                        Total de respuestas enviadas:{" "}
                        <span className="font-bold text-neutral-charcoal">{stats.ai_stats.total_sent}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ══════════ ROW 3: Pending Messages + Activity ══════════ */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Mensajes Pendientes ── */}
          <Card className="rounded-2xl border-soft-gray shadow-soft lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-calm-teal/10 flex items-center justify-center shrink-0">
                    <MessageSquareReply className="h-5 w-5 text-calm-teal" />
                  </div>
                  <CardTitle className="text-neutral-charcoal text-[17px]">Mensajes Pendientes</CardTitle>
                </div>
                <Badge className="bg-calm-teal/10 text-calm-teal border-transparent hover:bg-calm-teal/10 tabular-nums">
                  {stats.unanswered_messages}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {stats.unanswered_details.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-neutral-charcoal">¡Al día!</p>
                  <p className="text-xs text-muted-foreground mt-1 px-10">No hay pacientes esperando respuesta.</p>
                </div>
              ) : (
                <div className="max-h-[340px] overflow-y-auto custom-scrollbar">
                  <div className="divide-y divide-soft-gray/40">
                    {stats.unanswered_details.map((p) => (
                      <div 
                        key={p.id} 
                        className="flex items-center justify-between p-4 hover:bg-calm-teal/5 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-calm-teal animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.4)]" />
                          <div>
                            <p className="text-sm font-bold text-neutral-charcoal">Caso #{p.patient_code}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Pendiente</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => router.push(`/patients/${p.id}/statistics?openChat=true`)}
                          className="h-8 rounded-full border border-calm-teal/20 bg-white text-calm-teal hover:bg-calm-teal hover:text-white hover:border-calm-teal text-xs font-semibold px-4 shadow-sm group-hover:shadow transition-all"
                        >
                          Chatear <ArrowRight className="h-3 w-3 ml-1.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Recent Activity ── */}
          <Card className="rounded-2xl border-soft-gray shadow-soft lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-calm-teal/10 flex items-center justify-center shrink-0">
                    <Activity className="h-5 w-5 text-calm-teal" />
                  </div>
                  <CardTitle className="text-neutral-charcoal text-[17px]">{t("recentActivity")}</CardTitle>
                </div>
                {stats.recent_activity.length > 0 && (
                  <Badge variant="secondary" className="text-xs bg-muted/50 hover:bg-muted/50 text-muted-foreground border-transparent">
                    {stats.recent_activity.length} eventos
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[340px] overflow-y-auto custom-scrollbar">
                <div className="divide-y divide-soft-gray/40">
                  {stats.recent_activity.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Activity className="h-10 w-10 text-muted-foreground/20 mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">No hay actividad reciente</p>
                    </div>
                  ) : (
                    stats.recent_activity.map((activity: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-4 py-4 px-5 hover:bg-muted/30 transition-colors group"
                      >
                        <div className="h-10 w-10 rounded-xl bg-white shadow-sm border border-soft-gray/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          {activityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-neutral-charcoal truncate">#{activity.patient}</p>
                            {activityBadge(activity.type)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate font-medium">{activity.action}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[11px] text-muted-foreground tabular-nums font-medium">
                            {activity.time ? (val => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase())(formatDistanceToNow(new Date(activity.time.endsWith("Z") ? activity.time : activity.time + "Z"), { addSuffix: true, locale: es }).replace("alrededor de ", "").replace("más de ", "").replace("menos de ", "")) : "-"}
                          </span>
                          <button 
                            onClick={() => {
                              if (activity.type === "assignment") {
                                router.push(`/patients/${activity.patient_id}/statistics?tab=questionnaires`)
                              } else {
                                router.push(`/patients/${activity.patient_id}/statistics?openChat=true`)
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-calm-teal/10 text-muted-foreground hover:text-calm-teal transition-colors"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  )
}
