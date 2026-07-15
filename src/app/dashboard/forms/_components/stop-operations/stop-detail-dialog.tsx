"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { ParadaOperativaDetalle } from "@/lib/paradas-operativas/types"
import { formatearMinutos } from "@/lib/paradas-operativas/utils"
import { Clock, User, Package, FileText, AlertCircle } from "lucide-react"

interface StopDetailDialogProps {
  parada: ParadaOperativaDetalle | null
  indice?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  contexto?: {
    linea: string
    fecha: string
    turno: string
    lote: string
  }
}

export function StopDetailDialog({
  parada,
  indice,
  open,
  onOpenChange,
  contexto,
}: StopDetailDialogProps) {
  if (!parada) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Detalle de parada
            {indice !== undefined && (
              <Badge variant="secondary">#{indice + 1}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Registro completo de la parada operativa terminada.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-5">
          {contexto && (
            <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
              <DetalleItem label="Línea" value={contexto.linea} />
              <DetalleItem label="Fecha" value={contexto.fecha} />
              <DetalleItem label="Turno" value={contexto.turno} />
              <DetalleItem label="Lote" value={contexto.lote} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetalleItem
              icon={<Clock className="h-4 w-4 shrink-0" />}
              label="Hora inicio"
              value={parada.horaInicio}
              mono
            />
            <DetalleItem
              icon={<Clock className="h-4 w-4 shrink-0" />}
              label="Hora finalización"
              value={parada.horaFin}
              mono
            />
          </div>

          <div className="rounded-lg border bg-destructive/5 p-4">
            <p className="text-xs text-muted-foreground">Tiempo de parada</p>
            <p className="text-2xl font-bold text-destructive">
              {formatearMinutos(parada.tiempoMinutos)}
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetalleItem
              icon={<AlertCircle className="h-4 w-4 shrink-0" />}
              label="Motivo"
              value={parada.motivo || "—"}
            />
            <DetalleItem
              icon={<Package className="h-4 w-4 shrink-0" />}
              label="Unidades (tramo)"
              value={parada.unidadesReales.toLocaleString()}
            />
            <DetalleItem
              icon={<AlertCircle className="h-4 w-4 shrink-0" />}
              label="Unidades no conformes"
              value={parada.unidadesNoConformes.toLocaleString()}
            />
          </div>

          <DetalleItem
            icon={<User className="h-4 w-4 shrink-0" />}
            label="Responsable"
            value={parada.responsable}
          />

          {parada.observaciones?.trim() && (
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <FileText className="h-4 w-4 shrink-0" />
                Observaciones
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-4">
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                  {parada.observaciones}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DetalleItem({
  icon,
  label,
  value,
  mono,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p
        className={`break-words text-sm font-medium leading-relaxed [overflow-wrap:anywhere] ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </p>
    </div>
  )
}
