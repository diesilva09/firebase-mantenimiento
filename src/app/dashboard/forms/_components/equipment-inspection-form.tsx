"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { TechnicianSelectField } from "./technician-select-field"
import { useEffect, useMemo, useState } from "react"

const formSchema = z.object({
  equipo: z.string().min(1, "El nombre del equipo es requerido."),
  responsable: z.string().min(1, "Debe registrar un responsable."),
  tipoInspeccion: z.enum(["Preventiva", "Correctiva", "Rutinaria"]),
  estado: z.enum(["Operativo", "Con fallas", "Fuera de servicio"]),
  observaciones: z.string().min(1, "Las observaciones son requeridas."),
})

type EquipmentLookup = { codigo: string; nombre: string; area?: string | null; linea?: string | null }

export function EquipmentInspectionForm() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const [equipos, setEquipos] = useState<EquipmentLookup[]>([])
  const [equipoQuery, setEquipoQuery] = useState("")
  const [showEquipoSuggestions, setShowEquipoSuggestions] = useState(false)
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      equipo: "",
      responsable: "",
      tipoInspeccion: "Rutinaria",
      estado: "Operativo",
      observaciones: "",
    },
  })

  useEffect(() => {
    const fetchEquipos = async () => {
      try {
        const response = await fetch('/api/equipos')
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        const equiposData = Array.isArray(data?.data) ? data.data : []

        const mapped: EquipmentLookup[] = equiposData
          .filter((e: any) => e && typeof e.codigo === "string" && typeof e.nombre === "string")
          .map((e: any) => ({
            codigo: e.codigo,
            nombre: e.nombre,
            area: e.area ?? null,
            linea: e.linea ?? null,
          }))

        setEquipos(mapped)
      } catch (e) {
        console.warn("No se pudo cargar la lista de equipos desde la API para autocompletar", e)

        // Fallback a localStorage si la API falla
        try {
          const raw = typeof window !== "undefined" ? localStorage.getItem("equipos") : null
          if (!raw) return
          const parsed = JSON.parse(raw) as any[]
          const mapped: EquipmentLookup[] = parsed
            .filter((e) => e && typeof e.codigo === "string" && typeof e.nombre === "string")
            .map((e) => ({
              codigo: e.codigo,
              nombre: e.nombre,
              area: e.area ?? null,
              linea: e.linea ?? null,
            }))
          setEquipos(mapped)
        } catch (localError) {
          console.warn("Fallback a localStorage para equipos también falló", localError)
        }
      }
    }

    fetchEquipos()
  }, [])

  const filteredEquipos = useMemo(() => {
    const q = equipoQuery.trim().toLowerCase()
    if (!q) return equipos.slice(0, 10)
    return equipos
      .filter(
        (e) =>
          e.codigo.toLowerCase().includes(q) ||
          e.nombre.toLowerCase().includes(q)
      )
      .slice(0, 10)
  }, [equipoQuery, equipos])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    
    try {
      // Asegurar que en la BD se guarde solo el código limpio del equipo
      const codigoEquipo = values.equipo.split(' - ')[0].trim()

      const payload = {
        ...values,
        equipo: codigoEquipo,
      }

      const response = await fetch('/api/equipment-inspections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "✅ Inspección Guardada",
          description: "La inspección de equipos ha sido registrada exitosamente.",
        })
        form.reset()
      } else {
        throw new Error(result.error || result.details)
      }
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: "❌ Error",
        description: error.message || "No se pudo guardar la inspección.",
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
          name="equipo"
          render={({ field }) => (
            <FormItem className="relative">
              <FormLabel>Nombre del Equipo</FormLabel>
              <FormControl>
                <Input
                  placeholder=""
                  value={equipoQuery}
                  onChange={(e) => {
                    const v = e.target.value
                    setEquipoQuery(v)
                    field.onChange(v)
                    setShowEquipoSuggestions(true)
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowEquipoSuggestions(false), 150)
                  }}
                  onFocus={() => {
                    if (equipoQuery) setShowEquipoSuggestions(true)
                  }}
                />
              </FormControl>
              {showEquipoSuggestions && filteredEquipos.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover text-xs shadow-md">
                  {filteredEquipos.map((e) => (
                    <button
                      type="button"
                      key={e.codigo}
                      className="flex w-full flex-col items-start px-2 py-1.5 text-left hover:bg-accent"
                      onMouseDown={(ev) => {
                        ev.preventDefault()
                        const areaText = e.area ?? "Sin área"
                        const lineaText = e.linea ?? "Sin línea"
                        const label = `${e.codigo} - ${areaText}${e.linea ? ` - ${lineaText}` : ""} - ${e.nombre}`
                        setEquipoQuery(label)
                        field.onChange(label)
                        setShowEquipoSuggestions(false)
                      }}
                    >
                      <span className="font-medium">{e.codigo}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {e.area ?? "Sin área"}
                        {e.linea ? ` • ${e.linea}` : ""}
                        {` • ${e.nombre}`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
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
              label="Responsable de la Inspección"
              placeholder="Selecciona un responsable"
              inputPlaceholder="Escribe el nombre del responsable"
            />
          )}
        />
        <FormField
          control={form.control}
          name="tipoInspeccion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Inspección</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Preventiva">Preventiva</SelectItem>
                  <SelectItem value="Correctiva">Correctiva</SelectItem>
                  <SelectItem value="Rutinaria">Rutinaria</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="estado"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Estado del Equipo</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Operativo" />
                    </FormControl>
                    <FormLabel className="font-normal">Operativo</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Con fallas" />
                    </FormControl>
                    <FormLabel className="font-normal">Con fallas</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Fuera de servicio" />
                    </FormControl>
                    <FormLabel className="font-normal">Fuera de servicio</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="observaciones"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones</FormLabel>
              <FormControl>
                <Textarea placeholder="" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : "Guardar Inspección"}
        </Button>
      </form>
    </Form>
  )
}