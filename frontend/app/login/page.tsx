"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/contexts/language-context"
import { LanguageToggle } from "@/components/language-toggle"
import { LoginFeatures } from "@/components/login-features"

import * as api from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const user = await api.login(email, password);
      if (user) {
        localStorage.setItem("isAuthenticated", "true")
        localStorage.setItem("userName", user.name)
        localStorage.setItem("userRole", user.role)
        localStorage.setItem("userId", user.id.toString())
        localStorage.setItem("user", JSON.stringify(user))  // Store complete user object

        if (user.role === 'superadmin') {
          router.push("/superadmin")
        } else {
          router.push("/dashboard")
        }
      } else {
        alert("Invalid credentials")
      }
    } catch (err) {
      console.error(err)
      alert("Login failed")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-soft-blue via-soft-lavender to-soft-pink p-4 lg:p-8">
      <div className="absolute top-4 right-4 z-50">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-6xl flex items-center justify-center gap-12 xl:gap-24 relative">
        <LoginFeatures />

        <Card className="w-full max-w-md shadow-xl rounded-2xl border-0 shrink-0 relative z-10 bg-white/90 backdrop-blur-md">
          <CardHeader className="space-y-3 text-center pb-0">
            <div className="mx-auto w-64 h-64 flex items-center justify-center mb-0">
              <Image
                src="/icon.svg"
                alt="PsicoUJA Logo"
                width={256}
                height={256}
                className="object-contain"
                priority
              />
            </div>
            {/* <CardTitle className="text-2xl font-semibold text-neutral-charcoal">PsicoUJA</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Sistema de Supervisión Psicológica
          </CardDescription> */}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-neutral-charcoal">
                  {t("email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl border-soft-gray focus:border-calm-teal focus:ring-calm-teal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-neutral-charcoal">
                  {t("password")}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-xl border-soft-gray focus:border-calm-teal focus:ring-calm-teal"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="link"
                  className="px-0 font-normal h-auto text-calm-teal hover:no-underline hover:text-calm-teal/80"
                  onClick={() => router.push("/forgot-password")}
                  type="button"
                >
                  {t("forgotPassword")}
                </Button>
              </div>
              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white font-medium shadow-md mt-6"
              >
                {t("login")}
              </Button>
            </form>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
