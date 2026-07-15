"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface PhaseStepperProps {
  faseActual: 1 | 2 | 3
  lineaAbierta: boolean
  lineaCerrada: boolean
}

const FASES = [
  { num: 1, label: "Apertura", desc: "Datos iniciales de línea" },
  { num: 2, label: "Paradas", desc: "Registro incremental" },
  { num: 3, label: "Cierre", desc: "Finalización del turno" },
] as const

export function PhaseStepper({ faseActual, lineaAbierta, lineaCerrada }: PhaseStepperProps) {
  function getEstadoFase(num: number): "completada" | "actual" | "pendiente" {
    if (lineaCerrada) return "completada"
    if (num < faseActual) return "completada"
    if (num === faseActual) return "actual"
    return "pendiente"
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {FASES.map((fase, index) => {
          const estado = getEstadoFase(fase.num)
          const esUltima = index === FASES.length - 1

          return (
            <div key={fase.num} className="flex flex-1 items-center">
              <div className="flex flex-col items-center text-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                    estado === "completada" &&
                      "border-primary bg-primary text-primary-foreground",
                    estado === "actual" &&
                      "border-primary bg-primary/10 text-primary",
                    estado === "pendiente" &&
                      "border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {estado === "completada" ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    fase.num
                  )}
                </div>
                <p
                  className={cn(
                    "mt-2 text-sm font-medium",
                    estado === "pendiente" && "text-muted-foreground",
                  )}
                >
                  {fase.label}
                </p>
                <p className="hidden text-xs text-muted-foreground sm:block">{fase.desc}</p>
              </div>

              {!esUltima && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1",
                    (lineaAbierta && fase.num < faseActual) || lineaCerrada
                      ? "bg-primary"
                      : "bg-muted-foreground/20",
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
