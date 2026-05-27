"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/contexts/language-context"
import { type Patient } from "@/lib/api"
import * as api from "@/lib/api"

interface EditPatientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient: Patient
  onUpdatePatient: (patient: Patient) => void
}

export function EditPatientModal({ open, onOpenChange, patient, onUpdatePatient }: EditPatientModalProps) {
  const { t } = useLanguage()
  const [riskLevel, setRiskLevel] = useState(patient.riskLevel)

  const [psychologists, setPsychologists] = useState<api.Psychologist[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedPsychologist, setSelectedPsychologist] = useState(patient.psychologistId || "")

  useEffect(() => {
    setRiskLevel(patient.riskLevel)
    setSelectedPsychologist(patient.psychologistId || "")
    const role = localStorage.getItem("userRole")
    if (role === "admin") {
      setIsAdmin(true)
      api.getPsychologists().then(setPsychologists)
    }
  }, [patient])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // If Admin Changed Psychologist
    if (isAdmin && selectedPsychologist !== patient.psychologistId) {
      const success = await api.assignPatientToPsychologist(patient.id, selectedPsychologist)
      if (!success) {
        alert("Error assigning psychologist")
        return
      }
      // Update local state if needed, though parent usually re-fetches or validation happened
      // Ideally we fetch the psychologist name to update logic, but for now we trust the refresh or handleUpdatePatient
    }

    onUpdatePatient({
      ...patient,
      riskLevel,
      psychologistId: selectedPsychologist
      // Note: Updating name locally is tricky without fetching, but page refresh fixes it. 
      // Ideally onUpdatePatient should be simpler or re-fetch.
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-neutral-charcoal">{t("editPatient")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">

          <div className="space-y-2">
            <Label className="text-sm font-medium text-neutral-charcoal">{t("patientCode")}</Label>
            <Input value={patient.patientCode} disabled className="h-11 rounded-xl border-soft-gray bg-muted w-full" />
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
              {t("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
