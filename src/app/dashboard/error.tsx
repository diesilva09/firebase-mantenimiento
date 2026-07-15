"use client"

import { useEffect } from "react"
import { ErrorFallback } from "@/components/error-fallback"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Error en dashboard:", error)
  }, [error])

  return (
    <ErrorFallback
      title="Error en el panel"
      message="No se pudo mostrar esta sección del dashboard. Intenta de nuevo."
      onRetry={reset}
      showHomeLink={false}
    />
  )
}
