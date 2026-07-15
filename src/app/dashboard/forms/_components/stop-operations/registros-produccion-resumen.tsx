"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ClipboardList } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { RegistroLineaProduccion } from "@/lib/paradas-operativas/types"
import {
  calcularCumplimiento,
  formatearMinutos,
  getLineaKey,
  getLineaLabel,
  sumarMinutosParadas,
} from "@/lib/paradas-operativas/utils"

interface RegistrosProduccionResumenProps {
  registros: RegistroLineaProduccion[]
  onSeleccionarLinea?: (lineaKey: string) => void
}

export function RegistrosProduccionResumen({
  registros,
  onSeleccionarLinea,
}: RegistrosProduccionResumenProps) {
  if (registros.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Aún no hay registros de línea guardados. Abre una línea en la pestaña Operación para
        comenzar; no es necesario registrar paradas.
      </div>
    )
  }

  const ordenados = [...registros].sort(
    (a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime(),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Registros de producción guardados</h3>
          <p className="text-sm text-muted-foreground">
            Turnos y lotes abiertos o cerrados, con o sin paradas registradas.
          </p>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Línea</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Turno</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Paradas</TableHead>
              <TableHead>Unidades</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenados.map((registro) => {
              const lineaKey = getLineaKey(registro.apertura)
              const reales =
                registro.cierre?.unidadesRealesTotales ??
                registro.paradas.reduce((acc, p) => acc + p.unidadesReales, 0)

              return (
                <TableRow
                  key={registro.id}
                  className={onSeleccionarLinea ? "cursor-pointer hover:bg-muted/40" : undefined}
                  onClick={() => onSeleccionarLinea?.(lineaKey)}
                >
                  <TableCell className="font-medium">{getLineaLabel(registro.apertura)}</TableCell>
                  <TableCell>
                    {format(registro.apertura.fecha, "dd/MM/yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>{registro.apertura.turno}</TableCell>
                  <TableCell>{registro.apertura.lote}</TableCell>
                  <TableCell>
                    <Badge variant={registro.estado === "activo" ? "default" : "secondary"}>
                      {registro.estado === "activo" ? "Activo" : "Cerrado"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {registro.paradas.length === 0 ? (
                      <Badge variant="outline" className="text-[10px]">
                        Sin paradas
                      </Badge>
                    ) : (
                      <span>
                        {registro.paradas.length} · {formatearMinutos(sumarMinutosParadas(registro.paradas))}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {registro.estado === "cerrado" && registro.cierre ? (
                      <span>
                        {reales.toLocaleString()} / {registro.apertura.unidadesProgramadas.toLocaleString()}
                        {" "}
                        <span className="text-muted-foreground">
                          ({calcularCumplimiento(registro.apertura.unidadesProgramadas, reales)}%)
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Meta {registro.apertura.unidadesProgramadas.toLocaleString()}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
