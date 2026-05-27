"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/contexts/language-context"
import { LanguageToggle } from "@/components/language-toggle"
import { ArrowLeft } from "lucide-react"

import * as api from "@/lib/api"

export default function ForgotPasswordPage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [email, setEmail] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            await api.forgotPassword(email)
            // Always show success message for security (don't reveal if email exists)
            setSubmitted(true)
        } catch (err) {
            console.error(err)
            alert("Error inesperado")
        } finally {
            setIsSubmitting(false)
        }
    }

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
                        {t("recoverPassword") || "Recuperar Contraseña"}
                    </CardTitle>
                    <CardDescription className="text-base text-muted-foreground">
                        {submitted
                            ? (t("checkEmail") || "Revisa tu correo electrónico (o la consola de backend en dev)")
                            : (t("enterEmailToRecover") || "Ingresa tu correo para recibir un enlace de recuperación")
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {submitted ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-green-50 text-green-700 rounded-xl text-center">
                                <p>{t("recoveryLinkSent") || "Si el correo existe, hemos enviado un enlace para restablecer tu contraseña."}</p>
                            </div>
                            <Button
                                onClick={() => router.push("/login")}
                                className="w-full h-11 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white font-medium shadow-md"
                            >
                                {t("backToLogin") || "Volver al Login"}
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium text-neutral-charcoal">
                                    {t("email")}
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="email@ejemplo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-11 rounded-xl border-soft-gray focus:border-calm-teal focus:ring-calm-teal"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-11 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white font-medium shadow-md mt-6"
                            >
                                {isSubmitting ? "Enviando..." : (t("sendRecoveryLink") || "Enviar enlace")}
                            </Button>

                            <Button
                                variant="ghost"
                                type="button"
                                onClick={() => router.push("/login")}
                                className="w-full text-muted-foreground hover:text-neutral-charcoal"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {t("backToLogin") || "Volver"}
                            </Button>
                        </form>
                    )}

                </CardContent>
            </Card>
        </div>
    )
}
