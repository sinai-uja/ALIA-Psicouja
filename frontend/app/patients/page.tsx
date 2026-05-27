"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Plus, Edit, Trash2, Eye, Copy, Link, ExternalLink, Users, MessageSquare, ClipboardList, Bot, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { CreatePatientModal } from "@/components/create-patient-modal"
import { EditCodeModal } from "@/components/edit-code-modal"
import { useLanguage } from "@/contexts/language-context"

import { type Patient } from "@/lib/api"
import * as api from "@/lib/api"

export default function PatientsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])

  const patientAppUrl = process.env.NEXT_PUBLIC_PATIENT_APP_URL || "https://patient.yourdomain.com/";
  
  const [isEditCodeModalOpen, setIsEditCodeModalOpen] = useState(false)
  const [selectedPatientForCodeEdit, setSelectedPatientForCodeEdit] = useState<Patient | null>(null)
  const [isResettingIa, setIsResettingIa] = useState(false)

  const [sortField, setSortField] = useState<'patientCode' | 'lastActive' | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const loadPatients = async () => {
    const role = localStorage.getItem("userRole")
    const id = localStorage.getItem("userId")
    // Always pass ID to scope patients to the user (admin or psychologist)
    const filterId = id ? id : undefined
    const data = await api.getPatients(filterId)
    setPatients(data)
  }

  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated")
    if (!auth) {
      router.push("/login")
    } else {
      setIsAuthenticated(true)
      const initializePage = async () => {
        const userId = localStorage.getItem("userId")
        const hasIaCache = localStorage.getItem("has_ia_patient")
        
        try {
          // 1. Ensure IA patient exists for this psychologist (only if not in cache)
          if (!hasIaCache) {
            const iaPatient = await api.ensureIaPatient()
            if (iaPatient) {
              localStorage.setItem("has_ia_patient", "true")
            }
          }
          // 2. Load the full list
          await loadPatients()
        } catch (err) {
          console.error("Error during initialization:", err)
          loadPatients()
        }
      }

      initializePage()

      const interval = setInterval(loadPatients, 10000)
      return () => clearInterval(interval)
    }
  }, [router])

  const handleDelete = async (id: string) => {
    if (confirm(t("confirmDeletePatient"))) {
      const success = await api.deletePatient(id)
      if (success) {
        setPatients(patients.filter((p) => p.id !== id))
      } else {
        alert("Error al eliminar el paciente")
      }
    }
  }

  const handleEditCode = (patient: Patient) => {
    setSelectedPatientForCodeEdit(patient);
    setIsEditCodeModalOpen(true);
  }

  const handleUpdatePatientCode = (patientId: string, updatedCode: string) => {
    setPatients(patients.map(p => p.id === patientId ? { ...p, patientCode: updatedCode, name: updatedCode } : p));
  }

  const handleCreatePatient = (newPatient: Patient) => {
    setPatients([...patients, newPatient])
  }

  const realPatients = patients.filter(p => !p.is_ia_patient)
  const iaPatient = patients.find(p => p.is_ia_patient)

  const filteredPatients = realPatients.filter(
    (p) =>
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleSort = (field: 'patientCode' | 'lastActive') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const getActiveTimestamp = (patient: Patient) => {
    if (patient.isOnline) return Infinity
    if (!patient.lastActive) return 0
    try {
      const dateStr = patient.lastActive.endsWith("Z") ? patient.lastActive : patient.lastActive + "Z"
      return new Date(dateStr).getTime()
    } catch (e) {
      return 0
    }
  }

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    if (!sortField) return 0

    if (sortField === 'patientCode') {
      const comparison = a.patientCode.localeCompare(b.patientCode, undefined, { numeric: true, sensitivity: 'base' })
      return sortOrder === 'asc' ? comparison : -comparison
    }

    if (sortField === 'lastActive') {
      const tA = getActiveTimestamp(a)
      const tB = getActiveTimestamp(b)
      if (tA === tB) return 0
      return sortOrder === 'asc' ? tA - tB : tB - tA
    }

    return 0
  })

  if (!isAuthenticated) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-charcoal flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-calm-teal" />
              {t("patientManagement")}
            </h1>
            <p className="text-muted-foreground">{t("patientManagementDesc")}</p>
          </div>

        </div>

        <Card className="rounded-2xl border-soft-gray shadow-soft bg-calm-teal/5 border-calm-teal/20">
          <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-calm-teal/15">
                <Link className="h-4 w-4 text-calm-teal" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-charcoal">{t("patientAppLink")}</p>
                <a
                  href={patientAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-calm-teal hover:underline flex items-center gap-1"
                >
                  {patientAppUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-calm-teal/30 text-calm-teal hover:bg-calm-teal/10"
              onClick={() => {
                navigator.clipboard.writeText(patientAppUrl)
                alert(t("linkCopied"))
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              {t("copyLink")}
            </Button>
          </CardContent>
        </Card>

        {iaPatient && (
          <Card className="rounded-2xl border-calm-teal/20 shadow-sm bg-calm-teal/5 overflow-hidden group hover:shadow-md transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-calm-teal flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="text-lg font-bold text-neutral-charcoal">Simulador de Paciente IA</h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-calm-teal/10 text-calm-teal border border-calm-teal/20 tracking-wide uppercase">
                      Práctica y Configuración
                    </span>
                  </div>
                  <p className="text-neutral-charcoal/70 text-sm line-clamp-1">
                    Usa este entorno para practicar tus habilidades y configurar la personalidad del paciente ficticio.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline"
                    onClick={async (e) => {
                      e.stopPropagation()

                      setIsResettingIa(true)
                      try {
                        const ok = await api.resetIaPatient(iaPatient.id)
                        if (ok) {
                          alert("Simulador IA reseteado correctamente")
                          loadPatients()
                        } else {
                          alert("Error al resetear el simulador")
                        }
                      } catch (err) {
                        console.error(err)
                      } finally {
                        setIsResettingIa(false)
                      }
                    }}
                    disabled={isResettingIa}
                    className="rounded-xl border-calm-teal/30 text-calm-teal hover:bg-calm-teal/10 font-semibold h-10 px-4 transition-all"
                  >
                    {isResettingIa ? (
                      <div className="h-4 w-4 border-2 border-calm-teal/30 border-t-calm-teal rounded-full animate-spin" />
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reiniciar Paciente
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => router.push(`/patients/${iaPatient.id}/statistics`)}
                    className="rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-sm font-semibold h-10 px-6 transition-all"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Abrir Simulador
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-2xl border-soft-gray shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder={t("searchPatients")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-soft-gray"
                />
              </div>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md shrink-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("createNewPatient")}
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-soft-gray">

                    <th 
                      onClick={() => handleSort('patientCode')}
                      className="text-left py-4 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-neutral-charcoal select-none group"
                    >
                      <div className="flex items-center gap-1.5">
                        {t("patientCode")}
                        {sortField === 'patientCode' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="h-4 w-4 text-calm-teal" />
                          ) : (
                            <ArrowDown className="h-4 w-4 text-calm-teal" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                        )}
                      </div>
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">{t("accessCode")}</th>
                    <th 
                      onClick={() => handleSort('lastActive')}
                      className="text-left py-4 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-neutral-charcoal select-none group"
                    >
                      <div className="flex items-center gap-1.5">
                        {t("lastContact")}
                        {sortField === 'lastActive' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="h-4 w-4 text-calm-teal" />
                          ) : (
                            <ArrowDown className="h-4 w-4 text-calm-teal" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                        )}
                      </div>
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">{t("notifications")}</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-muted-foreground">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      onClick={() => router.push(`/patients/${patient.id}/statistics`)}
                      className="border-b border-soft-gray last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-4 font-medium text-neutral-charcoal">
                        <span>{patient.patientCode}</span>
                      </td>
                      <td className="py-4 px-4 text-neutral-charcoal">
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-soft-gray px-2 py-1 rounded text-xs">••••••</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-calm-teal/10 hover:text-calm-teal"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigator.clipboard.writeText(patient.access_code)
                              alert("Código copiado: " + patient.access_code)
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {patient.isOnline ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            {t("online")}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {patient.lastActive ? (val => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase())(
                              formatDistanceToNow(new Date(patient.lastActive.endsWith("Z") ? patient.lastActive : patient.lastActive + "Z"), {
                                addSuffix: true,
                                locale: es,
                              }).replace("alrededor de ", "").replace("más de ", "").replace("menos de ", "")
                            ) : "Nunca"}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-neutral-charcoal">
                        <div className="flex items-center gap-3">
                          {patient.unreadMessages > 0 && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/patients/${patient.id}/statistics?openChat=true`);
                              }}
                              className="relative cursor-pointer hover:scale-110 transition-transform"
                              title={t("unreadMessages")}
                            >
                              <MessageSquare className="h-5 w-5 text-calm-teal" />
                              <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-soft-coral text-[10px] font-bold text-white shadow-sm">
                                {patient.unreadMessages}
                              </span>
                            </div>
                          )}
                          {patient.unreadQuestionnaires > 0 && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/patients/${patient.id}/statistics?tab=questionnaires`)
                              }}
                              className="relative cursor-pointer hover:scale-110 transition-transform"
                              title={t("questionnaires")}
                            >
                              <ClipboardList className="h-5 w-5 text-calm-teal" />
                              <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-soft-coral text-[10px] font-bold text-white shadow-sm">
                                {patient.unreadQuestionnaires}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/patients/${patient.id}/statistics`)
                            }}
                            className="h-9 w-9 p-0 rounded-lg hover:bg-calm-teal/10 hover:text-calm-teal"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!patient.is_ia_patient && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditCode(patient)
                                }}
                                className="h-9 w-9 p-0 rounded-lg hover:bg-calm-teal/10 hover:text-calm-teal"
                                title="Editar Número de Caso"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(patient.id)
                                }}
                                className="h-9 w-9 p-0 rounded-lg hover:bg-soft-coral/10 hover:text-soft-coral"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreatePatientModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreatePatient={handleCreatePatient}
      />

      <EditCodeModal
        open={isEditCodeModalOpen}
        onOpenChange={setIsEditCodeModalOpen}
        patient={selectedPatientForCodeEdit}
        onUpdatePatientCode={handleUpdatePatientCode}
      />


    </DashboardLayout>
  )
}
