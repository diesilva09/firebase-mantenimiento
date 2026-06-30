"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { useFormPersistence } from "@/hooks/use-form-persistence"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiFileUploader } from "@/components/multi-file-uploader"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useNotificationsContext as useNotifications } from "@/context/notifications-context"
import { emitLiveUpdate } from "@/hooks/use-live-refresh"

const departamentos = [
  "Mantenimiento",
  "Administracion",
  "Produccion",
  "Logistica",
  "Calidad",
  "Otro",
] as const

const formSchema = z
  .object({
    nombreSolicitante: z.string().min(3, "Ingresa el nombre de quien solicita."),
    areaEquipo: z.string().min(3, "Ingresa el area y/o equipo."),
    fechaSolicitud: z.string().min(1, "La fecha de solicitud es requerida."),
    departamentoSolicitante: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.enum(departamentos, {
        required_error: "Selecciona el departamento solicitante.",
      })
    ),
    otroDepartamento: z.string().optional(),
    descripcionSolicitud: z.string().min(10, "Describe brevemente la solicitud."),
    adjuntos: z.string().optional(),
  })
  .refine(
    (data) =>
      data.departamentoSolicitante !== "Otro" || Boolean(data.otroDepartamento?.trim()),
    {
      path: ["otroDepartamento"],
      message: "Especifica el departamento cuando selecciones Otro.",
    }
  )

function getTodayDate() {
  const today = new Date()
  const offset = today.getTimezoneOffset()
  const localDate = new Date(today.getTime() - offset * 60 * 1000)
  return localDate.toISOString().split("T")[0]
}

function parseStoredDate(dateString: string) {
  if (!dateString) return undefined

  const [year, month, day] = dateString.split("-").map(Number)
  if (!year || !month || !day) return undefined

  return new Date(year, month - 1, day)
}

export function SolicitudesMantenimientoForm() {
  const { toast } = useToast()
  const { refreshNotifications } = useNotifications()
  const [isLoading, setIsLoading] = useState(false)
  const [departamentoSelectKey, setDepartamentoSelectKey] = useState(0)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombreSolicitante: "",
      areaEquipo: "",
      fechaSolicitud: getTodayDate(),
      departamentoSolicitante: undefined,
      otroDepartamento: "",
      descripcionSolicitud: "",
      adjuntos: "",
    },
  })

  // Persistencia del formulario
  const { clearPersistedData } = useFormPersistence<z.infer<typeof formSchema>>(
    "solicitudes-mantenimiento-form",
    form.control,
    form.setValue,
    form.watch
  )

  function resetSolicitudForm() {
    form.reset({
      nombreSolicitante: "",
      areaEquipo: "",
      fechaSolicitud: getTodayDate(),
      departamentoSolicitante: undefined,
      otroDepartamento: "",
      descripcionSolicitud: "",
      adjuntos: "",
    })
    setDepartamentoSelectKey((current) => current + 1)
    clearPersistedData()
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    
    try {
      const payload = {
        ...values,
        otroDepartamento:
          values.departamentoSolicitante === "Otro" ? values.otroDepartamento?.trim() || null : null,
        adjuntos: values.adjuntos || null,
      }

      const response = await fetch("/api/solicitudes-mantenimiento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "No se pudo guardar la solicitud.")
      }

      toast({
        title: "Solicitud enviada exitosamente",
        description: "La solicitud de mantenimiento ha sido registrada correctamente.",
        variant: "success",
      })

      try {
        await refreshNotifications()
      } catch (error) {
        console.warn("No se pudieron refrescar las notificaciones", error)
      }

      emitLiveUpdate(["maintenance-requests", "notifications"])

      resetSolicitudForm()
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: "Error al enviar la solicitud",
        description: error.message || "No se pudo enviar la solicitud.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="nombreSolicitante"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de quien solicita</FormLabel>
                <FormControl>
                  <Input placeholder="Ingresa el nombre completo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="areaEquipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Area y/o equipo</FormLabel>
                <FormControl>
                  <Input placeholder="Ej. Produccion - Empacadora 2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="fechaSolicitud"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha solicitud</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(parseStoredDate(field.value) ?? new Date(), "PPP")
                        ) : (
                          <span>Selecciona una fecha</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parseStoredDate(field.value)}
                      onSelect={(date) => {
                        if (date) {
                          const offset = date.getTimezoneOffset()
                          const localDate = new Date(date.getTime() - offset * 60 * 1000)
                          field.onChange(localDate.toISOString().split("T")[0])
                        }
                      }}
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
            name="departamentoSolicitante"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departamento solicitante</FormLabel>
                <Select
                  key={departamentoSelectKey}
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un departamento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departamentos.map((departamento) => (
                      <SelectItem key={departamento} value={departamento}>
                        {departamento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {form.watch("departamentoSolicitante") === "Otro" && (
          <FormField
            control={form.control}
            name="otroDepartamento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Especifica el departamento</FormLabel>
                <FormControl>
                  <Input placeholder="Escribe el nombre del departamento" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="descripcionSolicitud"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripcion breve de la solicitud</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Describe brevemente la necesidad de mantenimiento"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="adjuntos"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adjuntar imagenes o documentos (opcional)</FormLabel>
              <FormControl>
                <MultiFileUploader
                  value={field.value || ""}
                  onChange={field.onChange}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  label="Adjuntar archivos"
                  maxFiles={5}
                  isImageOnly={false}
                  showCamera
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={resetSolicitudForm}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
