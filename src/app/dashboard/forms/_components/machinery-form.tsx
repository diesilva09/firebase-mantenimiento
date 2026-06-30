"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TechnicianSelectField } from "@/app/dashboard/forms/_components/technician-select-field"

const filterFields = [
  { name: "filtroMaquinaTecnopack", label: "Máquina Tecnopack" },
  { name: "filtro16Boquillas", label: "16 Boquillas" },
  { name: "filtro6Boquillas", label: "6 Boquillas" },
  { name: "filtroBolsaManual", label: "Bolsa Manual" },
  { name: "filtroEmpaque", label: "Empaque" },
  { name: "filtroDoyPackSalsas", label: "Doy Pack Salsas" },
  { name: "filtroDoyPackFrutos", label: "Doy Pack Frutos" },
  { name: "filtroEmerito", label: "Émerito" },
  { name: "filtroPiso1", label: "Piso 1" },
  { name: "filtroPiso2", label: "Piso 2" },
  { name: "filtroTerraza", label: "Terraza" },
  { name: "filtroGeneral", label: "General" },
  { name: "filtroCuartoMaquinas", label: "Cuarto de Máquinas" },
  { name: "filtroCuartoPtar", label: "Cuarto PTAR" },
  { name: "filtroBodegas", label: "Bodegas" },
  { name: "filtroCodificadora", label: "Codificadora" },
  { name: "filtroTwisOff", label: "TWIS OFF" },
] as const

const formSchema = z.object({
  tipoMantenimiento: z.enum(["Correctivo", "Preventivo", "Rutinario", "Emergencia"]),
  inicioMantenimiento: z.string().min(1, "La hora de inicio es requerida."),
  finMantenimiento: z.string().min(1, "La hora de finalización es requerida."),
  filtroMaquinaTecnopack: z.string().optional(),
  filtro16Boquillas: z.string().optional(),
  filtro6Boquillas: z.string().optional(),
  filtroBolsaManual: z.string().optional(),
  filtroEmpaque: z.string().optional(),
  filtroDoyPackSalsas: z.string().optional(),
  filtroDoyPackFrutos: z.string().optional(),
  filtroEmerito: z.string().optional(),
  filtroPiso1: z.string().optional(),
  filtroPiso2: z.string().optional(),
  filtroTerraza: z.string().optional(),
  filtroGeneral: z.string().optional(),
  filtroCuartoMaquinas: z.string().optional(),
  filtroCuartoPtar: z.string().optional(),
  filtroBodegas: z.string().optional(),
  filtroCodificadora: z.string().optional(),
  filtroTwisOff: z.string().optional(),
  reporteTecnico: z.string().min(10, "Describe el reporte técnico."),
  repuestosMateriales: z.string().min(3, "Indica los repuestos o materiales empleados."),
  cantidadRepuestos: z.number().min(0, "Ingresa la cantidad utilizada."),
  tecnico: z.string().min(1, "Selecciona o escribe el técnico."),
  observaciones: z.string().optional(),
})

export function MachineryForm() {
  const { toast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipoMantenimiento: "Correctivo",
      inicioMantenimiento: "",
      finMantenimiento: "",
      filtroMaquinaTecnopack: "",
      filtro16Boquillas: "",
      filtro6Boquillas: "",
      filtroBolsaManual: "",
      filtroEmpaque: "",
      filtroDoyPackSalsas: "",
      filtroDoyPackFrutos: "",
      filtroEmerito: "",
      filtroPiso1: "",
      filtroPiso2: "",
      filtroTerraza: "",
      filtroGeneral: "",
      filtroCuartoMaquinas: "",
      filtroCuartoPtar: "",
      filtroBodegas: "",
      filtroCodificadora: "",
      filtroTwisOff: "",
      reporteTecnico: "",
      repuestosMateriales: "",
      cantidadRepuestos: 0,
      tecnico: "",
      observaciones: "",
    },
  })

  function onSubmit(_values: z.infer<typeof formSchema>) {
    toast({
      title: "Registro Guardado",
      description: "El formato RE-MTT-007 ha sido registrado.",
    })
    form.reset()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="tipoMantenimiento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Mantenimiento</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Correctivo">Correctivo</SelectItem>
                  <SelectItem value="Preventivo">Preventivo</SelectItem>
                  <SelectItem value="Rutinario">Rutinario</SelectItem>
                  <SelectItem value="Emergencia">Emergencia</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="inicioMantenimiento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inicio del Mantenimiento</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="finMantenimiento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fin del Mantenimiento</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">Filtros atendidos</h3>
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            {filterFields.map(({ name, label }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input placeholder="Registro pendiente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        <FormField
          control={form.control}
          name="reporteTecnico"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reporte Técnico</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalle técnico del mantenimiento realizado..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="repuestosMateriales"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repuestos o Materiales Empleados</FormLabel>
              <FormControl>
                <Textarea placeholder="Lista de repuestos, materiales y consumibles utilizados..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cantidadRepuestos"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cantidad de Repuestos / Materiales Utilizados</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
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
              label="Técnico Responsable"
              placeholder="Selecciona un técnico"
              inputPlaceholder="Escribe el nombre del técnico"
            />
          )}
        />
        <FormField
          control={form.control}
          name="observaciones"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones / Recomendaciones</FormLabel>
              <FormControl>
                <Textarea placeholder="Recomendaciones, hallazgos adicionales o notas..." {...field} />
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
