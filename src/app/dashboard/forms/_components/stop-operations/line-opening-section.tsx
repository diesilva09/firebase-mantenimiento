"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  LINEAS_FIJAS,
  TURNOS_PRODUCCION,
} from "@/lib/paradas-operativas/constants"
import type { AperturaLinea } from "@/lib/paradas-operativas/types"
import { normalizarHora, normalizarNombreLinea } from "@/lib/paradas-operativas/utils"
import { TechnicianSelectField } from "../technician-select-field"
import { TimeSelectField } from "../time-select-field"
import { LineasPersonalizadasManager } from "./lineas-personalizadas-manager"

const schema = z
  .object({
    fecha: z.date({ required_error: "La fecha es requerida." }),
    linea: z.string().min(1, "Selecciona una línea."),
    lineaOtra: z.string().optional(),
    turno: z.string().min(1, "El turno es requerido."),
    horaInicio: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:MM."),
    finTurnoProgramado: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:MM."),
    responsable: z.string().min(2, "Indica el responsable."),
    unidadesProgramadas: z.coerce
      .number()
      .int("Debe ser un número entero.")
      .min(1, "Ingresa las unidades programadas."),
    lote: z.string().min(1, "El lote es requerido."),
  })
  .refine(
    (data) => data.linea !== "OTRA" || (data.lineaOtra?.trim().length ?? 0) > 0,
    { message: "Especifica el nombre de la línea.", path: ["lineaOtra"] },
  )

type FormValues = z.infer<typeof schema>

function valoresVacios(): FormValues {
  return {
    fecha: new Date(),
    linea: "",
    lineaOtra: "",
    turno: "",
    horaInicio: "",
    finTurnoProgramado: "",
    responsable: "",
    unidadesProgramadas: undefined,
    lote: "",
  }
}

function aperturaAValores(apertura: AperturaLinea): FormValues {
  const fecha =
    apertura.fecha instanceof Date ? apertura.fecha : new Date(apertura.fecha)

  return {
    fecha,
    linea: apertura.linea,
    lineaOtra: apertura.lineaOtra ?? "",
    turno: apertura.turno,
    horaInicio: normalizarHora(apertura.horaInicio),
    finTurnoProgramado: normalizarHora(apertura.finTurnoProgramado),
    responsable: apertura.responsable,
    unidadesProgramadas: apertura.unidadesProgramadas,
    lote: apertura.lote,
  }
}

const NUEVA_LINEA_OTRA = "__NUEVA_OTRA__"

interface LineOpeningSectionProps {
  onSubmit: (apertura: AperturaLinea) => void | Promise<void>
  esLineaAdicional?: boolean
  modo?: "crear" | "editar"
  aperturaInicial?: AperturaLinea
  lineasPersonalizadas?: string[]
  onEliminarLineaPersonalizada?: (nombre: string) => Promise<void>
  disabled?: boolean
  onCancel?: () => void
}

export function LineOpeningSection({
  onSubmit,
  esLineaAdicional,
  modo = "crear",
  aperturaInicial,
  lineasPersonalizadas = [],
  onEliminarLineaPersonalizada,
  disabled,
  onCancel,
}: LineOpeningSectionProps) {
  const [enviando, setEnviando] = useState(false)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues:
      modo === "editar" && aperturaInicial
        ? aperturaAValores(aperturaInicial)
        : valoresVacios(),
  })

  const lineaSeleccionada = form.watch("linea")
  const lineaOtraValor = form.watch("lineaOtra")
  const [esNuevaLineaPersonalizada, setEsNuevaLineaPersonalizada] = useState(false)

  useEffect(() => {
    if (modo === "editar" && aperturaInicial?.linea === "OTRA") {
      const nombre = aperturaInicial.lineaOtra?.trim() ?? ""
      const enCatalogo = lineasPersonalizadas.some(
        (n) => normalizarNombreLinea(n) === normalizarNombreLinea(nombre),
      )
      setEsNuevaLineaPersonalizada(!enCatalogo && nombre.length > 0)
      return
    }
    if (modo === "crear") {
      setEsNuevaLineaPersonalizada(false)
    }
  }, [modo, aperturaInicial, lineasPersonalizadas])

  function valorSelectLinea(linea: string, lineaOtra?: string): string {
    if (linea === "OTRA" && esNuevaLineaPersonalizada) {
      return NUEVA_LINEA_OTRA
    }
    if (linea === "OTRA" && lineaOtra?.trim()) {
      return lineaOtra.trim()
    }
    return linea
  }

  function handleLineaChange(value: string) {
    if (value === NUEVA_LINEA_OTRA) {
      setEsNuevaLineaPersonalizada(true)
      form.setValue("linea", "OTRA", { shouldValidate: true })
      form.setValue("lineaOtra", "")
      return
    }

    setEsNuevaLineaPersonalizada(false)

    const esFija = (LINEAS_FIJAS as readonly string[]).includes(value)
    if (esFija) {
      form.setValue("linea", value as AperturaLinea["linea"], { shouldValidate: true })
      form.setValue("lineaOtra", "")
      return
    }

    form.setValue("linea", "OTRA", { shouldValidate: true })
    form.setValue("lineaOtra", value, { shouldValidate: true })
  }

  function handleTurnoChange(turnoLabel: string) {
    form.setValue("turno", turnoLabel, { shouldValidate: true })
    const turno = TURNOS_PRODUCCION.find((t) => t.label === turnoLabel)
    if (turno) {
      form.setValue("horaInicio", turno.horaInicio)
      form.setValue("finTurnoProgramado", turno.finTurnoProgramado)
    }
  }

  async function handleSubmit(values: z.infer<typeof schema>) {
    if (disabled || enviando) return

    setEnviando(true)
    try {
      await onSubmit({
        fecha: values.fecha,
        linea: values.linea as AperturaLinea["linea"],
        lineaOtra: values.lineaOtra,
        turno: values.turno,
        horaInicio: values.horaInicio,
        finTurnoProgramado: values.finTurnoProgramado,
        responsable: values.responsable,
        unidadesProgramadas: values.unidadesProgramadas,
        lote: values.lote,
      })
    } finally {
      setEnviando(false)
    }
  }

  const bloqueado = disabled || enviando

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed border-primary/40 bg-muted/30 p-4">
        <h3 className="font-semibold text-primary">
          Fase 1 —{" "}
          {modo === "editar"
            ? "Editar apertura de línea"
            : esLineaAdicional
              ? "Abrir otra línea"
              : "Apertura del registro de línea"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {modo === "editar"
            ? "Modifica los datos de apertura. Los cambios se guardan en la base de datos."
            : esLineaAdicional
              ? "Puedes tener varias líneas activas al mismo tiempo. Completa los datos de la nueva línea."
              : "Completa los datos iniciales para abrir el turno de producción. Una vez abierta la línea, podrás registrar paradas de forma incremental."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value
                            ? format(field.value, "PPP", { locale: es })
                            : "Seleccione fecha"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="linea"
              render={() => (
                <FormItem>
                  <FormLabel>Línea</FormLabel>
                  <Select
                    onValueChange={handleLineaChange}
                    value={valorSelectLinea(lineaSeleccionada, lineaOtraValor)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona la línea" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LINEAS_FIJAS.map((linea) => (
                        <SelectItem key={linea} value={linea}>
                          {linea}
                        </SelectItem>
                      ))}
                      {lineasPersonalizadas.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Líneas personalizadas</SelectLabel>
                          {lineasPersonalizadas.map((linea) => (
                            <SelectItem key={`pers-${linea}`} value={linea}>
                              {linea}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      <SelectItem value={NUEVA_LINEA_OTRA}>OTRA (especificar nueva)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {lineaSeleccionada === "OTRA" && esNuevaLineaPersonalizada && (
            <FormField
              control={form.control}
              name="lineaOtra"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la línea</FormLabel>
                  <FormControl>
                    <Input placeholder="Especifica la línea" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="grid gap-6 md:grid-cols-3">
            <FormField
              control={form.control}
              name="turno"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Turno</FormLabel>
                  <Select onValueChange={handleTurnoChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona turno" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TURNOS_PRODUCCION.map((turno) => (
                        <SelectItem key={turno.label} value={turno.label}>
                          {turno.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="horaInicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora inicio</FormLabel>
                  <FormControl>
                    <TimeSelectField
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Seleccione hora inicio"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="finTurnoProgramado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fin turno programado</FormLabel>
                  <FormControl>
                    <TimeSelectField
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Seleccione hora fin"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FormField
              control={form.control}
              name="responsable"
              render={({ field }) => (
                <TechnicianSelectField
                  field={field}
                  label="Responsable"
                  placeholder="Selecciona quien abre la línea"
                />
              )}
            />

            <FormField
              control={form.control}
              name="unidadesProgramadas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidades programadas</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Ej: 5000"
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
              name="lote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lote</FormLabel>
                  <FormControl>
                    <Input placeholder="Código del lote" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={bloqueado}>
              {enviando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : modo === "editar" ? (
                "Guardar cambios"
              ) : esLineaAdicional ? (
                "Agregar línea activa"
              ) : (
                "Abrir línea de producción"
              )}
            </Button>
            {modo === "editar" && onCancel && (
              <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={bloqueado}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Form>

      {onEliminarLineaPersonalizada && (
        <LineasPersonalizadasManager
          lineas={lineasPersonalizadas}
          onEliminar={onEliminarLineaPersonalizada}
        />
      )}
    </div>
  )
}
