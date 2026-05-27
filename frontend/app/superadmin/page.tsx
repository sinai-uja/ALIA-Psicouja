"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts"
import {
    Users,
    Activity,
    LogOut,
    UserPlus,
    Stethoscope,
    UserCircle2,
    MessageSquare,
    FileText,
    MessageCircle,
    MessagesSquare,
    Brain,
    Sparkles,
    Clock,
    Calendar,
    ChevronRight,
    Check,
    CheckCircle2,
    Edit3,
    AlertCircle,
    TrendingUp,
    Bot,
    Search
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import * as api from "@/lib/api"

export default function SuperAdminPage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [stats, setStats] = useState<api.PlatformStats | null>(null)
    const [dailyStats, setDailyStats] = useState<api.DailyMessageStat[]>([])
    const [detailedUsers, setDetailedUsers] = useState<api.DetailedUsersResponse | null>(null)
    const [users, setUsers] = useState<api.Psychologist[]>([]) // Keep for backward compat or replace
    const [isLoading, setIsLoading] = useState(true)

    // Analysis State
    const [analysisSessions, setAnalysisSessions] = useState<api.SessionAnalysisItem[]>([])
    const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
    const [selectedSessionDetail, setSelectedSessionDetail] = useState<api.SessionAnalysisDetail | null>(null)
    const [isLoadingAnalysisDetail, setIsLoadingAnalysisDetail] = useState(false)
    const [sessionSearchTerm, setSessionSearchTerm] = useState("")
    const [selectedGlobalModelFilter, setSelectedGlobalModelFilter] = useState("all")

    // Create User Form State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newUser, setNewUser] = useState({
        name: "",
        email: "",
        role: "psychologist" as "psychologist" | "admin",
    })

    useEffect(() => {
        checkAccess()
    }, [])


    const checkAccess = async () => {
        const role = localStorage.getItem("userRole")
        if (role !== "superadmin") {
            router.push("/dashboard") // Or login
            return
        }
        await loadData()
    }

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [statsData, usersData, dailyData, detailedData, analysisSessionsData] = await Promise.all([
                api.getPlatformStats(),
                api.getSystemUsers(),
                api.getDailyMessageStats(),
                api.getDetailedUsers(),
                api.getSessionsForAnalysis()
            ])
            setStats(statsData)
            setUsers(usersData)
            setDailyStats(dailyData)
            setDetailedUsers(detailedData)
            setAnalysisSessions(analysisSessionsData)
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSelectSession = async (sessionId: number) => {
        setSelectedSessionId(sessionId)
        setIsLoadingAnalysisDetail(true)
        try {
            const detail = await api.getSessionAnalysisDetail(sessionId)
            setSelectedSessionDetail(detail)
        } catch (e) {
            console.error("Error loading session analysis detail:", e)
        } finally {
            setIsLoadingAnalysisDetail(false)
        }
    }


    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const created = await api.createSystemUser({
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                schedule: "Lunes a Viernes, 9:00 - 18:00" // Default
            })

            if (created) {
                setIsCreateOpen(false)
                setNewUser({ name: "", email: "", role: "psychologist" })
                loadData() // Refresh list
                alert("Usuario creado exitosamente. La contraseña ha sido enviada por correo.")
            } else {
                alert("Error al crear usuario")
            }
        } catch (e) {
            console.error(e)
            alert("Error al crear usuario")
        }
    }

    const handleLogout = () => {
        api.logout()
    }

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Cargando...</div>
    }

    const aiStats = stats?.ai_stats
    const allModels = aiStats?.by_model?.map(m => m.model) || []

    let filteredClicked = aiStats?.clicked_ai || 0
    let filteredNotClicked = aiStats?.not_clicked_ai || 0
    let filteredEdited = aiStats?.edited_ai || 0
    let filteredGenerations = aiStats?.total_generations || 0

    if (selectedGlobalModelFilter !== "all" && aiStats?.by_model) {
        const modelData = aiStats.by_model.find(m => m.model === selectedGlobalModelFilter)
        filteredClicked = modelData?.clicked || 0
        filteredNotClicked = modelData?.not_clicked || 0
        filteredEdited = modelData?.edited || 0
        filteredGenerations = modelData?.generations || 0
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 relative via-blue-50/30 to-purple-50/30 p-4 md:p-8">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] pointer-events-none mix-blend-overlay"></div>
            <div className="max-w-7xl mx-auto space-y-8 relative z-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-sm border border-white/50 gap-4 transition-all duration-300">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
                                Panel de Superadmin
                            </h1>
                        </div>
                        <p className="text-gray-500 font-medium pl-14">Panel maestro de control de plataforma y recursos</p>
                    </div>
                    <Button variant="outline" onClick={handleLogout} className="flex gap-2 rounded-xl group hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all border-gray-200">
                        <LogOut size={16} className="group-hover:rotate-12 transition-transform duration-300" />
                        <span className="font-semibold">Cerrar Sesión</span>
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="rounded-3xl border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-green-500/10"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold text-gray-600">Psicólogos Online</CardTitle>
                            <div className="p-2 bg-green-100 text-green-600 rounded-xl group-hover:scale-110 transition-transform">
                                <Stethoscope className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="flex items-baseline gap-2 mb-1">
                                <div className="text-4xl font-extrabold text-gray-900 tracking-tighter">
                                    {stats?.online_psychologists || 0}
                                </div>
                                <div className="text-sm font-medium text-gray-400">
                                    / {stats?.total_psychologists || 0}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <p className="text-xs font-medium text-green-600">Activos ahora</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-blue-500/10"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold text-gray-600">Pacientes Online</CardTitle>
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                                <UserCircle2 className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="flex items-baseline gap-2 mb-1">
                                <div className="text-4xl font-extrabold text-gray-900 tracking-tighter">
                                    {stats?.online_patients || 0}
                                </div>
                                <div className="text-sm font-medium text-gray-400">
                                    / {stats?.total_patients || 0}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                <p className="text-xs font-medium text-blue-600">Activos ahora</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-purple-500/10"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold text-gray-600">Mensajes Totales</CardTitle>
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                                <MessagesSquare className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-4xl font-extrabold text-gray-900 tracking-tighter mb-1">
                                {((stats?.total_messages_patient || 0) + (stats?.total_messages_psychologist || 0)).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <p className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-md">Intercambiados en total</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-orange-500/10"></div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold text-gray-600">Palabras Totales</CardTitle>
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl group-hover:scale-110 transition-transform">
                                <FileText className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-4xl font-extrabold text-gray-900 tracking-tighter mb-1 mt-[2px]">
                                {stats?.total_words?.toLocaleString() || 0}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <p className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-md">Procesadas por el sistema</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 shadow-sm">
                        <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 transition-all font-medium">Vista General</TabsTrigger>
                        <TabsTrigger value="psychologists" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 transition-all font-medium">Psicólogos Detallado</TabsTrigger>
                        <TabsTrigger value="patients" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-cyan-600 transition-all font-medium">Pacientes Detallado</TabsTrigger>
                        <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-600 transition-all font-medium">Gestión de Usuarios</TabsTrigger>
                        <TabsTrigger value="analysis" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 transition-all font-medium">Análisis de IA</TabsTrigger>
                    </TabsList>


                    <TabsContent value="overview" className="space-y-6">
                        {/* Messages Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="rounded-3xl border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                    <CardTitle className="text-sm font-semibold text-gray-600">Mensajes de Psicólogos</CardTitle>
                                    <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl">
                                        <MessageSquare className="h-4 w-4" />
                                    </div>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                    <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">{stats?.total_messages_psychologist || 0}</div>
                                    <p className="text-xs font-medium text-gray-400 mt-1">Enviados por profesionales</p>
                                </CardContent>
                            </Card>
                            <Card className="rounded-3xl border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                                    <CardTitle className="text-sm font-semibold text-gray-600">Mensajes de Pacientes</CardTitle>
                                    <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
                                        <MessageCircle className="h-4 w-4" />
                                    </div>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                    <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-600 tracking-tight">{stats?.total_messages_patient || 0}</div>
                                    <p className="text-xs font-medium text-gray-400 mt-1">Enviados por usuarios</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Global AI Integration Analysis */}
                        {aiStats && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2 bg-white/40 p-4 rounded-2xl border border-white/40">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg text-white shadow-sm">
                                            <Brain className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800 tracking-tight">Análisis de Integración de IA (Global de Plataforma)</h3>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Filtrar por:</span>
                                        <Select value={selectedGlobalModelFilter} onValueChange={setSelectedGlobalModelFilter}>
                                            <SelectTrigger className="w-[200px] h-9 rounded-xl bg-white/80 border-gray-200">
                                                <SelectValue placeholder="Todos los modelos" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="all">Todos los modelos</SelectItem>
                                                {allModels.map(model => (
                                                    <SelectItem key={model} value={model}>{model}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Global Acceptance */}
                                    <Card className="rounded-3xl border-0 shadow-sm bg-white/80 backdrop-blur-sm p-5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-12 -mt-12"></div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">🔹 Aceptación de IA</span>
                                            <div className="p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                        </div>
                                        <div className="flex items-baseline gap-1.5">
                                            <div className="text-3xl font-black text-emerald-600">
                                                {filteredClicked}
                                            </div>
                                            <div className="text-xs font-semibold text-gray-400">
                                                / {filteredGenerations} gen ({
                                                    filteredGenerations > 0
                                                        ? ((filteredClicked / filteredGenerations) * 100).toFixed(0)
                                                        : 0
                                                }%)
                                            </div>
                                        </div>
                                        <p className="text-[11px] font-semibold text-gray-500 mt-2">Veces que se usó una propuesta de la IA.</p>
                                    </Card>

                                    {/* Global Manual */}
                                    <Card className="rounded-3xl border-0 shadow-sm bg-white/80 backdrop-blur-sm p-5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-12 -mt-12"></div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">🔹 Propuestas Descartadas</span>
                                            <div className="p-1.5 bg-amber-50 border border-amber-100 rounded-lg text-amber-600">
                                                <Edit3 className="w-4 h-4" />
                                            </div>
                                        </div>
                                        <div className="flex items-baseline gap-1.5">
                                            <div className="text-3xl font-black text-amber-600">
                                                {filteredNotClicked}
                                            </div>
                                            <div className="text-xs font-semibold text-gray-400">
                                                / {filteredGenerations} gen ({
                                                    filteredGenerations > 0
                                                        ? ((filteredNotClicked / filteredGenerations) * 100).toFixed(0)
                                                        : 0
                                                }%)
                                            </div>
                                        </div>
                                        <p className="text-[11px] font-semibold text-gray-500 mt-2">Veces que se descartaron las sugerencias.</p>
                                    </Card>

                                    {/* Global Edited */}
                                    <Card className="rounded-3xl border-0 shadow-sm bg-white/80 backdrop-blur-sm p-5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-12 -mt-12"></div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">🔹 Editado tras Click</span>
                                            <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                                                <TrendingUp className="w-4 h-4" />
                                            </div>
                                        </div>
                                        <div className="flex items-baseline gap-1.5">
                                            <div className="text-3xl font-black text-indigo-600">
                                                {filteredEdited}
                                            </div>
                                            <div className="text-xs font-semibold text-gray-400">
                                                / {filteredClicked} clicks ({
                                                    filteredClicked > 0
                                                        ? ((filteredEdited / filteredClicked) * 100).toFixed(0)
                                                        : 0
                                                }%)
                                            </div>
                                        </div>
                                        <p className="text-[11px] font-semibold text-gray-500 mt-2">Sugerencias aceptadas que luego fueron editadas.</p>
                                    </Card>

                                    {/* Global Total Generations */}
                                    <Card className="rounded-3xl border-0 shadow-sm bg-white/80 backdrop-blur-sm p-5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-12 -mt-12"></div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Generaciones</span>
                                            <div className="p-1.5 bg-purple-50 border border-purple-100 rounded-lg text-purple-600">
                                                <Sparkles className="w-4 h-4" />
                                            </div>
                                        </div>
                                        <div className="flex items-baseline gap-1.5">
                                            <div className="text-3xl font-black text-purple-600">
                                                {filteredGenerations}
                                            </div>
                                            <div className="text-xs font-semibold text-gray-400">
                                                veces invocada
                                            </div>
                                        </div>
                                        <p className="text-[11px] font-semibold text-gray-500 mt-2">Opciones de asistencia generadas en total.</p>
                                    </Card>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Top Models Global */}
                                    <Card className="rounded-3xl border-0 shadow-sm bg-white/80 backdrop-blur-sm p-5 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/5 rounded-full blur-3xl -mr-14 -mt-14"></div>
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">🏆 Top Modelos Elegidos (Global)</span>
                                            <div className="p-1.5 bg-cyan-50 border border-cyan-100 rounded-lg text-cyan-600"><Bot className="w-4 h-4" /></div>
                                        </div>
                                        <div className="space-y-2.5">
                                            {aiStats.model_ranking.map((entry, idx) => {
                                                const maxCount = aiStats.model_ranking[0]?.count || 1;
                                                const pct = (entry.count / maxCount) * 100;
                                                return (
                                                    <div key={entry.model} className="space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-md ${idx === 0 ? "bg-amber-100 text-amber-700" : idx === 1 ? "bg-gray-100 text-gray-600" : "bg-orange-50 text-orange-600"}`}>{idx + 1}</span>
                                                                <span className="text-xs font-bold text-gray-800 truncate max-w-[250px]">{entry.model}</span>
                                                            </div>
                                                            <span className="text-xs font-black text-cyan-700 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-md">{entry.count}x</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                            <div className="bg-gradient-to-r from-cyan-400 to-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {aiStats.model_ranking.length === 0 && (
                                                <p className="text-xs text-gray-400 italic">No hay registros de modelos todavía.</p>
                                            )}
                                        </div>
                                    </Card>

                                    {/* Most accepted without editing Global */}
                                    <Card className="rounded-3xl border-0 shadow-sm bg-white/80 backdrop-blur-sm p-5 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-28 h-28 bg-violet-500/5 rounded-full blur-3xl -mr-14 -mt-14"></div>
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">✅ Aceptado Sin Editar (Global)</span>
                                            <div className="p-1.5 bg-violet-50 border border-violet-100 rounded-lg text-violet-600"><CheckCircle2 className="w-4 h-4" /></div>
                                        </div>
                                        <div className="space-y-2.5">
                                            {aiStats.model_unedited_ranking.length > 0 ? aiStats.model_unedited_ranking.map((entry, idx) => {
                                                const maxCount = aiStats.model_unedited_ranking[0]?.count || 1;
                                                const pct = (entry.count / maxCount) * 100;
                                                return (
                                                    <div key={entry.model} className="space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-md ${idx === 0 ? "bg-emerald-100 text-emerald-700" : idx === 1 ? "bg-gray-100 text-gray-600" : "bg-orange-50 text-orange-600"}`}>{idx + 1}</span>
                                                                <span className="text-xs font-bold text-gray-800 truncate max-w-[250px]">{entry.model}</span>
                                                            </div>
                                                            <span className="text-xs font-black text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-md">{entry.count}x</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                            <div className="bg-gradient-to-r from-violet-400 to-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            }) : (
                                                <p className="text-xs text-gray-400 italic">No hay registros — todas las sugerencias fueron editadas.</p>
                                            )}
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        )}

                        {/* Chart */}
                        <Card className="rounded-3xl border-0 shadow-sm bg-white/80 backdrop-blur-sm overflow-hidden">
                            <CardHeader className="bg-gray-50/50 border-b border-gray-100/50 pb-4">
                                <CardTitle className="text-gray-800 font-semibold">Mensajes Diarios</CardTitle>
                                <CardDescription>Vista general de la actividad en los últimos 30 días</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px] pt-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={dailyStats}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dx={-10} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                            cursor={{ stroke: '#E5E7EB', strokeWidth: 2 }}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                        <Line type="monotone" dataKey="psychologist_count" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#6366f1', strokeWidth: 0 }} name="Psicólogos" />
                                        <Line type="monotone" dataKey="patient_count" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#f59e0b', strokeWidth: 0 }} name="Pacientes" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="psychologists">
                        <Card className="rounded-3xl border-0 shadow-sm overflow-hidden bg-white/80 backdrop-blur-sm">
                            <CardHeader className="border-b border-gray-100/50 bg-transparent">
                                <CardTitle className="text-indigo-900">Estadísticas de Psicólogos</CardTitle>
                                <CardDescription>Detalle de actividad y uso de la plataforma por profesional</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50/80 text-gray-500 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                                            <tr>
                                                <th className="px-6 py-4">Psicólogo</th>
                                                <th className="px-6 py-4">Pacientes</th>
                                                <th className="px-6 py-4">Sesiones</th>
                                                <th className="px-6 py-4">Mensajes</th>
                                                <th className="px-6 py-4">Palabras</th>
                                                <th className="px-6 py-4">Uso de IA</th>
                                                <th className="px-6 py-4">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {detailedUsers?.psychologists.map(psych => (
                                                <tr key={psych.id} className="hover:bg-indigo-50/30 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        <div>{psych.name}</div>
                                                        <div className="text-xs text-gray-500 font-normal">{psych.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600">{psych.patients_count}</td>
                                                    <td className="px-6 py-4 text-gray-600">{psych.sessions_count}</td>
                                                    <td className="px-6 py-4 text-gray-600">{psych.message_count}</td>
                                                    <td className="px-6 py-4 text-gray-600">{psych.word_count.toLocaleString()}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-purple-50 border border-purple-100 text-purple-600 px-2.5 py-1 rounded-lg text-xs font-medium">
                                                            {psych.ai_clicks} usos
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${psych.is_online ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-300"}`} />
                                                                <span className={`text-xs font-medium ${psych.is_online ? "text-green-600" : "text-gray-500"}`}>
                                                                    {psych.is_online ? "En línea" : "Desconectado"}
                                                                </span>
                                                            </div>
                                                            {!psych.is_online && psych.last_active && (
                                                                <span className="text-gray-400 text-[10px]">
                                                                    Última vez: {(val => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase())(formatDistanceToNow(new Date(psych.last_active.endsWith("Z") ? psych.last_active : psych.last_active + "Z"), { addSuffix: true, locale: es }).replace("alrededor de ", "").replace("más de ", "").replace("menos de ", ""))}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!detailedUsers?.psychologists || detailedUsers.psychologists.length === 0) && (
                                                <tr>
                                                    <td colSpan={7} className="p-8 text-center text-gray-500">No hay datos disponibles</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="patients">
                        <Card className="rounded-3xl border-0 shadow-sm overflow-hidden bg-white/80 backdrop-blur-sm">
                            <CardHeader className="border-b border-gray-100/50 bg-transparent">
                                <CardTitle className="text-blue-900">Estadísticas de Pacientes</CardTitle>
                                <CardDescription>Registro de interacción y uso por paciente</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50/80 text-gray-500 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                                            <tr>
                                                <th className="px-6 py-4">Paciente</th>
                                                <th className="px-6 py-4">Psicólogo Asignado</th>
                                                <th className="px-6 py-4">Mensajes</th>
                                                <th className="px-6 py-4">Palabras</th>
                                                <th className="px-6 py-4">Tiempo Online</th>
                                                <th className="px-6 py-4">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {detailedUsers?.patients.map(patient => (
                                                <tr key={patient.id} className="hover:bg-blue-50/30 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        <div>{patient.patient_code}</div>
                                                        <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-mono border border-gray-200">ID: {patient.id}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600">{patient.psychologist_name}</td>
                                                    <td className="px-6 py-4 text-gray-600">{patient.message_count}</td>
                                                    <td className="px-6 py-4 text-gray-600">{patient.word_count.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-gray-600">
                                                        {Math.floor(patient.total_online_seconds / 60)} mins
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${patient.is_online ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-gray-300"}`} />
                                                                <span className={`text-xs font-medium ${patient.is_online ? "text-green-600" : "text-gray-500"}`}>
                                                                    {patient.is_online ? "En línea" : "Desconectado"}
                                                                </span>
                                                            </div>
                                                            {!patient.is_online && patient.last_active && (
                                                                <span className="text-gray-400 text-[10px]">
                                                                    Última vez: {(val => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase())(formatDistanceToNow(new Date(patient.last_active.endsWith("Z") ? patient.last_active : patient.last_active + "Z"), { addSuffix: true, locale: es }).replace("alrededor de ", "").replace("más de ", "").replace("menos de ", ""))}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!detailedUsers?.patients || detailedUsers.patients.length === 0) && (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-gray-500">No hay pacientes disponibles</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="users">
                        {/* Users Management */}
                        <Card className="rounded-3xl border-0 shadow-sm overflow-hidden bg-white/80 backdrop-blur-sm">
                            <CardHeader className="border-b border-gray-100/50 bg-transparent flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Gestión de Usuarios</CardTitle>
                                    <CardDescription>Administra psicólogos y administradores del sistema</CardDescription>
                                </div>

                                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="bg-gray-900 hover:bg-gray-800 text-white shadow-md rounded-xl transition-all">
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Crear Usuario
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px] rounded-2xl">
                                        <DialogHeader>
                                            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                                            <DialogDescription>
                                                Añade un nuevo administrador o psicólogo al sistema.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <form onSubmit={handleCreateUser} className="space-y-4 pt-4">
                                            <div className="space-y-2">
                                                <Label>Nombre Completo</Label>
                                                <Input
                                                    required
                                                    value={newUser.name}
                                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                                    placeholder="Ej. Dr. Juan Pérez"
                                                    className="rounded-xl"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Email</Label>
                                                <Input
                                                    required
                                                    type="email"
                                                    value={newUser.email}
                                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                                    placeholder="correo@ejemplo.com"
                                                    className="rounded-xl"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Rol</Label>
                                                <Select
                                                    value={newUser.role}
                                                    onValueChange={(val: "psychologist" | "admin") => setNewUser({ ...newUser, role: val })}
                                                >
                                                    <SelectTrigger className="rounded-xl">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="psychologist">Psicólogo</SelectItem>
                                                        <SelectItem value="admin">Administrador</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex justify-end pt-4">
                                                <Button type="submit" className="rounded-xl bg-gray-900 hover:bg-gray-800">Crear Usuario</Button>
                                            </div>
                                        </form>
                                    </DialogContent>
                                </Dialog>

                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50/80 text-gray-500 font-semibold text-xs tracking-wider uppercase whitespace-nowrap">
                                            <tr>
                                                <th className="px-6 py-4">Nombre</th>
                                                <th className="px-6 py-4">Email</th>
                                                <th className="px-6 py-4">Rol</th>
                                                <th className="px-6 py-4">Estado</th>
                                                <th className="px-6 py-4 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {users.map(user => (
                                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                                                    <td className="px-6 py-4 text-gray-500">{user.email}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${user.role === 'admin'
                                                            ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                                            : user.role === 'superadmin'
                                                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                                                : 'bg-blue-50 text-blue-700 border border-blue-100'
                                                            }`}>
                                                            {user.role === 'admin' ? 'Administrador' : user.role === 'superadmin' ? 'Super Admin' : 'Psicólogo'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${user.totalOnlineSeconds && user.totalOnlineSeconds > 0 ? "bg-green-500" : "bg-gray-300"}`} />
                                                            <span className="text-gray-500 text-xs font-medium">
                                                                {user.totalOnlineSeconds && user.totalOnlineSeconds > 0 ? t("online") : t("offline")}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-gray-400">
                                                        <Button variant="ghost" size="sm" className="rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100">
                                                            ...
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {users.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-gray-500">No hay usuarios registrados</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                            </Card>
                    </TabsContent>

                    <TabsContent value="analysis" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* Left Sidebar: Session list */}
                            <Card className="rounded-3xl border-0 shadow-sm lg:col-span-4 bg-white/80 backdrop-blur-sm overflow-hidden h-[750px] flex flex-col">
                                <CardHeader className="border-b border-gray-100/50 pb-4 shrink-0">
                                    <CardTitle className="text-emerald-900 flex items-center gap-2 text-xl font-bold">
                                        <Brain className="w-5 h-5 text-emerald-600" />
                                        Sesiones de Terapia
                                    </CardTitle>
                                    <CardDescription>Analiza el uso clínico de la IA sesión por sesión</CardDescription>
                                    <div className="relative mt-3">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar por paciente, terapeuta..."
                                            value={sessionSearchTerm}
                                            onChange={(e) => setSessionSearchTerm(e.target.value)}
                                            className="pl-9 rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm h-10 shadow-inner"
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3 flex-1 overflow-y-auto custom-scrollbar space-y-2.5">
                                    {analysisSessions.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400 space-y-3">
                                            <Brain className="w-12 h-12 text-gray-300 opacity-60" />
                                            <p className="text-sm font-medium">No se encontraron sesiones registradas en el sistema.</p>
                                        </div>
                                    ) : (
                                        analysisSessions
                                            .filter(session => {
                                                const term = sessionSearchTerm.toLowerCase();
                                                return (
                                                    session.patient_code.toLowerCase().includes(term) ||
                                                    session.psychologist_name.toLowerCase().includes(term) ||
                                                    (session.description && session.description.toLowerCase().includes(term))
                                                );
                                            })
                                            .map((session) => {
                                                const isSelected = selectedSessionId === session.id;
                                                return (
                                                    <div
                                                        key={session.id}
                                                        onClick={() => handleSelectSession(session.id)}
                                                        className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 border text-left flex flex-col gap-2 ${
                                                            isSelected
                                                                ? "bg-emerald-50/50 border-emerald-300 shadow-sm ring-1 ring-emerald-300/30"
                                                                : "bg-white/50 border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/10"
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {new Date(session.date).toLocaleDateString("es-ES", { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </div>
                                                            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-lg text-[10px] border border-emerald-100/50 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {session.duration}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 text-sm">Paciente: {session.patient_code}</h4>
                                                            <p className="text-xs text-gray-500 font-medium">Terapeuta: {session.psychologist_name}</p>
                                                        </div>
                                                        {session.description && (
                                                            <p className="text-xs text-gray-400 line-clamp-1 italic font-normal mt-0.5">
                                                                "{session.description}"
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })
                                    )}
                                </CardContent>
                            </Card>

                            {/* Right Panel: Detailed analysis */}
                            <div className="lg:col-span-8 space-y-6">
                                {selectedSessionId === null ? (
                                    <Card className="rounded-3xl border-0 shadow-sm bg-white/80 backdrop-blur-sm h-[750px] flex flex-col items-center justify-center p-8 text-center">
                                        <div className="p-5 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full text-emerald-600 shadow-inner mb-6 animate-pulse">
                                            <Brain className="w-12 h-12" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 tracking-tight">Análisis de Interacción de IA por Sesión</h3>
                                        <p className="text-gray-500 max-w-md text-sm mt-2 leading-relaxed">
                                            Selecciona una sesión de terapia clínica de la lista de la izquierda para explorar la transcripción del chat, analizar la tasa de aceptación de sugerencias de IA y examinar las ediciones del terapeuta en tiempo real.
                                        </p>
                                    </Card>
                                ) : isLoadingAnalysisDetail ? (
                                    <Card className="rounded-3xl border-0 shadow-sm bg-white/80 backdrop-blur-sm h-[750px] flex flex-col items-center justify-center p-8 text-center space-y-4">
                                        <div className="relative flex items-center justify-center">
                                            <div className="absolute w-14 h-14 border-4 border-emerald-100 rounded-full animate-ping"></div>
                                            <div className="relative p-3 bg-emerald-50 rounded-full border border-emerald-200">
                                                <Activity className="w-8 h-8 text-emerald-500 animate-spin" />
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-base">Cargando Análisis Clínico...</h4>
                                            <p className="text-xs text-gray-400 mt-1">Recuperando transcripción, logs de sugerencias de IA y métricas de edición...</p>
                                        </div>
                                    </Card>
                                ) : selectedSessionDetail ? (
                                    <div className="space-y-6">
                                        {/* Session Detail Header */}
                                        <Card className="rounded-3xl border-0 shadow-sm bg-white/80 backdrop-blur-sm overflow-hidden p-6 relative group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100/60 pb-4 mb-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1 rounded-xl text-xs font-bold tracking-wider uppercase">
                                                            Paciente: {selectedSessionDetail.patient_code}
                                                        </span>
                                                        <span className="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1 rounded-xl text-xs font-bold tracking-wider uppercase">
                                                            Terapeuta: {selectedSessionDetail.psychologist_name}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                                                        Sesión del {new Date(selectedSessionDetail.date).toLocaleDateString("es-ES", { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </h3>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        Duración: {selectedSessionDetail.duration}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Título de la Sesión</span>
                                                    <p className="text-sm font-semibold text-gray-800">
                                                        {selectedSessionDetail.description || "Sin título especificado."}
                                                    </p>
                                                </div>
                                                {selectedSessionDetail.ai_summary && (
                                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/20 border border-amber-100/70 shadow-sm mt-3 animate-in fade-in duration-300">
                                                        <div className="flex items-start gap-2.5">
                                                            <div className="bg-amber-100/80 p-1.5 rounded-xl shadow-inner shrink-0 text-amber-700">
                                                                <Sparkles className="w-4 h-4 animate-pulse" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-widest flex items-center gap-1 mb-1">
                                                                    Resumen Evolutivo de IA
                                                                </h4>
                                                                <p className="text-sm text-amber-950/80 leading-relaxed italic font-medium">
                                                                    "{selectedSessionDetail.ai_summary}"
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </Card>

                                        {/* Statistics Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {/* Clickó en IA */}
                                            <Card className="rounded-3xl border-0 shadow-sm bg-white/80 backdrop-blur-sm p-5 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-12 -mt-12"></div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">🔹 Click en IA</span>
                                                    <div className="p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </div>
                                                </div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <div className="text-3xl font-black text-emerald-600">
                                                        {selectedSessionDetail.stats.clicked_ai}
                                                    </div>
                                                    <div className="text-xs font-semibold text-gray-400">
                                                        / {selectedSessionDetail.stats.total_therapist_messages} msg ({
                                                            selectedSessionDetail.stats.total_therapist_messages > 0
                                                                ? ((selectedSessionDetail.stats.clicked_ai / selectedSessionDetail.stats.total_therapist_messages) * 100).toFixed(0)
                                                                : 0
                                                        }%)
                                                    </div>
                                                </div>
                                                <p className="text-[11px] font-semibold text-gray-500 mt-2">El terapeuta seleccionó una sugerencia de IA.</p>
                                            </Card>

                                            {/* NO clickó en IA */}
                                            <Card className="rounded-3xl border-0 shadow-sm bg-white/80 backdrop-blur-sm p-5 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-12 -mt-12"></div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">🔹 NO Click en IA</span>
                                                    <div className="p-1.5 bg-amber-50 border border-amber-100 rounded-lg text-amber-600">
                                                        <Edit3 className="w-4 h-4" />
                                                    </div>
                                                </div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <div className="text-3xl font-black text-amber-600">
                                                        {selectedSessionDetail.stats.not_clicked_ai}
                                                    </div>
                                                    <div className="text-xs font-semibold text-gray-400">
                                                        / {selectedSessionDetail.stats.total_therapist_messages} msg ({
                                                            selectedSessionDetail.stats.total_therapist_messages > 0
                                                                ? ((selectedSessionDetail.stats.not_clicked_ai / selectedSessionDetail.stats.total_therapist_messages) * 100).toFixed(0)
                                                                : 0
                                                        }%)
                                                    </div>
                                                </div>
                                                <p className="text-[11px] font-semibold text-gray-500 mt-2">El terapeuta NO utilizó sugerencia de IA.</p>
                                            </Card>

                                            {/* De los que clickó, cuántos editó */}
                                            <Card className="rounded-3xl border-0 shadow-sm bg-white/80 backdrop-blur-sm p-5 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-12 -mt-12"></div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">🔹 Editados tras Click</span>
                                                    <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                                                        <TrendingUp className="w-4 h-4" />
                                                    </div>
                                                </div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <div className="text-3xl font-black text-indigo-600">
                                                        {selectedSessionDetail.stats.edited_ai}
                                                    </div>
                                                    <div className="text-xs font-semibold text-gray-400">
                                                        / {selectedSessionDetail.stats.clicked_ai} clicks ({
                                                            selectedSessionDetail.stats.clicked_ai > 0
                                                                ? ((selectedSessionDetail.stats.edited_ai / selectedSessionDetail.stats.clicked_ai) * 100).toFixed(0)
                                                                : 0
                                                        }%)
                                                    </div>
                                                </div>
                                                <p className="text-[11px] font-semibold text-gray-500 mt-2">Sugerencias clickadas que luego fueron editadas.</p>
                                            </Card>
                                        </div>

                                        {/* Model Usage Stats */}
                                        {(selectedSessionDetail.stats.model_ranking?.length > 0 || selectedSessionDetail.stats.model_unedited_ranking?.length > 0) && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Card className="rounded-3xl border-0 shadow-sm bg-white/80 backdrop-blur-sm p-5 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/5 rounded-full blur-3xl -mr-14 -mt-14"></div>
                                                    <div className="flex justify-between items-start mb-3">
                                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">🏆 Top Modelos Elegidos</span>
                                                        <div className="p-1.5 bg-cyan-50 border border-cyan-100 rounded-lg text-cyan-600"><Bot className="w-4 h-4" /></div>
                                                    </div>
                                                    <div className="space-y-2.5">
                                                        {selectedSessionDetail.stats.model_ranking.map((entry, idx) => {
                                                            const maxCount = selectedSessionDetail.stats.model_ranking[0]?.count || 1;
                                                            const pct = (entry.count / maxCount) * 100;
                                                            return (
                                                                <div key={entry.model} className="space-y-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-md ${idx === 0 ? "bg-amber-100 text-amber-700" : idx === 1 ? "bg-gray-100 text-gray-600" : "bg-orange-50 text-orange-600"}`}>{idx + 1}</span>
                                                                            <span className="text-xs font-bold text-gray-800 truncate max-w-[200px]">{entry.model}</span>
                                                                        </div>
                                                                        <span className="text-xs font-black text-cyan-700 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-md">{entry.count}x</span>
                                                                    </div>
                                                                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                                        <div className="bg-gradient-to-r from-cyan-400 to-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </Card>

                                                <Card className="rounded-3xl border-0 shadow-sm bg-white/80 backdrop-blur-sm p-5 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-28 h-28 bg-violet-500/5 rounded-full blur-3xl -mr-14 -mt-14"></div>
                                                    <div className="flex justify-between items-start mb-3">
                                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">✅ Aceptado Sin Editar</span>
                                                        <div className="p-1.5 bg-violet-50 border border-violet-100 rounded-lg text-violet-600"><CheckCircle2 className="w-4 h-4" /></div>
                                                    </div>
                                                    <div className="space-y-2.5">
                                                        {selectedSessionDetail.stats.model_unedited_ranking.length > 0 ? selectedSessionDetail.stats.model_unedited_ranking.map((entry, idx) => {
                                                            const maxCount = selectedSessionDetail.stats.model_unedited_ranking[0]?.count || 1;
                                                            const pct = (entry.count / maxCount) * 100;
                                                            return (
                                                                <div key={entry.model} className="space-y-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-md ${idx === 0 ? "bg-emerald-100 text-emerald-700" : idx === 1 ? "bg-gray-100 text-gray-600" : "bg-orange-50 text-orange-600"}`}>{idx + 1}</span>
                                                                            <span className="text-xs font-bold text-gray-800 truncate max-w-[200px]">{entry.model}</span>
                                                                        </div>
                                                                        <span className="text-xs font-black text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-md">{entry.count}x</span>
                                                                    </div>
                                                                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                                        <div className="bg-gradient-to-r from-violet-400 to-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }) : (
                                                            <p className="text-xs text-gray-400 italic">Sin datos — todas las sugerencias fueron editadas.</p>
                                                        )}
                                                    </div>
                                                </Card>
                                            </div>
                                        )}

                                        {/* Interactive Chat Transcript & Logs */}
                                        <Card className="rounded-3xl border-0 shadow-sm bg-white/80 backdrop-blur-sm overflow-hidden flex flex-col h-[650px]">
                                            <CardHeader className="border-b border-gray-100 pb-4 shrink-0 bg-white/50">
                                                <CardTitle className="text-gray-800 text-lg font-bold flex items-center gap-2">
                                                    <MessageCircle className="w-5 h-5 text-emerald-600" />
                                                    Transcripción de Conversación y Análisis Clínico
                                                </CardTitle>
                                                <CardDescription>Muestra la conversación exacta y las alternativas de IA que tenía el terapeuta para cada turno.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/40 custom-scrollbar">
                                                {selectedSessionDetail.chat_snapshot_enriched.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-6 space-y-2">
                                                        <MessageSquare className="w-12 h-12 text-gray-300 opacity-60" />
                                                        <p className="text-sm font-medium">La sesión no registra mensajes guardados.</p>
                                                    </div>
                                                ) : (
                                                    selectedSessionDetail.chat_snapshot_enriched.map((msg, index) => {
                                                        const isPatient = msg.sender === "patient";
                                                        const hasSuggestions = !!msg.ai_suggestions;
                                                        const finalOptionId = msg.ai_suggestions?.final_option_id;
                                                        const wasClicked = hasSuggestions && finalOptionId !== null;
                                                        const wasEdited = msg.was_edited_by_human;
                                                        
                                                        // Get the original suggestion chosen
                                                        let originalText = null;
                                                        if (wasClicked && finalOptionId) {
                                                            if (finalOptionId === 1) originalText = msg.ai_suggestions?.suggestion_model1;
                                                            if (finalOptionId === 2) originalText = msg.ai_suggestions?.suggestion_model2;
                                                            if (finalOptionId === 3) originalText = msg.ai_suggestions?.suggestion_model3;
                                                        }

                                                        return (
                                                            <div
                                                                key={index}
                                                                className={`flex w-full ${isPatient ? "justify-start" : "justify-end"}`}
                                                            >
                                                                <div className={`flex gap-3.5 max-w-[90%] md:max-w-[80%] ${isPatient ? "flex-row" : "flex-row-reverse"}`}>
                                                                    {/* Avatar */}
                                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm shrink-0 border mt-1 ${
                                                                        isPatient
                                                                            ? "bg-gradient-to-br from-slate-100 to-slate-200 border-slate-300/30 text-slate-600"
                                                                            : "bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-600/20 text-white"
                                                                    }`}>
                                                                        {isPatient ? "👤" : "👨‍⚕️"}
                                                                    </div>

                                                                    {/* Bubble + Metadata */}
                                                                    <div className={`flex flex-col ${isPatient ? "items-start" : "items-end"}`}>
                                                                        <div className="flex items-center gap-2 mb-1 px-1">
                                                                            <span className="text-xs font-bold text-gray-800">
                                                                                {isPatient ? "Paciente" : "Terapeuta"}
                                                                            </span>
                                                                            <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">
                                                                                {new Date(msg.timestamp.endsWith("Z") ? msg.timestamp : msg.timestamp + "Z").toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' })}
                                                                            </span>
                                                                        </div>

                                                                        {/* Actual Chat Bubble */}
                                                                        <div
                                                                            className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap break-words border ${
                                                                                isPatient
                                                                                    ? "bg-white border-slate-200 text-slate-800 rounded-tl-sm"
                                                                                    : "bg-emerald-600 text-white border-emerald-700 rounded-tr-sm"
                                                                            }`}
                                                                        >
                                                                            <p>{msg.text}</p>
                                                                        </div>

                                                                        {/* AI Helper details shown below Therapist messages */}
                                                                        {!isPatient && (
                                                                            <div className="mt-2 w-full flex flex-col items-end gap-1.5">
                                                                                {/* Action Badges */}
                                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                                    {hasSuggestions ? (
                                                                                        <>
                                                                                            {wasClicked ? (
                                                                                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                                                                    <Bot className="w-3.5 h-3.5" />
                                                                                                    Opción {finalOptionId} IA
                                                                                                </span>
                                                                                            ) : (
                                                                                                <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                                                                    <Edit3 className="w-3.5 h-3.5" />
                                                                                                    Sugerencias IA descartadas
                                                                                                </span>
                                                                                            )}
                                                                                            {wasEdited && (
                                                                                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                                                                    ✏️ Editado por Humano
                                                                                                </span>
                                                                                            )}
                                                                                        </>
                                                                                    ) : (
                                                                                        <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                                                                            ✍️ Redacción Manual
                                                                                        </span>
                                                                                    )}
                                                                                </div>

                                                                                {/* Options Logs Section */}
                                                                                {hasSuggestions && msg.ai_suggestions && (
                                                                                    <div className="w-full max-w-lg bg-white border border-gray-100 rounded-2xl p-4 mt-1.5 text-left text-xs shadow-sm space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-1.5 border-b border-gray-50">
                                                                                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                                                                            Alternativas generadas por la IA:
                                                                                        </div>
                                                                                        {/* AI Configuration Context */}
                                                                                        {(msg.ai_suggestions.ai_style_used || msg.ai_suggestions.ai_instructions_used || msg.ai_suggestions.selected_strategy) && (
                                                                                            <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 space-y-1.5 mb-1">
                                                                                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                                                                                    <Brain className="w-3 h-3" />
                                                                                                    Contexto de IA utilizado
                                                                                                </div>
                                                                                                {msg.ai_suggestions.ai_style_used && (
                                                                                                    <div className="flex items-center gap-1.5">
                                                                                                        <span className="text-[9px] font-bold text-gray-400 uppercase w-12 shrink-0">Estilo:</span>
                                                                                                        <span className="text-[10px] font-semibold text-gray-700 bg-white px-2 py-0.5 rounded-md border border-gray-100">{msg.ai_suggestions.ai_style_used}</span>
                                                                                                    </div>
                                                                                                )}
                                                                                                {msg.ai_suggestions.ai_tone_used && (
                                                                                                    <div className="flex items-center gap-1.5">
                                                                                                        <span className="text-[9px] font-bold text-gray-400 uppercase w-12 shrink-0">Tono:</span>
                                                                                                        <span className="text-[10px] font-semibold text-gray-700 bg-white px-2 py-0.5 rounded-md border border-gray-100">{msg.ai_suggestions.ai_tone_used}</span>
                                                                                                    </div>
                                                                                                )}
                                                                                                {msg.ai_suggestions.selected_strategy && (
                                                                                                    <div className="flex items-start gap-1.5">
                                                                                                        <span className="text-[9px] font-bold text-gray-400 uppercase w-12 shrink-0 mt-0.5">Táctica:</span>
                                                                                                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{msg.ai_suggestions.selected_strategy}</span>
                                                                                                    </div>
                                                                                                )}
                                                                                                {msg.ai_suggestions.ai_instructions_used && (
                                                                                                    <details className="group mt-1">
                                                                                                        <summary className="text-[9px] font-bold text-blue-500 cursor-pointer hover:text-blue-700 transition-colors flex items-center gap-1">
                                                                                                            <FileText className="w-3 h-3" />
                                                                                                            Ver instrucciones completas de IA
                                                                                                        </summary>
                                                                                                        <div className="mt-1.5 p-2 bg-white rounded-lg border border-blue-100 text-[10px] text-gray-600 leading-relaxed whitespace-pre-wrap max-h-[120px] overflow-y-auto custom-scrollbar">
                                                                                                            {msg.ai_suggestions.ai_instructions_used}
                                                                                                        </div>
                                                                                                    </details>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                        <div className="grid grid-cols-1 gap-2">
                                                                                            {/* Option 1 */}
                                                                                            <div className={`p-2.5 rounded-xl border transition-all ${
                                                                                                finalOptionId === 1
                                                                                                    ? "bg-emerald-50/30 border-emerald-300 ring-1 ring-emerald-300/20"
                                                                                                    : "bg-slate-50/40 border-gray-100/70"
                                                                                            }`}>
                                                                                                <div className="flex items-center justify-between mb-1">
                                                                                                    <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded-md ${
                                                                                                        finalOptionId === 1 ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"
                                                                                                    }`}>
                                                                                                        Sugerencia 1{msg.ai_suggestions.models_used?.[0] ? ` — ${msg.ai_suggestions.models_used[0]}` : ""} {finalOptionId === 1 && "✓ (Elegida)"}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <p className="text-gray-700 leading-relaxed font-medium">{msg.ai_suggestions.suggestion_model1}</p>
                                                                                            </div>

                                                                                            {/* Option 2 */}
                                                                                            <div className={`p-2.5 rounded-xl border transition-all ${
                                                                                                finalOptionId === 2
                                                                                                    ? "bg-emerald-50/30 border-emerald-300 ring-1 ring-emerald-300/20"
                                                                                                    : "bg-slate-50/40 border-gray-100/70"
                                                                                            }`}>
                                                                                                <div className="flex items-center justify-between mb-1">
                                                                                                    <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded-md ${
                                                                                                        finalOptionId === 2 ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"
                                                                                                    }`}>
                                                                                                        Sugerencia 2{msg.ai_suggestions.models_used?.[1] ? ` — ${msg.ai_suggestions.models_used[1]}` : ""} {finalOptionId === 2 && "✓ (Elegida)"}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <p className="text-gray-700 leading-relaxed font-medium">{msg.ai_suggestions.suggestion_model2}</p>
                                                                                            </div>

                                                                                            {/* Option 3 */}
                                                                                            <div className={`p-2.5 rounded-xl border transition-all ${
                                                                                                finalOptionId === 3
                                                                                                    ? "bg-emerald-50/30 border-emerald-300 ring-1 ring-emerald-300/20"
                                                                                                    : "bg-slate-50/40 border-gray-100/70"
                                                                                            }`}>
                                                                                                <div className="flex items-center justify-between mb-1">
                                                                                                    <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded-md ${
                                                                                                        finalOptionId === 3 ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"
                                                                                                    }`}>
                                                                                                        Sugerencia 3{msg.ai_suggestions.models_used?.[2] ? ` — ${msg.ai_suggestions.models_used[2]}` : ""} {finalOptionId === 3 && "✓ (Elegida)"}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <p className="text-gray-700 leading-relaxed font-medium">{msg.ai_suggestions.suggestion_model3}</p>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Show edit comparison if was edited */}
                                                                                        {wasEdited && wasClicked && originalText && (
                                                                                            <div className="p-3 bg-amber-50/30 border border-amber-200/50 rounded-xl space-y-1.5 mt-2 animate-in fade-in zoom-in-95 duration-200">
                                                                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-800 uppercase tracking-widest">
                                                                                                    <Edit3 className="w-3.5 h-3.5" />
                                                                                                    Comparación de edición clínica
                                                                                                </div>
                                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                                                                                    <div className="bg-white p-2 rounded-lg border border-red-100">
                                                                                                        <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Sugerencia Original de IA:</span>
                                                                                                        <p className="text-gray-600 line-through leading-relaxed whitespace-pre-wrap">{originalText}</p>
                                                                                                    </div>
                                                                                                    <div className="bg-white p-2 rounded-lg border border-emerald-100">
                                                                                                        <span className="text-[9px] font-bold text-emerald-700 uppercase block mb-1">Mensaje Enviado por Terapeuta:</span>
                                                                                                        <p className="text-emerald-950 font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
