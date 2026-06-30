"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { TechnicianSelectField } from "./technician-select-field"

const formSchema = z.object({
  area: z.string().min(1, "El área es requerida."),
  tipo: z.enum(["Correctivo", "Preventivo", "Preventivo Mayor", "Rutinario", "Emergencia"]),
  descripcion: z.string().min(10, "La descripción es requerida."),
  repuestos: z.string().min(3, "Describe los repuestos o materiales requeridos."),
  tecnico: z.string().min(1, "Selecciona o escribe el técnico que realizó el mantenimiento."),
})

export function LocativeMaintenanceForm() {
  const { toast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      area: "",
      tipo: "Correctivo",
      descripcion: "",
      repuestos: "",
      tecnico: "",
    },
  })

  function onSubmit(_values: z.infer<typeof formSchema>) {
    toast({
      title: "Solicitud Enviada",
      description: "La solicitud de mantenimiento locativo ha sido registrada.",
    })
    form.reset()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="area"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Área de la Solicitud</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Oficina de Contabilidad" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Mantenimiento</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Correctivo">Correctivo</SelectItem>
                  <SelectItem value="Preventivo">Preventivo</SelectItem>
                  <SelectItem value="Preventivo Mayor">Preventivo Mayor</SelectItem>
                  <SelectItem value="Rutinario">Rutinario</SelectItem>
                  <SelectItem value="Emergencia">Emergencia</SelectItem>
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
              <FormLabel>Descripción del Trabajo</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe el trabajo a realizar o realizado..." {...field} />
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
              <FormLabel>Repuestos o Materiales Requeridos</FormLabel>
              <FormControl>
                <Textarea placeholder="Relación de repuestos, consumibles o materiales necesarios..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tecnico"
          render={({ field }) => (
            <TechnicianSelectField
              field={field}
              label="Técnico que realizó el mantenimiento"
              placeholder="Selecciona un técnico"
              inputPlaceholder="Escribe el nombre del técnico"
            />
          )}
        />
        <Button type="submit">Guardar Solicitud</Button>
      </form>
    </Form>
  )
}
