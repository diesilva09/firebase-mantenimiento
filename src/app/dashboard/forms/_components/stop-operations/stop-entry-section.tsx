"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Trash2, Eye, Pencil, X, Loader2 } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { MOTIVOS_PARADA } from "@/lib/paradas-operativas/constants"
import {
  calcularMinutosEntreHoras,
  formatearMinutos,
  normalizarHora,
} from "@/lib/paradas-operativas/utils"
import type { ParadaOperativaDetalle } from "@/lib/paradas-operativas/types"
import { StopDetailDialog } from "./stop-detail-dialog"
import { TechnicianSelectField } from "../technician-select-field"
import { TimeSelectField } from "../time-select-field"

const schema = z
  .object({
    horaInicio: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:MM."),
    horaFin: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:MM."),
    motivo: z.string().min(1, "Selecciona el motivo."),
    observaciones: z.string().optional(),
    unidadesReales: z.coerce
      .number()
      .int()
      .min(0, "Las unidades no pueden ser negativas.")
      .optional()
      .default(0),
    unidadesNoConformes: z.coerce
      .number()
      .int()
      .min(0, "Las unidades no conformes no pueden ser negativas.")
      .optional()
      .default(0),
    responsable: z.string().min(2, "Indica el responsable."),
  })
  .refine(
    (data) => {
      const minutos = calcularMinutosEntreHoras(data.horaInicio, data.horaFin)
      return minutos !== null && minutos > 0
    },
    {
      message: "La hora de finalización debe ser posterior a la de inicio.",
      path: ["horaFin"],
    },
  )

type FormValues = z.infer<typeof schema>

function valoresVacios(): FormValues {
  return {
    horaInicio: "",
    horaFin: "",
    motivo: "",
    observaciones: "",
    unidadesReales: undefined,
    unidadesNoConformes: undefined,
    responsable: "",
  }
}

function paradaAValores(parada: ParadaOperativaDetalle): FormValues {
  return {
    horaInicio: normalizarHora(parada.horaInicio),
    horaFin: normalizarHora(parada.horaFin),
    motivo: parada.motivo,
    observaciones: parada.observaciones ?? "",
    unidadesReales: parada.unidadesReales > 0 ? parada.unidadesReales : undefined,
    unidadesNoConformes:
      parada.unidadesNoConformes > 0 ? parada.unidadesNoConformes : undefined,
    responsable: parada.responsable,
  }
}

interface StopEntrySectionProps {
  paradas: ParadaOperativaDetalle[]
  disabled?: boolean
  onAdd: (parada: Omit<ParadaOperativaDetalle, "id">) => void | Promise<void>
  onUpdate: (paradaId: string, parada: Omit<ParadaOperativaDetalle, "id">) => void | Promise<void>
  onRemove: (id: string) => void | Promise<void>
}

export function StopEntrySection({
  paradas,
  disabled,
  onAdd,
  onUpdate,
  onRemove,
}: StopEntrySectionProps) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [paradaEditando, setParadaEditando] = useState<ParadaOperativaDetalle | null>(null)
  const [paradaDetalle, setParadaDetalle] = useState<ParadaOperativaDetalle | null>(null)
  const [indiceDetalle, setIndiceDetalle] = useState<number | undefined>()
  const [enviando, setEnviando] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: valoresVacios(),
  })

  const horaInicio = form.watch("horaInicio")
  const horaFin = form.watch("horaFin")
  const tiempoCalculado = calcularMinutosEntreHoras(horaInicio, horaFin)
  const enEdicion = !!paradaEditando

  useEffect(() => {
    if (horaInicio && !horaFin && mostrarFormulario && !enEdicion) {
      form.setFocus("horaFin")
    }
  }, [horaInicio, horaFin, form, mostrarFormulario, enEdicion])

  function abrirDetalle(parada: ParadaOperativaDetalle, index: number) {
    setParadaDetalle(parada)
    setIndiceDetalle(index)
  }

  function abrirNuevaParada() {
    setParadaEditando(null)
    form.reset(valoresVacios())
    setMostrarFormulario(true)
  }

  function abrirEdicion(parada: ParadaOperativaDetalle) {
    setParadaEditando(parada)
    form.reset(paradaAValores(parada))
    setMostrarFormulario(true)
  }

  function cerrarFormulario() {
    setMostrarFormulario(false)
    setParadaEditando(null)
    form.reset(valoresVacios())
  }

  async function handleSubmit(values: FormValues) {
    if (disabled || enviando) return

    const tiempoMinutos = calcularMinutosEntreHoras(values.horaInicio, values.horaFin)
    if (tiempoMinutos === null || tiempoMinutos <= 0) return

    const datos: Omit<ParadaOperativaDetalle, "id"> = {
      horaInicio: normalizarHora(values.horaInicio),
      horaFin: normalizarHora(values.horaFin),
      tiempoMinutos,
      motivo: values.motivo as ParadaOperativaDetalle["motivo"],
      observaciones: values.observaciones,
      unidadesReales: values.unidadesReales,
      unidadesNoConformes: values.unidadesNoConformes,
      responsable: values.responsable,
    }

    setEnviando(true)
    try {
      if (paradaEditando) {
        await onUpdate(paradaEditando.id, datos)
        cerrarFormulario()
        return
      }

      await onAdd(datos)

      setParadaEditando(null)
      setMostrarFormulario(false)
      form.reset({
        horaInicio: normalizarHora(values.horaFin),
        horaFin: "",
        motivo: "",
        observaciones: "",
        unidadesReales: undefined,
        unidadesNoConformes: undefined,
        responsable: values.responsable,
      })
    } finally {
      setEnviando(false)
    }
  }

  const bloqueado = disabled || enviando

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-amber-700 dark:text-amber-400">
              Fase 2 — Registro incremental de paradas
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {paradas.length === 0
                ? "La línea está activa. Usa el botón para registrar la primera parada."
                : `${paradas.length} parada${paradas.length > 1 ? "s" : ""} registrada${paradas.length > 1 ? "s" : ""}.`}
            </p>
          </div>
          {!bloqueado && !mostrarFormulario && (
            <Button type="button" onClick={abrirNuevaParada}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar parada
            </Button>
          )}
        </div>
      </div>

      {paradas.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Tiempo</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Unidades</TableHead>
                <TableHead>No conformes</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paradas.map((parada, index) => (
                <TableRow
                  key={parada.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => abrirDetalle(parada, index)}
                >
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-mono text-sm">{parada.horaInicio}</TableCell>
                  <TableCell className="font-mono text-sm">{parada.horaFin}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {formatearMinutos(parada.tiempoMinutos)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate" title={parada.motivo}>
                    {parada.motivo}
                  </TableCell>
                  <TableCell>{parada.unidadesReales.toLocaleString()}</TableCell>
                  <TableCell>
                    {parada.unidadesNoConformes > 0 ? (
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        {parada.unidadesNoConformes.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => abrirDetalle(parada, index)}
                        aria-label={`Ver detalle parada ${index + 1}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        onClick={() => abrirEdicion(parada)}
                        aria-label={`Editar parada ${index + 1}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        onClick={() => onRemove(parada.id)}
                        aria-label={`Eliminar parada ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!disabled && mostrarFormulario && (
        <Form {...form}>
          <form
            key={paradaEditando ? `edit-${paradaEditando.id}` : "new"}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 rounded-lg border bg-muted/20 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {enEdicion ? "Editar parada operativa" : "Nueva parada operativa"}
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={cerrarFormulario}>
                <X className="mr-1 h-4 w-4" />
                Cancelar
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="horaInicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora inicio (parada)</FormLabel>
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
                name="horaFin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora finalización (parada)</FormLabel>
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

              <FormItem>
                <FormLabel>Tiempo de la parada</FormLabel>
                <div className="flex h-10 items-center rounded-md border bg-background px-3 text-sm">
                  {tiempoCalculado && tiempoCalculado > 0 ? (
                    <span className="font-semibold text-destructive">
                      {formatearMinutos(tiempoCalculado)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Se calcula automáticamente</span>
                  )}
                </div>
              </FormItem>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="motivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo parada</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona el motivo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MOTIVOS_PARADA.map((motivo) => (
                          <SelectItem key={motivo} value={motivo}>
                            {motivo}
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
                name="unidadesReales"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidades (tramo)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Ej: 150"
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
                name="unidadesNoConformes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidades no conformes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Ej: 12"
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
            </div>

            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalle adicional de la causa de la parada"
                      rows={2}
                      {...field}
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
                  label="Responsable de la parada"
                  placeholder="Selecciona quien reporta la parada"
                />
              )}
            />

            <Button type="submit" disabled={bloqueado}>
              {enviando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : enEdicion ? (
                <>Guardar cambios</>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Guardar parada
                </>
              )}
            </Button>
          </form>
        </Form>
      )}

      <StopDetailDialog
        parada={paradaDetalle}
        indice={indiceDetalle}
        open={!!paradaDetalle}
        onOpenChange={(open) => {
          if (!open) {
            setParadaDetalle(null)
            setIndiceDetalle(undefined)
          }
        }}
      />
    </div>
  )
}
