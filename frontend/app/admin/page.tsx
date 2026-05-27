"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { createPsychologist, getPsychologists, getPatients, assignPatientToPsychologist, deletePsychologist, type Psychologist, type Patient } from "@/lib/api"
import { Loader2, Plus, UserCog, Trash2, Clock, RefreshCcw, Shield, Check, ChevronsUpDown, User, ArrowRight, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

export default function AdminPage() {
    const router = useRouter()
    const [psychologists, setPsychologists] = useState<Psychologist[]>([])
    const [patients, setPatients] = useState<Patient[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isAuthorized, setIsAuthorized] = useState(false)

    // Form States
    const [newPsychName, setNewPsychName] = useState("")
    const [newPsychEmail, setNewPsychEmail] = useState("")
    const [selectedPatientId, setSelectedPatientId] = useState<string>("")
    const [selectedPsychId, setSelectedPsychId] = useState<string>("")
    const [assigning, setAssigning] = useState(false)

    // Search States
    const [searchPsychologist, setSearchPsychologist] = useState("")
    const [searchPatient, setSearchPatient] = useState("")

    const [openPatientCombobox, setOpenPatientCombobox] = useState(false)
    const [openPsychCombobox, setOpenPsychCombobox] = useState(false)

    const [expandedPsychs, setExpandedPsychs] = useState<string[]>([])

    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false)
    const [reassignPatient, setReassignPatient] = useState<Patient | null>(null)
    const [reassigning, setReassigning] = useState(false)

    const togglePsychRow = (psychId: string) => {
        setExpandedPsychs(prev => 
            prev.includes(psychId) ? prev.filter(id => id !== psychId) : [...prev, psychId]
        )
    }

    const [sortField, setSortField] = useState<'name' | 'role' | 'totalOnlineSeconds' | 'lastActive' | 'patientsCount' | null>(null)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null)

    const handleSort = (field: 'name' | 'role' | 'totalOnlineSeconds' | 'lastActive' | 'patientsCount') => {
        if (sortField === field) {
            if (sortDirection === 'asc') {
                setSortDirection('desc')
            } else if (sortDirection === 'desc') {
                setSortField(null)
                setSortDirection(null)
            }
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    const renderSortIcon = (field: 'name' | 'role' | 'totalOnlineSeconds' | 'lastActive' | 'patientsCount') => {
        if (sortField !== field) {
            return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 opacity-40 hover:opacity-100 transition-opacity" />;
        }
        if (sortDirection === 'asc') {
            return <ArrowUp className="w-3.5 h-3.5 text-calm-teal animate-fade-in" />;
        }
        return <ArrowDown className="w-3.5 h-3.5 text-calm-teal animate-fade-in" />;
    }

    const filteredPsychologists = psychologists.filter(psych => 
        psych.name.toLowerCase().includes(searchPsychologist.toLowerCase()) || 
        psych.email.toLowerCase().includes(searchPsychologist.toLowerCase())
    )

    const sortedPsychologists = [...filteredPsychologists].sort((a, b) => {
        if (!sortField || !sortDirection) return 0;
        
        let valA: any;
        let valB: any;

        if (sortField === 'name') {
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
        } else if (sortField === 'role') {
            valA = (a.role || '').toLowerCase();
            valB = (b.role || '').toLowerCase();
        } else if (sortField === 'totalOnlineSeconds') {
            valA = a.totalOnlineSeconds || 0;
            valB = b.totalOnlineSeconds || 0;
        } else if (sortField === 'lastActive') {
            valA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
            valB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        } else if (sortField === 'patientsCount') {
            valA = patients.filter(p => p.psychologistId === a.id).length;
            valB = patients.filter(p => p.psychologistId === b.id).length;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    })

    const filteredPatients = patients.filter(patient => 
        patient.patientCode.toLowerCase().includes(searchPatient.toLowerCase()) || 
        (patient.psychologistName && patient.psychologistName.toLowerCase().includes(searchPatient.toLowerCase()))
    )

    // Memoized fetch function to reuse in useEffect and manual refreshes
    const fetchData = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true)
        try {
            const [psychs, pats] = await Promise.all([
                getPsychologists(),
                getPatients()
            ])
            setPsychologists(psychs)
            setPatients(pats.filter(p => !p.is_ia_patient))
        } catch (error) {
            console.error("Error fetching admin data:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        const userStr = localStorage.getItem("user")
        if (!userStr) {
            router.push("/login")
            return
        }

        try {
            const user = JSON.parse(userStr)
            if (user.role !== "admin") {
                router.push("/dashboard")
                return
            }
            setIsAuthorized(true)
            fetchData()
        } catch {
            router.push("/login")
        }

        // Optional: Auto-refresh data every 60 seconds to update "Time Online"
        const interval = setInterval(() => fetchData(false), 60000)
        return () => clearInterval(interval)
    }, [router, fetchData])

    const handleCreatePsychologist = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        try {
            const newPsych = await createPsychologist(newPsychName, newPsychEmail)
            if (newPsych) {
                setPsychologists(prev => [...prev, newPsych])
                setNewPsychName("")
                setNewPsychEmail("")
                setIsCreateModalOpen(false)
                alert(`Psicólogo creado exitosamente. Se han enviado las credenciales de acceso a su correo electrónico.`)
            } else {
                alert("Error al crear psicólogo")
            }
        } catch (error) {
            alert("Error al crear psicólogo. El email podría estar duplicado.")
        } finally {
            setCreating(false)
        }
    }

    const handleDeletePsychologist = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar a ${name}? Los pacientes asociados quedarán sin asignar.`)) return
        try {
            const success = await deletePsychologist(id)
            if (success) {
                // Optimistic UI update + fetch fresh data to see unassigned patients
                setPsychologists(prev => prev.filter(p => p.id !== id))
                await fetchData(false)
            }
        } catch (error) {
            alert("Error al eliminar el psicólogo.")
        }
    }

    const handleAssign = async () => {
        if (!selectedPatientId || !selectedPsychId) return
        setAssigning(true)
        try {
            const success = await assignPatientToPsychologist(selectedPatientId, selectedPsychId)
            if (success) {
                await fetchData(false) // Refresh all data to ensure sync
                setSelectedPatientId("")
                setSelectedPsychId("")
                alert("Paciente asignado correctamente")
            }
        } catch (error) {
            alert("Error en la asignación")
        } finally {
            setAssigning(false)
        }
    }

    const handleReassignClick = (patient: Patient) => {
        setReassignPatient(patient)
        setIsReassignModalOpen(true)
    }

    const handleReassignSubmit = async (psychologistId: string) => {
        if (!reassignPatient) return
        setReassigning(true)
        try {
            const success = await assignPatientToPsychologist(reassignPatient.id, psychologistId)
            if (success) {
                await fetchData(false) // Refresh all data to ensure sync
                setIsReassignModalOpen(false)
                setReassignPatient(null)
                alert("Paciente reasignado correctamente")
            }
        } catch (error) {
            alert("Error en la reasignación")
        } finally {
            setReassigning(false)
        }
    }

    const formatTime = (seconds?: number) => {
        if (!seconds || seconds === 0) return "0m"
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        return h > 0 ? `${h}h ${m}m` : `${m}m`
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return "Nunca"
        const formatted = formatDistanceToNow(new Date(dateString.endsWith("Z") ? dateString : dateString + "Z"), {
            addSuffix: true,
            locale: es,
        }).replace("alrededor de ", "").replace("más de ", "").replace("menos de ", "")
        return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase()
    }

    if (loading || !isAuthorized) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-calm-teal" />
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-charcoal text-balance flex items-center gap-3 mb-2">
                            <Shield className="h-8 w-8 text-calm-teal" />
                            Administración del Sistema
                        </h1>
                        <p className="text-muted-foreground mt-2">Gestiona el equipo profesional y la carga de pacientes.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fetchData(true)} className="rounded-xl">
                        <RefreshCcw className="h-4 w-4 mr-2" /> Actualizar Datos
                    </Button>
                </div>

                {/* Psychologists Section */}
                <Card className="rounded-2xl border-soft-gray shadow-soft">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-xl font-semibold">Psicólogos</CardTitle>
                            <CardDescription>Equipo profesional registrado en la plataforma</CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                            <Input
                                placeholder="Buscar psicólogo..."
                                value={searchPsychologist}
                                onChange={(e) => setSearchPsychologist(e.target.value)}
                                className="w-64 rounded-xl h-9"
                            />
                            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="bg-calm-teal hover:bg-calm-teal/90 rounded-xl">
                                        <Plus className="h-4 w-4 mr-2" /> Añadir Psicólogo
                                    </Button>
                                </DialogTrigger>
                            <DialogContent className="rounded-2xl sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Registrar Nuevo Psicólogo</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreatePsychologist} className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label>Nombre Completo</Label>
                                        <Input
                                            value={newPsychName}
                                            onChange={(e) => setNewPsychName(e.target.value)}
                                            placeholder="Ej: Dr. Alex Smith"
                                            required
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Correo Electrónico Institucional</Label>
                                        <Input
                                            type="email"
                                            value={newPsychEmail}
                                            onChange={(e) => setNewPsychEmail(e.target.value)}
                                            placeholder="usuario@dominio.com"
                                            required
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-800 border border-amber-100">
                                        La contraseña temporal se generará automáticamente.
                                    </div>
                                    <Button type="submit" className="w-full rounded-xl bg-calm-teal hover:bg-calm-teal/90" disabled={creating}>
                                        {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Crear Cuenta"}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-xl border border-gray-100 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                                    <tr>
                                        <th 
                                            className="px-4 py-3 cursor-pointer select-none hover:bg-gray-100 hover:text-neutral-charcoal transition-colors rounded-tl-xl"
                                            onClick={() => handleSort('name')}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Psicólogo {renderSortIcon('name')}
                                            </div>
                                        </th>
                                        <th 
                                            className="px-4 py-3 cursor-pointer select-none hover:bg-gray-100 hover:text-neutral-charcoal transition-colors"
                                            onClick={() => handleSort('role')}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Rol {renderSortIcon('role')}
                                            </div>
                                        </th>
                                        <th 
                                            className="px-4 py-3 cursor-pointer select-none hover:bg-gray-100 hover:text-neutral-charcoal transition-colors"
                                            onClick={() => handleSort('totalOnlineSeconds')}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Tiempo Online {renderSortIcon('totalOnlineSeconds')}
                                            </div>
                                        </th>
                                        <th 
                                            className="px-4 py-3 cursor-pointer select-none hover:bg-gray-100 hover:text-neutral-charcoal transition-colors"
                                            onClick={() => handleSort('lastActive')}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Última Conexión {renderSortIcon('lastActive')}
                                            </div>
                                        </th>
                                        <th 
                                            className="px-4 py-3 cursor-pointer select-none hover:bg-gray-100 hover:text-neutral-charcoal transition-colors"
                                            onClick={() => handleSort('patientsCount')}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Pacientes {renderSortIcon('patientsCount')}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-right rounded-tr-xl">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {sortedPsychologists.map(psych => (
                                        <Fragment key={psych.id}>
                                            <tr className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-calm-teal/10 flex items-center justify-center text-calm-teal font-bold text-xs uppercase">
                                                            {psych.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-neutral-charcoal">{psych.name}</p>
                                                            <p className="text-xs text-muted-foreground">{psych.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    <span className="text-[11px] px-2 py-1 bg-calm-teal/5 text-calm-teal border border-calm-teal/20 rounded-md font-medium">
                                                        {psych.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-calm-teal" />
                                                        {formatTime(psych.totalOnlineSeconds)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {formatDate(psych.lastActive)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-7 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200"
                                                        onClick={() => togglePsychRow(psych.id)}
                                                    >
                                                        {patients.filter(p => p.psychologistId === psych.id).length} asignados
                                                        <ChevronsUpDown className={cn("ml-1 h-3 w-3 transition-transform", expandedPsychs.includes(psych.id) && "rotate-180")} />
                                                    </Button>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {psych.role !== 'admin' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleDeletePsychologist(psych.id, psych.name)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                            {expandedPsychs.includes(psych.id) && (
                                                <tr className="bg-gray-50/50">
                                                    <td colSpan={6} className="p-0 border-b border-gray-100">
                                                        <div className="px-6 py-4 bg-gray-50/80 shadow-inner">
                                                            <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Pacientes de {psych.name}</h4>
                                                            {patients.filter(p => p.psychologistId === psych.id).length === 0 ? (
                                                                <p className="text-sm text-gray-400">No hay pacientes asignados.</p>
                                                            ) : (
                                                                <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                                                                    <table className="w-full text-sm text-left">
                                                                        <thead className="bg-gray-50 text-gray-500 font-medium">
                                                                            <tr>
                                                                                <th className="px-4 py-3">Código</th>
                                                                                <th className="px-4 py-3">Tiempo Online</th>
                                                                                <th className="px-4 py-3">Última Conexión</th>
                                                                                <th className="px-4 py-3 text-right">Acción</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-100">
                                                                            {patients.filter(p => p.psychologistId === psych.id).map(patient => (
                                                                                <tr key={patient.id} className="hover:bg-gray-50/50">
                                                                                    <td className="px-4 py-3 font-medium">{patient.patientCode}</td>
                                                                                    <td className="px-4 py-3">
                                                                                        <div className="flex items-center gap-1.5 text-gray-600">
                                                                                            <Clock className="w-3.5 h-3.5 text-calm-teal" />
                                                                                            {formatTime(patient.totalOnlineSeconds)}
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-muted-foreground">
                                                                                        {formatDate(patient.lastActive)}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-right">
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            className="h-7 px-2 text-calm-teal hover:text-calm-teal/80 hover:bg-calm-teal/5 font-medium rounded-lg text-xs"
                                                                                            onClick={() => handleReassignClick(patient)}
                                                                                        >
                                                                                            <UserCog className="h-3.5 w-3.5 mr-1" /> Reasignar
                                                                                        </Button>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Patient Management */}
                <div className="grid md:grid-cols-3 gap-6">
                    <Card id="quick-assignment-card" className="rounded-2xl border-soft-gray shadow-soft md:col-span-1 h-fit">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">Asignación Rápida</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 flex flex-col">
                                <Label>Paciente</Label>
                                <Popover open={openPatientCombobox} onOpenChange={setOpenPatientCombobox}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openPatientCombobox}
                                            className="w-full justify-between bg-white rounded-xl font-normal"
                                        >
                                            {selectedPatientId
                                                ? patients.find((p) => p.id === selectedPatientId)?.patientCode
                                                : "Seleccionar paciente..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0 rounded-xl" align="start">
                                        <Command>
                                            <CommandInput placeholder="Buscar paciente..." />
                                            <CommandList>
                                                <CommandEmpty>No se encontraron pacientes.</CommandEmpty>
                                                <CommandGroup heading="Sin Asignar">
                                                    {patients.filter(p => !p.psychologistId || p.psychologistId === "NuN").map(p => (
                                                        <CommandItem
                                                            key={p.id}
                                                            value={p.patientCode}
                                                            onSelect={() => {
                                                                setSelectedPatientId(p.id)
                                                                setSelectedPsychId("")
                                                                setOpenPatientCombobox(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedPatientId === p.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {p.patientCode}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                                <CommandGroup heading="Ya Asignados">
                                                    {patients.filter(p => p.psychologistId && p.psychologistId !== "NuN").map(p => (
                                                        <CommandItem
                                                            key={p.id}
                                                            value={`${p.patientCode} ${p.psychologistName || ''}`}
                                                            onSelect={() => {
                                                                setSelectedPatientId(p.id)
                                                                if (p.psychologistId && p.psychologistId !== "NuN") {
                                                                    setSelectedPsychId(p.psychologistId)
                                                                } else {
                                                                    setSelectedPsychId("")
                                                                }
                                                                setOpenPatientCombobox(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedPatientId === p.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {p.patientCode} <span className="ml-1 text-muted-foreground">({p.psychologistName || 'Asignado'})</span>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2 flex flex-col">
                                <Label>Psicólogo Destino</Label>
                                <Popover open={openPsychCombobox} onOpenChange={setOpenPsychCombobox}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openPsychCombobox}
                                            className="w-full justify-between bg-white rounded-xl font-normal"
                                        >
                                            {selectedPsychId
                                                ? psychologists.find((p) => p.id === selectedPsychId)?.name
                                                : "Seleccionar psicólogo..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0 rounded-xl" align="start">
                                        <Command>
                                            <CommandInput placeholder="Buscar psicólogo..." />
                                            <CommandList>
                                                <CommandEmpty>No se encontraron psicólogos.</CommandEmpty>
                                                <CommandGroup>
                                                    {psychologists.map(p => {
                                                        const selectedPatient = patients.find(pat => pat.id === selectedPatientId);
                                                        const isCurrent = selectedPatient?.psychologistId === p.id;
                                                        const assignedCount = patients.filter(pat => pat.psychologistId === p.id).length;
                                                        return (
                                                            <CommandItem
                                                                key={p.id}
                                                                value={p.name}
                                                                onSelect={() => {
                                                                    setSelectedPsychId(p.id)
                                                                    setOpenPsychCombobox(false)
                                                                }}
                                                                className="flex items-center justify-between p-2 hover:bg-calm-teal/5 data-[selected=true]:bg-calm-teal/5 hover:text-calm-teal data-[selected=true]:text-calm-teal rounded-lg cursor-pointer transition-colors bg-white"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <Check
                                                                        className={cn(
                                                                            "h-4 w-4 shrink-0 text-calm-teal",
                                                                            selectedPsychId === p.id ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <span className="font-medium text-sm text-neutral-charcoal">{p.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                                                                        {assignedCount} {assignedCount === 1 ? 'asig.' : 'asig.'}
                                                                    </span>
                                                                    {isCurrent && (
                                                                        <span className="text-[10px] px-1.5 py-0.5 bg-calm-teal/10 text-calm-teal rounded-full font-semibold">
                                                                            Actual
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </CommandItem>
                                                        );
                                                    })}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <Button
                                onClick={handleAssign}
                                className="w-full rounded-xl bg-calm-teal hover:bg-calm-teal/90"
                                disabled={assigning || !selectedPatientId || !selectedPsychId}
                            >
                                {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCog className="h-4 w-4 mr-2" />}
                                Confirmar Asignación
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-soft-gray shadow-soft md:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-semibold">Listado de Pacientes</CardTitle>
                            <Input
                                placeholder="Buscar paciente o terapeuta..."
                                value={searchPatient}
                                onChange={(e) => setSearchPatient(e.target.value)}
                                className="w-64 rounded-xl h-9"
                            />
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-xl border border-gray-100 overflow-hidden max-h-[400px] overflow-y-auto relative">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3">Código</th>
                                            <th className="px-4 py-3">Tiempo Online</th>
                                            <th className="px-4 py-3">Última Conexión</th>
                                            <th className="px-4 py-3">Estado Asignación</th>
                                            <th className="px-4 py-3 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredPatients.map(patient => (
                                            <tr key={patient.id} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-3 font-medium">{patient.patientCode}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5 text-gray-600">
                                                        <Clock className="w-3.5 h-3.5 text-calm-teal" />
                                                        {formatTime(patient.totalOnlineSeconds)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {formatDate(patient.lastActive)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {patient.psychologistName ? (
                                                        <span className="text-[11px] px-2 py-1 bg-calm-teal/5 text-calm-teal border border-calm-teal/20 rounded-md font-medium">
                                                            {patient.psychologistName}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] px-2 py-1 bg-red-50 text-red-600 border border-red-100 rounded-md font-medium">
                                                            Sin asignar
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-calm-teal hover:text-calm-teal/80 hover:bg-calm-teal/5 font-medium rounded-lg text-xs"
                                                        onClick={() => handleReassignClick(patient)}
                                                    >
                                                        <UserCog className="h-3.5 w-3.5 mr-1" /> Reasignar
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isReassignModalOpen} onOpenChange={setIsReassignModalOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md p-6 bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">Reasignar Paciente</DialogTitle>
                    </DialogHeader>
                    {reassignPatient && (
                        <div className="space-y-4 mt-2">
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Paciente Seleccionado</span>
                                <span className="text-sm font-semibold text-neutral-charcoal">{reassignPatient.patientCode}</span>
                                {reassignPatient.psychologistName && (
                                    <span className="text-xs text-muted-foreground mt-1">
                                        Terapeuta actual: <strong className="text-gray-700">{reassignPatient.psychologistName}</strong>
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-gray-500 uppercase">Selecciona Nuevo Terapeuta</Label>
                                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                    <Command className="h-[300px] bg-white">
                                        <CommandInput placeholder="Buscar psicólogo..." className="h-10 border-0 focus:ring-0" />
                                        <CommandList className="max-h-[250px] overflow-y-auto">
                                            <CommandEmpty>No se encontraron psicólogos.</CommandEmpty>
                                            <CommandGroup>
                                                {psychologists.map(psych => {
                                                    const assignedCount = patients.filter(p => p.psychologistId === psych.id).length;
                                                    const isCurrent = reassignPatient.psychologistId === psych.id;
                                                    return (
                                                        <CommandItem
                                                            key={psych.id}
                                                            value={psych.name}
                                                            onSelect={() => {
                                                                if (!isCurrent) {
                                                                    handleReassignSubmit(psych.id)
                                                                }
                                                            }}
                                                            className={`flex items-center justify-between p-3 my-1 border border-transparent rounded-xl transition-all duration-200 group bg-white shadow-sm ${
                                                                isCurrent
                                                                    ? "opacity-50 cursor-not-allowed bg-gray-50/50 border-gray-100"
                                                                    : "cursor-pointer hover:border-calm-teal/20 data-[selected=true]:bg-calm-teal/5 data-[selected=true]:border-calm-teal/20"
                                                            }`}
                                                            disabled={reassigning || isCurrent}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-9 w-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-calm-teal/10 group-hover:text-calm-teal transition-colors duration-200">
                                                                    <User className="h-4 w-4" />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold text-sm text-neutral-charcoal">{psych.name}</span>
                                                                    <span className="text-xs text-muted-foreground">{psych.email}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[11px] px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                                                                    {assignedCount} {assignedCount === 1 ? 'asignado' : 'asignados'}
                                                                </span>
                                                                {isCurrent ? (
                                                                    <span className="text-[10px] px-2 py-0.5 bg-calm-teal/10 text-calm-teal rounded-full font-semibold">
                                                                        Actual
                                                                    </span>
                                                                ) : (
                                                                    <ArrowRight className="h-4 w-4 text-calm-teal opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-data-[selected=true]:opacity-100 group-data-[selected=true]:translate-x-0 transition-all duration-200" />
                                                                )}
                                                            </div>
                                                        </CommandItem>
                                                    );
                                                })}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    )
}