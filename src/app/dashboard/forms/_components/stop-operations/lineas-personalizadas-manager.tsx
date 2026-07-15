"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface LineasPersonalizadasManagerProps {
  lineas: string[]
  onEliminar: (nombre: string) => Promise<void>
  disabled?: boolean
  compact?: boolean
}

export function LineasPersonalizadasManager({
  lineas,
  onEliminar,
  disabled,
  compact,
}: LineasPersonalizadasManagerProps) {
  const [lineaAEliminar, setLineaAEliminar] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState(false)

  if (lineas.length === 0) return null

  async function confirmarEliminacion() {
    if (!lineaAEliminar) return

    setEliminando(true)
    try {
      await onEliminar(lineaAEliminar)
      setLineaAEliminar(null)
    } finally {
      setEliminando(false)
    }
  }

  return (
    <>
      <div className={compact ? "space-y-2" : "rounded-lg border border-dashed p-4 space-y-3"}>
        {!compact && (
          <div>
            <p className="text-sm font-medium">Líneas personalizadas (OTRA)</p>
            <p className="text-xs text-muted-foreground">
              Quita del listado las líneas que ya no uses. Los registros históricos se
              conservan.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {lineas.map((linea) => (
            <div
              key={linea}
              className="flex items-center gap-1 rounded-full border bg-muted/40 pl-3 pr-1 py-1"
            >
              <span className="text-sm">{linea}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                disabled={disabled || eliminando}
                onClick={() => setLineaAEliminar(linea)}
                aria-label={`Eliminar línea ${linea}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {!compact && (
          <Badge variant="outline" className="text-[10px]">
            {lineas.length} línea{lineas.length !== 1 ? "s" : ""} guardada
            {lineas.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <AlertDialog
        open={!!lineaAEliminar}
        onOpenChange={(open) => {
          if (!open) setLineaAEliminar(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar línea personalizada?</AlertDialogTitle>
            <AlertDialogDescription>
              Se quitará <strong>{lineaAEliminar}</strong> del selector de líneas. Los
              registros y paradas ya guardados no se borran; seguirán visibles en informes
              si existen datos históricos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={eliminando}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                void confirmarEliminacion()
              }}
            >
              {eliminando ? "Eliminando..." : "Eliminar del listado"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
