"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TechnicianSelectField } from "./technician-select-field"
import { useState } from "react"

const formSchema = z
  .object({
    tecnico: z.string().min(1, "Selecciona o escribe el técnico."),
    trabajoRealizado: z.string().min(10, "Describe el trabajo realizado."),
    quedaPendiente: z.enum(["si", "no"], { required_error: "Indica si quedó algo pendiente." }),
    descripcionPendiente: z.string().optional(),
    repuestos: z.string().min(3, "Registra los repuestos o insumos utilizados."),
    fechaEjecucion: z.date({ required_error: "La fecha de ejecución es requerida." }),
    horaInicio: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)."),
    horaFin: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)."),
    tiempoTotal: z.string().min(1, "Registra el tiempo total empleado."),
  })
  .refine(
    (data) => (data.quedaPendiente === "si" ? Boolean(data.descripcionPendiente?.trim()) : true),
    {
      path: ["descripcionPendiente"],
      message: "Describe lo que quedó pendiente.",
    }
  )

export function MaintenanceMinuteForm() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tecnico: "",
      trabajoRealizado: "",
      quedaPendiente: "no",
      descripcionPendiente: "",
      repuestos: "",
      fechaEjecucion: new Date(),
      horaInicio: "",
      horaFin: "",
      tiempoTotal: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
  setIsLoading(true)
  
  try {
    console.log('Enviando datos:', values)
    
    const response = await fetch('/api/maintenance-minutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    })

    console.log('Respuesta status:', response.status)
    
    const responseText = await response.text()
    console.log('Respuesta texto:', responseText)

    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Error parseando JSON:', parseError)
      throw new Error(`La API devolvió HTML en lugar de JSON. Status: ${response.status}`)
    }

    if (result.success) {
      toast({
        title: "✅ Minuta Guardada",
        description: "El acta de la reunión ha sido registrada exitosamente.",
      })
      form.reset({
        tecnico: "",
        trabajoRealizado: "",
        quedaPendiente: "no",
        descripcionPendiente: "",
        repuestos: "",
        fechaEjecucion: new Date(),
        horaInicio: "",
        horaFin: "",
        tiempoTotal: "",
      })
    } else {
      throw new Error(result.error || result.details)
    }
  } catch (error: any) {
    console.error('Error completo:', error)
    toast({
      title: "❌ Error",
      description: error.message || "No se pudo guardar la minuta.",
      variant: "destructive",
    })
  } finally {
    setIsLoading(false)
  }
}

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="tecnico"
          render={({ field }) => (
            <TechnicianSelectField
              field={field}
              label="Nombre del técnico"
              placeholder="Seleccione o escriba el nombre"
              inputPlaceholder="Teclee el nombre del técnico"
            />
          )}
        />

        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="fechaEjecucion"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de ejecución</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Seleccione fecha</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tiempoTotal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tiempo total empleado</FormLabel>
                <FormControl>
                  <Input placeholder="Ej. 2 horas" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="horaInicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora de inicio</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
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
                <FormLabel>Hora de finalización</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="trabajoRealizado"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trabajo realizado</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder="Describe las actividades ejecutadas" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="repuestos"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repuestos o insumos utilizados</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Detalle materiales, cantidades y referencias" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="quedaPendiente"
            render={({ field }) => (
              <FormItem>
                <FormLabel>¿Quedó algo pendiente?</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una opción" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="si">Sí</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.watch("quedaPendiente") === "si" && (
            <FormField
              control={form.control}
              name="descripcionPendiente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción de lo pendiente</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Detalle lo que falta por ejecutar" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : "Guardar minuta"}
        </Button>
      </form>
    </Form>
  )
}