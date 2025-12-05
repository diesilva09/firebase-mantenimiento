"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { TechnicianSelectField } from "./technician-select-field"
import { useEffect, useMemo, useState } from "react"

const formSchema = z.object({
  repuesto: z.string().min(1, "El repuesto es requerido."),
  cantidad: z.number().min(1, "Mínimo 1 unidad."),
  maquina: z.string().min(1, "Indica la máquina que lo requiere."),
  locativo: z.string().min(1, "Indica el destino locativo."),
  tecnico: z.string().min(1, "Selecciona o escribe el técnico solicitante."),
})

type EquipmentLookup = { codigo: string; nombre: string }

export function SparesRequestForm() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const [equipos, setEquipos] = useState<EquipmentLookup[]>([])
  const [maquinaQuery, setMaquinaQuery] = useState("")
  const [showMaquinaSuggestions, setShowMaquinaSuggestions] = useState(false)
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      repuesto: "",
      cantidad: 1,
      maquina: "",
      locativo: "",
      tecnico: "",
    },
  })

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("equipos") : null
      if (!raw) return
      const parsed = JSON.parse(raw) as any[]
      const mapped: EquipmentLookup[] = parsed
        .filter((e) => e && typeof e.codigo === "string" && typeof e.nombre === "string")
        .map((e) => ({ codigo: e.codigo, nombre: e.nombre }))
      setEquipos(mapped)
    } catch (e) {
      console.warn("No se pudo cargar la lista de equipos para autocompletar", e)
    }
  }, [])

  const filteredEquipos = useMemo(() => {
    const q = maquinaQuery.trim().toLowerCase()
    if (!q) return []
    return equipos
      .filter(
        (e) =>
          e.codigo.toLowerCase().includes(q) ||
          e.nombre.toLowerCase().includes(q)
      )
      .slice(0, 10)
  }, [maquinaQuery, equipos])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/spares-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "✅ Solicitud Creada",
          description: "La solicitud de repuestos ha sido enviada y guardada.",
        })
        form.reset()
      } else {
        throw new Error(result.error || result.details)
      }
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: "❌ Error",
        description: error.message || "No se pudo guardar la solicitud.",
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
          name="repuesto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repuesto Requerido</FormLabel>
              <FormControl>
                <Textarea placeholder="Ej: Filtro de aceite 10 micras" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cantidad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cantidad</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min={1} 
                  {...field} 
                  onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="maquina"
          render={({ field }) => (
            <FormItem className="relative">
              <FormLabel>Máquina que requiere el repuesto</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: Compresor Atlas Copco"
                  value={maquinaQuery}
                  onChange={(e) => {
                    const v = e.target.value
                    setMaquinaQuery(v)
                    field.onChange(v)
                    setShowMaquinaSuggestions(true)
                  }}
                  onFocus={() => {
                    if (maquinaQuery) setShowMaquinaSuggestions(true)
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowMaquinaSuggestions(false), 150)
                  }}
                />
              </FormControl>
              {showMaquinaSuggestions && filteredEquipos.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover text-xs shadow-md">
                  {filteredEquipos.map((e) => (
                    <button
                      type="button"
                      key={e.codigo}
                      className="flex w-full items-start gap-2 px-2 py-1.5 text-left hover:bg-accent"
                      onMouseDown={(ev) => {
                        ev.preventDefault()
                        const label = `${e.codigo} - ${e.nombre}`
                        setMaquinaQuery(label)
                        field.onChange(label)
                        setShowMaquinaSuggestions(false)
                      }}
                    >
                      <span className="font-medium">{e.codigo}</span>
                      <span className="text-[11px] text-muted-foreground">{e.nombre}</span>
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
          name="locativo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Locativo destino</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Taller de mantenimiento, Línea 2" {...field} />
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
              label="Técnico que solicita"
              placeholder="Selecciona un técnico"
              inputPlaceholder="Escribe el nombre del técnico"
            />
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : "Guardar Solicitud"}
        </Button>
      </form>
    </Form>
  )
}