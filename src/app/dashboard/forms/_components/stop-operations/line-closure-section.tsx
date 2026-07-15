"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Lock, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { CierreLinea } from "@/lib/paradas-operativas/types"
import { formatearMinutos, sumarMinutosParadas, sumarUnidadesNoConformes } from "@/lib/paradas-operativas/utils"
import type { ParadaOperativaDetalle } from "@/lib/paradas-operativas/types"
import { TechnicianSelectField } from "../technician-select-field"
import { TimeSelectField } from "../time-select-field"

const schema = z.object({
  horaFinalizacion: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:MM."),
  responsable: z.string().min(2, "Indica quién cierra el registro."),
  unidadesRealesTotales: z.coerce
    .number()
    .int()
    .min(0, "Las unidades totales no pueden ser negativas.")
    .optional()
    .default(0),
  unidadesNoConformesTotales: z.coerce
    .number()
    .int()
    .min(0, "Las unidades no conformes no pueden ser negativas.")
    .optional()
    .default(0),
})

interface LineClosureSectionProps {
  paradas: ParadaOperativaDetalle[]
  unidadesProgramadas: number
  onClose: (cierre: CierreLinea) => void | Promise<void>
  disabled?: boolean
}

export function LineClosureSection({
  paradas,
  unidadesProgramadas,
  onClose,
  disabled,
}: LineClosureSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      horaFinalizacion: "",
      responsable: "",
      unidadesRealesTotales: undefined,
      unidadesNoConformesTotales: undefined,
    },
  })

  const unidadesParciales = paradas.reduce((acc, p) => acc + p.unidadesReales, 0)
  const noConformesParadas = sumarUnidadesNoConformes(paradas)
  const tiempoTotal = sumarMinutosParadas(paradas)

  function abrirCierre() {
    form.reset({
      horaFinalizacion: "",
      responsable: "",
      unidadesRealesTotales: undefined,
      unidadesNoConformesTotales:
        noConformesParadas > 0 ? noConformesParadas : undefined,
    })
    setExpanded(true)
  }

  async function handleSubmit(values: z.infer<typeof schema>) {
    if (disabled || enviando) return

    setEnviando(true)
    try {
      await onClose({
        horaFinalizacion: values.horaFinalizacion,
        responsable: values.responsable,
        unidadesRealesTotales: values.unidadesRealesTotales,
        unidadesNoConformesTotales: values.unidadesNoConformesTotales,
      })
      setExpanded(false)
    } finally {
      setEnviando(false)
    }
  }

  const bloqueado = disabled || enviando

  if (!expanded) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/5 p-4">
          <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">
            Fase 3 — Cierre de producción
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Al finalizar el turno o lote, cierra el registro para consolidar las unidades reales.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full border-emerald-500/50 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
          onClick={abrirCierre}
          disabled={bloqueado}
        >
          <Lock className="mr-2 h-4 w-4" />
          Cerrar producción de la línea
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">
          Fase 3 — Cierre de producción
        </h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)} disabled={bloqueado}>
          Cancelar
        </Button>
      </div>

      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Resumen antes del cierre</AlertTitle>
        <AlertDescription>
          {paradas.length} parada(s) · {formatearMinutos(tiempoTotal)} improductivos ·{" "}
          {unidadesParciales.toLocaleString()} unidades en tramos ·{" "}
          <strong>{noConformesParadas.toLocaleString()} no conformes acumuladas</strong> · meta{" "}
          {unidadesProgramadas.toLocaleString()}. El total de no conformes se calcula desde las
          paradas; puedes ajustarlo si es necesario.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FormField
              control={form.control}
              name="horaFinalizacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora de finalización (turno)</FormLabel>
                  <FormControl>
                    <TimeSelectField
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Seleccione hora de cierre"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsable"
              render={({ field }) => (
                <TechnicianSelectField
                  field={field}
                  label="Responsable de la finalización"
                  placeholder="Selecciona quien cierra el registro"
                />
              )}
            />

            <FormField
              control={form.control}
              name="unidadesRealesTotales"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidades reales totales</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Ej: 4800"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? undefined : e.target.value)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unidadesNoConformesTotales"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total unidades no conformes</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder={
                        noConformesParadas > 0
                          ? String(noConformesParadas)
                          : "Suma de paradas"
                      }
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? undefined : e.target.value)
                      }
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Calculado: {noConformesParadas.toLocaleString()} desde paradas
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={bloqueado}>
            {enviando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cerrando...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Confirmar cierre de línea
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
