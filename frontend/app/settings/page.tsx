"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings as SettingsIcon, Save, Mail, Lock } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { getUserProfile, updateUserProfile, changePassword } from "@/lib/api"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export default function SettingsPage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [style, setStyle] = useState("")
    const [tone, setTone] = useState("")
    const [instructions, setInstructions] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Password state
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isChangingPassword, setIsChangingPassword] = useState(false)

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            alert(t("passwordsDoNotMatch"))
            return
        }
        if (newPassword.length < 8) {
            alert(t("passwordTooShort"))
            return
        }

        setIsChangingPassword(true)
        try {
            const success = await changePassword(currentPassword, newPassword)
            if (success) {
                alert(t("passwordChanged"))
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
            } else {
                alert(t("passwordChangeError"))
            }
        } catch (error) {
            console.error(error)
            alert("Error inesperado")
        } finally {
            setIsChangingPassword(false)
        }
    }

    useEffect(() => {
        const auth = localStorage.getItem("isAuthenticated")
        const userId = localStorage.getItem("userId")

        if (!auth || !userId) {
            router.push("/login")
        } else {
            setIsAuthenticated(true)
            loadSettings(userId)
        }
    }, [router])

    const loadSettings = async (userId: string) => {
        try {
            const profile = await getUserProfile(userId)
            if (profile) {
                setStyle(profile.ai_style || "none")
                setTone(profile.ai_tone || "")
                setInstructions(profile.ai_instructions || "")
            }
        } catch (error) {
            console.error("Error loading settings:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const userId = localStorage.getItem("userId")
            if (!userId) {
                throw new Error("User ID not found")
            }

            await updateUserProfile(userId, {
                ai_style: style === "none" ? "" : style,
                ai_tone: tone,
                ai_instructions: instructions
            })

            alert("Configuración guardada exitosamente!")
        } catch (error) {
            console.error("Error saving settings:", error)
            alert("Error al guardar la configuración")
        } finally {
            setIsSaving(false)
        }
    }

    if (!isAuthenticated || isLoading) return null

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-3xl">
                <div>
                    <h1 className="text-3xl font-semibold text-neutral-charcoal flex items-center gap-3 mb-2">
                        <SettingsIcon className="h-8 w-8 text-calm-teal" />
                        {t("settings")}
                    </h1>
                    <p className="text-muted-foreground">{t("aiConfigDesc")}</p>
                </div>

                <Card className="rounded-2xl border-soft-gray shadow-soft">
                    <CardHeader>
                        <CardTitle className="text-neutral-charcoal flex items-center gap-2">
                            <SettingsIcon className="h-5 w-5 text-calm-teal" />
                            {t("aiConfig")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="style" className="text-sm font-medium text-neutral-charcoal">
                                    {t("therapistStyle")}
                                </Label>
                                <Select value={style} onValueChange={setStyle}>
                                    <SelectTrigger className="w-full h-11 rounded-xl border-soft-gray bg-white">
                                        <SelectValue placeholder="Selecciona un estilo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Ninguno</SelectItem>
                                        <SelectItem value="ACT">ACT (Terapia de Aceptación y Compromiso)</SelectItem>
                                        <SelectItem value="CBT">TCC (Terapia Cognitivo-Conductual)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tone" className="text-sm font-medium text-neutral-charcoal">
                                    {t("tone")}
                                </Label>
                                <Input
                                    id="tone"
                                    value={tone}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        if (newValue.length <= 100) {
                                            setTone(newValue);
                                        } else {
                                            alert('El tono no puede superar los 100 caracteres');
                                        }
                                    }}
                                    placeholder={t("tonePlaceholder")}
                                    className="h-11 rounded-xl border-soft-gray"
                                    maxLength={100}
                                />
                                <p className="text-xs text-gray-500 text-right">
                                    {tone.length}/100 caracteres
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="instructions" className="text-sm font-medium text-neutral-charcoal">
                                    {t("additionalInstructions")}
                                </Label>
                                <Textarea
                                    id="instructions"
                                    value={instructions}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        if (newValue.length <= 500) {
                                            setInstructions(newValue);
                                        } else {
                                            alert('Las instrucciones no pueden superar los 500 caracteres');
                                        }
                                    }}
                                    placeholder={t("instructionsPlaceholder")}
                                    className="min-h-[120px] rounded-xl border-soft-gray"
                                    maxLength={500}
                                />
                                <p className="text-xs text-gray-500 text-right">
                                    {instructions.length}/500 caracteres
                                </p>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-8 h-11 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md flex items-center gap-2">
                                    <Save className="h-4 w-4" />
                                    {isSaving ? "Guardando..." : t("saveConfig")}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Security Card */}
                <Card className="rounded-2xl border-soft-gray shadow-soft">
                    <CardHeader>
                        <CardTitle className="text-neutral-charcoal flex items-center gap-2">
                            <Lock className="h-5 w-5 text-calm-teal" />
                            {t("security")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">{t("currentPassword") || "Contraseña Actual"}</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    className="h-11 rounded-xl border-soft-gray"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">{t("newPassword") || "Nueva Contraseña"}</Label>
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        className="h-11 rounded-xl border-soft-gray"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">{t("confirmPassword") || "Confirmar Contraseña"}</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="h-11 rounded-xl border-soft-gray"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button
                                    type="submit"
                                    disabled={isChangingPassword}
                                    variant="outline"
                                    className="border-calm-teal text-calm-teal hover:bg-calm-teal hover:text-white"
                                >
                                    {isChangingPassword ? "Actualizando..." : (t("updatePassword") || "Actualizar Contraseña")}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Developer Contact Card */}
                <Card className="rounded-2xl border-amber-200 bg-amber-50/50 shadow-soft">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-neutral-charcoal flex items-center gap-2 text-base">
                            <Mail className="h-5 w-5 text-amber-600" />
                            Contacto de soporte técnico
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground mb-4">
                            Si tienes algún problema urgente con las sugerencias de la IA o cualquier otra incidencia técnica, puedes contactar directamente con el equipo de desarrollo:
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <a
                                href="mailto:amarmol@ujaen.es"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-amber-200 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                            >
                                <Mail className="h-4 w-4" />
                                amarmol@ujaen.es
                            </a>
                            <a
                                href="mailto:fsmaroto@ujaen.es"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-amber-200 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                            >
                                <Mail className="h-4 w-4" />
                                fsmaroto@ujaen.es
                            </a>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}