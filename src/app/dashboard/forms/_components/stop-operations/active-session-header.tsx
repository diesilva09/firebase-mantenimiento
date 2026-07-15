"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  calcularCumplimiento,
  formatearFechaSegura,
  formatearMinutos,
  getLineaLabel,
  sumarMinutosParadas,
} from "@/lib/paradas-operativas/utils"
import type { RegistroLineaProduccion } from "@/lib/paradas-operativas/types"
import { Clock, Factory, Package, Pencil, Trash2, User } from "lucide-react"

interface ActiveSessionHeaderProps {
  registro: RegistroLineaProduccion
  disabled?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function ActiveSessionHeader({
  registro,
  disabled,
  onEdit,
  onDelete,
}: ActiveSessionHeaderProps) {
  const { apertura, paradas = [], estado } = registro
  const tiempoPerdido = sumarMinutosParadas(paradas)
  const lineaLabel = getLineaLabel(apertura)

  const unidadesAcumuladas = paradas.reduce((acc, p) => acc + p.unidadesReales, 0)
  const cumplimiento = calcularCumplimiento(apertura.unidadesProgramadas, unidadesAcumuladas)
  const puedeGestionar = estado === "activo" && !disabled

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Factory className="h-5 w-5 shrink-0 text-primary" />
              <h3 className="text-xl font-semibold">{lineaLabel}</h3>
              <Badge variant={estado === "activo" ? "default" : "secondary"}>
                {estado === "activo" ? "Línea activa" : "Cerrada"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatearFechaSegura(apertura.fecha, "PPP")} · {apertura.turno ?? "—"} · Lote{" "}
              <span className="font-medium text-foreground">{apertura.lote ?? "—"}</span>
            </p>
          </div>

          <div className="flex flex-col gap-4 lg:items-end">
            {puedeGestionar && (onEdit || onDelete) && (
              <div className="flex flex-wrap gap-2">
                {onEdit && (
                  <Button type="button" variant="outline" size="sm" onClick={onEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar apertura
                  </Button>
                )}
                {onDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar línea
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar línea activa?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminará el registro de <strong>{lineaLabel}</strong> y todas sus
                          paradas asociadas. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={onDelete}
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}

            <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4 lg:max-w-2xl lg:gap-6">
              <StatInline icon={<Clock className="h-4 w-4" />} label="Inicio" value={apertura.horaInicio} />
              <StatInline
                icon={<Clock className="h-4 w-4" />}
                label="Fin programado"
                value={apertura.finTurnoProgramado}
              />
              <StatInline icon={<User className="h-4 w-4" />} label="Responsable" value={apertura.responsable} />
              <StatInline
                icon={<Package className="h-4 w-4" />}
                label="Meta unidades"
                value={apertura.unidadesProgramadas.toLocaleString()}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:gap-6">
          <div className="rounded-lg border bg-background p-4 lg:p-5">
            <p className="text-sm text-muted-foreground">Paradas registradas</p>
            <p className="mt-1 text-3xl font-bold">{paradas.length}</p>
          </div>
          <div className="rounded-lg border bg-background p-4 lg:p-5">
            <p className="text-sm text-muted-foreground">Tiempo perdido</p>
            <p className="mt-1 text-3xl font-bold text-destructive">
              {formatearMinutos(tiempoPerdido)}
            </p>
          </div>
          <div className="rounded-lg border bg-background p-4 lg:p-5">
            <p className="text-sm text-muted-foreground">Avance parcial (unidades)</p>
            <p className="mt-1 text-3xl font-bold">
              {unidadesAcumuladas.toLocaleString()}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                / {apertura.unidadesProgramadas.toLocaleString()}
              </span>
            </p>
            <Progress value={Math.min(cumplimiento, 100)} className="mt-3 h-2.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatInline({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border bg-background/60 p-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  )
}
