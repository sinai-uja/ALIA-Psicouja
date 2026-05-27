"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/contexts/language-context"
import { LanguageToggle } from "@/components/language-toggle"

import * as api from "@/lib/api"

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get("token")
    const { t } = useLanguage()

    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!token) {
            alert("Token inválido o faltante")
            return
        }

        if (newPassword !== confirmPassword) {
            alert(t("passwordsDoNotMatch") || "Las contraseñas no coinciden")
            return
        }

        if (newPassword.length < 6) {
            alert(t("passwordTooShort") || "La contraseña debe tener al menos 6 caracteres")
            return
        }

        setIsSubmitting(true)

        try {
            const success = await api.resetPassword(token, newPassword)
            if (success) {
                alert(t("passwordResetSuccess") || "Contraseña restablecida correctamente. Ahora puedes iniciar sesión.")
                router.push("/login")
            } else {
                alert(t("passwordResetError") || "Error al restablecer. El enlace puede haber expirado.")
            }
        } catch (err) {
            console.error(err)
            alert("Error inesperado")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!token) {
        return (
            <div className="text-center text-red-500">
                Enlace inválido. Por favor solicita uno nuevo.
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
                <Label htmlFor="newPassword">{t("newPassword") || "Nueva Contraseña"}</Label>
                <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="h-11 rounded-xl border-soft-gray focus:border-calm-teal focus:ring-calm-teal"
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
                    className="h-11 rounded-xl border-soft-gray focus:border-calm-teal focus:ring-calm-teal"
                />
            </div>
            <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white font-medium shadow-md mt-6"
            >
                {isSubmitting ? "Restableciendo..." : (t("resetPassword") || "Restablecer Contraseña")}
            </Button>
        </form>
    )
}

export default function ResetPasswordPage() {
    const { t } = useLanguage()

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-soft-blue via-soft-lavender to-soft-pink p-4">
            <div className="absolute top-4 right-4">
                <LanguageToggle />
            </div>

            <Card className="w-full max-w-md shadow-xl rounded-2xl border-0">
                <CardHeader className="space-y-3 text-center pb-6">
                    <div className="mx-auto w-24 h-24 flex items-center justify-center mb-4">
                        <Image
                            src="/icon.svg"
                            alt="PsicoUJA Logo"
                            width={96}
                            height={96}
                            className="object-contain"
                            priority
                        />
                    </div>
                    <CardTitle className="text-2xl font-semibold text-neutral-charcoal">
                        {t("resetPassword") || "Restablecer Contraseña"}
                    </CardTitle>
                    <CardDescription className="text-base text-muted-foreground">
                        {t("enterNewPassword") || "Ingresa tu nueva contraseña"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<div>Cargando...</div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    )
}
