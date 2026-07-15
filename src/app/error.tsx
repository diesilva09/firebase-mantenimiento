"use client"

import { useEffect } from "react"
import { ErrorFallback } from "@/components/error-fallback"

export default function GlobalAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Error de aplicación:", error)
  }, [error])

  return (
    <ErrorFallback
      title="Error de la aplicación"
      message="Se produjo un problema al cargar esta página. Si persiste, recarga el navegador o contacta al administrador."
      onRetry={reset}
      showHomeLink={false}
    />
  )
}
