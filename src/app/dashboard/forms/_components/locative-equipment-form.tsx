"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const areaOptions = [
  "Preparación",
  "Salsas",
  "Frutos",
  "Etiqueta",
  "Servicios de Apoyo",
  "Bodega MP",
  "Bodega PT",
  "Oficina",
  "Otros",
]

const tipoMantenimientoOptions = [
  "Correctivo",
  "Preventivo",
  "Rutinario",
  "Emergencia",
]

const formSchema = z.object({
  solicitadoPor: z.string().min(1, "Requerido"),
  hora: z.string().min(1, "La hora es requerida."),
  departamento: z.string().min(1, "Requerido"),
  maquina: z.string().min(1, "Requerido"),
  ubicacion: z.string().min(1, "Requerido"),
  area: z.string().min(1, "Selecciona o escribe un área."),
  tipoMantenimiento: z.enum(tipoMantenimientoOptions as [string, ...string[]]),
  descripcion: z.string().min(5, "Describe la solicitud."),
})

export function LocativeEquipmentForm() {
  const { toast } = useToast()
  const [isCustomArea, setIsCustomArea] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      solicitadoPor: "",
      hora: "",
      departamento: "",
      maquina: "",
      ubicacion: "",
      area: "",
      tipoMantenimiento: "Correctivo",
      descripcion: "",
    },
  })

  function onSubmit(_values: z.infer<typeof formSchema>) {
    toast({
      title: "Registro Guardado",
      description: "El formato RE-MTT-006 ha sido registrado.",
    })
    form.reset()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="solicitadoPor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Solicitado por</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre de quien solicita" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hora"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="departamento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departamento solicitante</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Servicios Generales" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maquina"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Máquina o equipo</FormLabel>
                <FormControl>
                  <Input placeholder="Equipo a intervenir" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="ubicacion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ubicación</FormLabel>
              <FormControl>
                <Input placeholder="Zona o referencia exacta" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="area"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Área solicitante</FormLabel>
              <Select
                onValueChange={(value) => {
                  if (value === "Otros") {
                    setIsCustomArea(true)
                    field.onChange("")
                  } else {
                    setIsCustomArea(false)
                    field.onChange(value)
                  }
                }}
                value={isCustomArea ? "Otros" : field.value}
              >
                <FormControl>
                  <SelectTrigger
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' || e.key === 'Enter' || e.key === 'Escape') {
                        return; // Permitir teclas de navegación
                      }
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <SelectValue placeholder="Selecciona un área" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' || e.key === 'Enter' || e.key === 'Escape') {
                      return; // Permitir teclas de navegación
                    }
                    e.stopPropagation();
                  }}
                  onWheel={(e) => {
                    e.stopPropagation();
                  }}
                  className="max-h-[300px] overflow-y-auto overscroll-contain scroll-smooth"
                >
                  {areaOptions.map((option) => (
                    <SelectItem
                      key={option}
                      value={option}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' || e.key === 'Enter' || e.key === 'Escape') {
                          return; // Permitir teclas de navegación
                        }
                        e.stopPropagation();
                      }}
                    >
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isCustomArea && (
                <FormControl className="mt-2">
                  <Input
                    placeholder="Escribe el nombre del área"
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tipoMantenimiento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de mantenimiento</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tipoMantenimientoOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
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
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción de la solicitud</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalle la necesidad del mantenimiento" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Guardar Registro</Button>
      </form>
    </Form>
  )
}
