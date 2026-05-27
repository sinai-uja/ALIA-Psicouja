"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/contexts/language-context"
import * as api from "@/lib/api"
import { type Patient } from "@/lib/api"

interface CreatePatientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreatePatient: (patient: Patient) => void
}

export function CreatePatientModal({ open, onOpenChange, onCreatePatient }: CreatePatientModalProps) {
  const { t } = useLanguage()
  const [patientId, setPatientId] = useState("")

  // Removed unused riskLevel
  const [selectedPsychologist, setSelectedPsychologist] = useState("")
  const [psychologists, setPsychologists] = useState<api.Psychologist[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  const handleOpenMain = (isOpen: boolean) => {
    onOpenChange(isOpen)
    if (isOpen) {
      const role = localStorage.getItem("userRole")
      if (role === "admin") {
        setIsAdmin(true)
        api.getPsychologists().then(setPsychologists)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const userRole = localStorage.getItem("userRole")
    const userId = localStorage.getItem("userId")

    let assignTo = undefined
    if (userRole === "psychologist" && userId) {
      assignTo = userId
    } else if (userRole === "admin" && selectedPsychologist) {
      assignTo = selectedPsychologist
    }

    try {
      const newPatient = await api.createPatient(patientId, assignTo)
      if (newPatient) {
        onCreatePatient(newPatient)
        onOpenChange(false)
        setPatientId("")
        setSelectedPsychologist("")
      } else {
        alert("Error al crear paciente. Puede que el número de caso ya exista")
      }
    } catch (err) {
      console.error("Error creating patient", err)
      alert("Error creating patient")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenMain}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-neutral-charcoal">{t("createNewPatient")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="patientId" className="text-sm font-medium text-neutral-charcoal">
              {t("patientId")}
            </Label>
            <Input
              id="patientId"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="h-11 rounded-xl border-soft-gray"
            />
          </div>



          {isAdmin && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-neutral-charcoal">Asignar a Psicólogo</Label>
              <Select value={selectedPsychologist} onValueChange={setSelectedPsychologist}>
                <SelectTrigger className="h-11 rounded-xl border-soft-gray">
                  <SelectValue placeholder="Seleccionar psicólogo" />
                </SelectTrigger>
                <SelectContent>
                  {psychologists.map(psych => (
                    <SelectItem key={psych.id} value={psych.id}>{psych.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 rounded-xl border-soft-gray"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md"
            >
              {t("createPatient")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
