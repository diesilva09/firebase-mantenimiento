"use client"

import { useEffect } from "react"
import { ErrorFallback } from "@/components/error-fallback"

export default function FormsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Error en formularios:", error)
  }, [error])

  return (
    <ErrorFallback
      title="Error al cargar el formulario"
      message="El formulario no pudo mostrarse correctamente. Verifica tu conexión e intenta de nuevo."
      onRetry={reset}
    />
  )
}
