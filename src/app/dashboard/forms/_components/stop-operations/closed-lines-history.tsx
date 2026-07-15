"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, History } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { RegistroLineaProduccion } from "@/lib/paradas-operativas/types"
import {
  calcularCumplimiento,
  formatearFechaSegura,
  formatearMinutos,
  getLineaLabel,
  sumarMinutosParadas,
} from "@/lib/paradas-operativas/utils"

interface ClosedLinesHistoryProps {
  historial: RegistroLineaProduccion[]
}

export function ClosedLinesHistory({ historial }: ClosedLinesHistoryProps) {
  const [abierto, setAbierto] = useState(false)

  if (historial.length === 0) return null

  return (
    <div className="rounded-lg border bg-muted/20">
      <Button
        type="button"
        variant="ghost"
        className="flex w-full items-center justify-between px-4 py-3"
        onClick={() => setAbierto((v) => !v)}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <History className="h-4 w-4" />
          Registros cerrados ({historial.length})
        </span>
        {abierto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {abierto && (
        <div className="space-y-2 border-t px-4 py-3">
          {historial.map((registro) => {
            const linea = getLineaLabel(registro.apertura)
            const cierre = registro.cierre

            return (
              <div
                key={registro.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{linea}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatearFechaSegura(registro.apertura.fecha, "dd MMM yyyy")} ·{" "}
                    {registro.apertura.turno ?? "—"} · Lote {registro.apertura.lote ?? "—"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {cierre && (
                    <Badge variant="outline">
                      {calcularCumplimiento(
                        registro.apertura.unidadesProgramadas,
                        cierre.unidadesRealesTotales,
                      )}
                      % cumplimiento
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    {formatearMinutos(sumarMinutosParadas(registro.paradas ?? []))} perdidos
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
