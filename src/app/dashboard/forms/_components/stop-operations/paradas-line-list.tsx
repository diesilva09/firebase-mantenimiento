"use client"

import { useState } from "react"
import type { RegistroLineaProduccion } from "@/lib/paradas-operativas/types"
import { LINEAS_FIJAS } from "@/lib/paradas-operativas/constants"
import {
  claveNombreLinea,
  construirListadoLineas,
  formatearMinutos,
  registroCoincideLinea,
  sumarMinutosParadas,
} from "@/lib/paradas-operativas/utils"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Factory, ChevronRight, BarChart3, Trash2, Globe } from "lucide-react"
import { LineasPersonalizadasManager } from "./lineas-personalizadas-manager"

interface ParadasLineListProps {
  registros: RegistroLineaProduccion[]
  lineasPersonalizadas: string[]
  onSeleccionar: (lineaKey: string) => void
  onVerInformeGlobal: () => void
  onEliminarLineaPersonalizada?: (nombre: string) => Promise<void>
}

export function ParadasLineList({
  registros,
  lineasPersonalizadas,
  onSeleccionar,
  onVerInformeGlobal,
  onEliminarLineaPersonalizada,
}: ParadasLineListProps) {
  const [lineaAEliminar, setLineaAEliminar] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const lineasCatalogo = construirListadoLineas(lineasPersonalizadas, registros)
  const clavesCatalogo = new Set(lineasPersonalizadas.map((l) => claveNombreLinea(l)))

  const resumenPorLinea = lineasCatalogo.map((linea) => {
    const deLinea = registros.filter((r) => registroCoincideLinea(r, linea))
    const paradas = deLinea.reduce((acc, r) => acc + (r.paradas?.length ?? 0), 0)
    const tiempoPerdido = deLinea.reduce(
      (acc, r) => acc + sumarMinutosParadas(r.paradas),
      0,
    )
    const activas = deLinea.filter((r) => r.estado === "activo").length
    const cerradas = deLinea.filter((r) => r.estado === "cerrado").length
    const esPersonalizada = !(LINEAS_FIJAS as readonly string[]).includes(linea)
    const enCatalogo = esPersonalizada && clavesCatalogo.has(claveNombreLinea(linea))

    return {
      linea,
      esPersonalizada,
      enCatalogo,
      registros: deLinea.length,
      paradas,
      tiempoPerdido,
      activas,
      cerradas,
    }
  })

  async function confirmarEliminacion() {
    if (!lineaAEliminar || !onEliminarLineaPersonalizada) return

    setEliminando(true)
    try {
      await onEliminarLineaPersonalizada(lineaAEliminar)
      setLineaAEliminar(null)
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Informes por línea</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecciona una línea para ver el informe completo. Las líneas registradas en
              &quot;OTRA&quot; aparecen automáticamente en este listado.
            </p>
          </div>
          <Button type="button" onClick={onVerInformeGlobal} className="shrink-0">
            <Globe className="mr-2 h-4 w-4" />
            Informe global del mes
          </Button>
        </div>
      </div>

      {onEliminarLineaPersonalizada && lineasPersonalizadas.length > 0 && (
        <LineasPersonalizadasManager
          lineas={lineasPersonalizadas}
          onEliminar={onEliminarLineaPersonalizada}
          compact
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {resumenPorLinea.map((item) => (
          <div
            key={item.linea}
            className={cn(
              "group relative flex flex-col rounded-xl border bg-card p-5 text-left transition-all",
              "hover:border-primary/50 hover:bg-primary/5 hover:shadow-md",
              item.registros > 0 && "border-primary/20",
            )}
          >
            <button
              type="button"
              onClick={() => onSeleccionar(item.linea)}
              className="flex flex-1 flex-col text-left"
            >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Factory className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold leading-tight">{item.linea}</p>
                    {item.esPersonalizada && (
                      <Badge variant="outline" className="text-[10px]">
                        Personalizada
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.registros} registro{item.registros !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {item.activas > 0 && (
                <Badge variant="default" className="text-[10px]">
                  {item.activas} activa{item.activas > 1 ? "s" : ""}
                </Badge>
              )}
              {item.cerradas > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {item.cerradas} cerrada{item.cerradas > 1 ? "s" : ""}
                </Badge>
              )}
              {item.registros === 0 && (
                <Badge variant="outline" className="text-[10px]">
                  Sin datos
                </Badge>
              )}
            </div>

            {item.registros > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-xs text-muted-foreground">
                <span>{item.paradas} parada{item.paradas !== 1 ? "s" : ""}</span>
                <span className="text-right text-destructive">
                  {formatearMinutos(item.tiempoPerdido)} perdidos
                </span>
              </div>
            )}
            </button>

            {item.enCatalogo && onEliminarLineaPersonalizada && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 h-8 w-8 text-destructive hover:text-destructive"
                disabled={eliminando}
                onClick={() => setLineaAEliminar(item.linea)}
                aria-label={`Eliminar línea ${item.linea}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
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
              Se quitará <strong>{lineaAEliminar}</strong> del listado. Los registros
              guardados no se borran.
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
    </div>
  )
}
