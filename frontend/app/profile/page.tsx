"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Info, Save, UserCircle, Heart, Stethoscope } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import * as api from "@/lib/api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export default function ProfilePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [name, setName] = useState("Dr. Sarah Smith")
  const [availability, setAvailability] = useState("Lunes-Viernes, 9AM-5PM")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [profileId, setProfileId] = useState<string | null>(null)
  const [gender, setGender] = useState<string>("")
  const [therapyStyle, setTherapyStyle] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated")
    const id = localStorage.getItem("userId")
    if (!auth) {
      router.push("/login")
    } else {
      setIsAuthenticated(true)
      if (id) {
        setProfileId(id)
        api.getUserProfile(id).then(user => {
          if (user) {
            setName(user.name)
            setAvailability(user.schedule)
            setGender(user.gender || "")
            setTherapyStyle(user.therapy_style || "")
          }
        })
      }
    }
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (profileId) {
      setIsSaving(true)
      try {
        await api.updateUserProfile(profileId, { 
          name, 
          schedule: availability,
          gender,
          therapy_style: therapyStyle
        })
        localStorage.setItem("userName", name)
        window.dispatchEvent(new Event("storage"))
        alert(t("profileUpdated"))
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setAvatarUrl(url)
    }
  }

  if (!isAuthenticated) return null

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-charcoal flex items-center gap-3 mb-2">
            <UserCircle className="h-8 w-8 text-calm-teal" />
            {t("profileSettings")}
          </h1>
          <p className="text-muted-foreground">{t("manageInfo")}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="rounded-2xl border-soft-gray shadow-soft">
            <CardHeader>
              <CardTitle className="text-neutral-charcoal">{t("personalInformation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 bg-calm-teal/10">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="text-2xl text-calm-teal font-semibold">UJA</AvatarFallback>
                  </Avatar>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-calm-teal text-white flex items-center justify-center shadow-md hover:bg-calm-teal/90"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <p className="font-medium text-neutral-charcoal">{t("profilePhoto")}</p>
                  <p className="text-sm text-muted-foreground">{t("clickToUpdate")}</p>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-neutral-charcoal">
                    {t("fullName")}
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 rounded-xl border-soft-gray"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availability" className="text-sm font-medium text-neutral-charcoal">
                    {t("availability")}
                  </Label>
                  <Input
                    id="availability"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="h-11 rounded-xl border-soft-gray"
                  />
                </div>
              </div>

              {/* Info Message */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  {t("infoMessageProfile")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-soft-gray shadow-soft">
            <CardHeader>
              <CardTitle className="text-neutral-charcoal flex items-center gap-2">
                {t("privateInformation")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t("privateInfoDescription")}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-sm font-medium text-neutral-charcoal flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-500" />
                    {t("gender")}
                  </Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger id="gender" className="h-11 rounded-xl border-soft-gray bg-white">
                      <SelectValue placeholder={t("gender")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mujer">{t("genderFemale")}</SelectItem>
                      <SelectItem value="hombre">{t("genderMale")}</SelectItem>
                      <SelectItem value="no binario">{t("genderNonBinary")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="therapyStyle" className="text-sm font-medium text-neutral-charcoal flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-calm-teal" />
                    {t("therapyStyle")}
                  </Label>
                  <Textarea
                    id="therapyStyle"
                    value={therapyStyle}
                    onChange={(e) => setTherapyStyle(e.target.value)}
                    placeholder={t("therapyStylePlaceholder")}
                    className="min-h-[100px] rounded-xl border-soft-gray bg-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={isSaving}
              className="px-8 h-11 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Guardando..." : t("saveProfile")}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
