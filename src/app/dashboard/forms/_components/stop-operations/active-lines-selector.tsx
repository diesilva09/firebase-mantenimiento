"use client"

import { Plus, Factory, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { RegistroLineaProduccion } from "@/lib/paradas-operativas/types"
import { formatearFechaSegura, formatearMinutos, getLineaLabel, sumarMinutosParadas } from "@/lib/paradas-operativas/utils"

export type VistaOperacion = "nueva" | string

interface ActiveLinesSelectorProps {
  lineasActivas: RegistroLineaProduccion[]
  seleccionado: VistaOperacion
  onSeleccionar: (vista: VistaOperacion) => void
}

export function ActiveLinesSelector({
  lineasActivas,
  seleccionado,
  onSeleccionar,
}: ActiveLinesSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Líneas en operación</h3>
          <p className="text-xs text-muted-foreground">
            {lineasActivas.length === 0
              ? "No hay líneas abiertas. Inicia una nueva."
              : `${lineasActivas.length} línea${lineasActivas.length > 1 ? "s" : ""} activa${lineasActivas.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={seleccionado === "nueva" ? "default" : "outline"}
          onClick={() => onSeleccionar("nueva")}
        >
          <Plus className="mr-2 h-4 w-4" />
          Abrir nueva línea
        </Button>
      </div>

      {lineasActivas.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {lineasActivas.map((registro) => {
            const activa = seleccionado === registro.id
            const tiempoPerdido = sumarMinutosParadas(registro.paradas ?? [])
            const linea = getLineaLabel(registro.apertura)

            return (
              <button
                key={registro.id}
                type="button"
                onClick={() => onSeleccionar(registro.id)}
                className={cn(
                  "min-w-[220px] shrink-0 rounded-lg border p-4 text-left transition-colors lg:min-w-[260px]",
                  activa
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Factory className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-semibold leading-tight">{linea}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    Activa
                  </Badge>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {registro.apertura.turno} · Lote {registro.apertura.lote}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatearFechaSegura(registro.apertura.fecha, "dd MMM yyyy")}
                </p>

                <div className="mt-2 flex items-center gap-3 text-[11px]">
                  <span>{(registro.paradas ?? []).length} parada{(registro.paradas ?? []).length !== 1 ? "s" : ""}</span>
                  {tiempoPerdido > 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      <Clock className="h-3 w-3" />
                      {formatearMinutos(tiempoPerdido)}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
