"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorFallbackProps {
  title?: string
  message?: string
  onRetry?: () => void
  showHomeLink?: boolean
}

export function ErrorFallback({
  title = "Algo salió mal",
  message = "Ocurrió un error inesperado en la aplicación. Puedes reintentar o volver al inicio.",
  onRetry,
  showHomeLink = true,
}: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <div className="rounded-full bg-destructive/10 p-3">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {onRetry && (
          <Button type="button" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        )}
        {showHomeLink && (
          <Button type="button" variant="outline" asChild>
            <a href="/dashboard/forms">Volver a formularios</a>
          </Button>
        )}
      </div>
    </div>
  )
}
