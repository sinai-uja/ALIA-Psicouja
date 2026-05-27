"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/contexts/language-context"
import { type Patient } from "@/lib/api"
import * as api from "@/lib/api"

interface EditCodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient: Patient | null
  onUpdatePatientCode: (patientId: string, newCode: string) => void
}

export function EditCodeModal({ open, onOpenChange, patient, onUpdatePatientCode }: EditCodeModalProps) {
  const { t } = useLanguage()
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (patient) {
      setCode(patient.patientCode)
    }
  }, [patient])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patient || !code.trim() || code === patient.patientCode) {
      onOpenChange(false)
      return
    }

    setIsLoading(true)
    const updatedCode = await api.updatePatientCode(patient.id, code.trim())
    setIsLoading(false)

    if (updatedCode) {
      onUpdatePatientCode(patient.id, updatedCode)
      onOpenChange(false)
    } else {
      alert(t("errorUpdatingCode") || "Error al actualizar el número de caso")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-neutral-charcoal">
            {"Editar Número de Caso"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-neutral-charcoal">
              {t("patientCode") || "Número de Caso"}
            </Label>
            <Input 
              value={code} 
              onChange={(e) => setCode(e.target.value)}
              className="h-11 rounded-xl border-soft-gray bg-white w-full" 
              placeholder="Ej: P-A1B2"
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 rounded-xl border-soft-gray"
              disabled={isLoading}
            >
              {t("cancel") || "Cancelar"}
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-calm-teal hover:bg-calm-teal/90 text-white shadow-md"
              disabled={isLoading || !code.trim() || (patient ? code === patient.patientCode : false)}
            >
              {isLoading ? "Guardando..." : (t("save") || "Guardar")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
