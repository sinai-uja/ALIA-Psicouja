"use client"

import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import { Globe } from "lucide-react"

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLanguage(language === "en" ? "es" : "en")}
      className="gap-2 rounded-xl"
    >
      <Globe className="h-4 w-4" />
      {language === "en" ? "ES" : "EN"}
    </Button>
  )
}
