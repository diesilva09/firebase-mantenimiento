"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { TechnicianSelectField } from "./technician-select-field"

const formSchema = z.object({
  equipo: z.string().min(1, "El nombre del equipo es requerido."),
  codigoEquipo: z.string().optional(),
  zona: z.string().optional(),
  tipoMantenimiento: z.enum(["Correctivo", "Preventivo", "Rutinario"]),
  descripcionFalla: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
  repuestos: z.string().min(1, "Registra los repuestos o materiales empleados."),
  prioridad: z.enum(["Urgente", "Alta", "Media", "Baja"]),
  responsableMantenimiento: z.string().min(1, "Indica quién ejecutó el mantenimiento."),
  observaciones: z.string().min(1, "Agrega observaciones o recomendaciones."),
  horaInicio: z.string().min(1, "La hora de inicio es requerida."),
  horaFin: z.string().min(1, "La hora de finalización es requerida."),
})

export function MaintenanceOrderForm() {
  const { toast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      equipo: "",
      codigoEquipo: "",
      zona: "",
      tipoMantenimiento: "Correctivo",
      descripcionFalla: "",
      repuestos: "",
      prioridad: "Media",
      responsableMantenimiento: "",
      observaciones: "",
      horaInicio: "",
      horaFin: "",
    },
  })

  type EquipmentLookup = { codigo: string; nombre: string; area?: string | null; linea?: string | null }

  type ZonaLookup = { id: string; nombre: string; area: string | null; tipo: string }

  const [equipos, setEquipos] = useState<EquipmentLookup[]>([])
  const [equipoQuery, setEquipoQuery] = useState("")
  const [showEquipoSuggestions, setShowEquipoSuggestions] = useState(false)

  const [zonas, setZonas] = useState<ZonaLookup[]>([])
  const [zonaQuery, setZonaQuery] = useState("")
  const [showZonaSuggestions, setShowZonaSuggestions] = useState(false)

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

  useEffect(() => {
    const fetchZonas = async () => {
      try {
        const res = await fetch("/api/zonas", { cache: 'no-store' });
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json().catch(() => ({}));
        const data = Array.isArray(json?.data) ? json.data : [];
        const mapped: ZonaLookup[] = data.map((z: any) => ({
          id: String(z.id),
          nombre: z.nombre ?? "",
          area: z.area ?? null,
          tipo: z.tipo ?? "",
        }));
        setZonas(mapped);
        
        if (typeof window !== "undefined") {
          localStorage.setItem("zonas", JSON.stringify(mapped));
        }
      } catch (e) {
        console.warn("No se pudo cargar la lista de zonas", e);
        try {
          const raw = typeof window !== "undefined" ? localStorage.getItem("zonas") : null;
          if (raw) setZonas(JSON.parse(raw));
        } catch (localError) {
          console.warn("Fallback localStorage zonas failed", localError);
        }
      }
    };

    fetchZonas();
  }, []);

  const filteredEquipos = useMemo(() => {
    const q = equipoQuery.trim().toLowerCase()
    if (!q) return []
    return equipos.filter(
      (e) =>
        e.codigo.toLowerCase().includes(q) ||
        e.nombre.toLowerCase().includes(q),
    ).slice(0, 10)
  }, [equipoQuery, equipos])

  const filteredZonas = useMemo(() => {
    const q = zonaQuery.trim().toLowerCase();
    if (!q) return zonas.slice(0, 10);
    return zonas
      .filter((z) =>
        (z.area ?? "").toLowerCase().includes(q) ||
        z.nombre.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [zonaQuery, zonas]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
  try {
    // Extraer código del equipo del formato "CODIGO - Nombre"
    const codigoEquipo = values.codigoEquipo || values.equipo.split(' - ')[0];
    
    // Preparar datos para la base de datos
    const ordenData = {
      codigo_equipo: codigoEquipo,
      zona: values.zona || null,
      tipo_mantenimiento: values.tipoMantenimiento,
      fecha_solicitud: new Date().toISOString().split('T')[0],
      responsable: values.responsableMantenimiento,
      descripcion_falla: values.descripcionFalla,
      repuestos_utilizados: values.repuestos,
      prioridad: values.prioridad,
      estado: 'abierta',
      hora_inicio: values.horaInicio,
      hora_fin: values.horaFin,
      observaciones: values.observaciones
    };

    console.log('Enviando orden a la BD:', ordenData);

    // Guardar en la base de datos
    const response = await fetch('/api/ordenes-mantenimiento', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ordenData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al guardar en la BD');
    }

    const nuevaOrden = await response.json();

    // También crear registro en la hoja de vida del equipo (equipos_historial)
    try {
      const historialPayload = {
        codigoEquipo,
        tareaId: null,
        fechaEvento: new Date().toISOString(),
        labor: values.descripcionFalla,
        tipoMantenimiento: values.tipoMantenimiento,
        repuestosUsados: values.repuestos,
        observaciones: values.observaciones,
        ejecutadoPor: values.responsableMantenimiento,
        creadoPor: null,
      };

      await fetch('/api/equipos/historial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(historialPayload),
      });
    } catch (e) {
      console.warn('No se pudo registrar la orden en equipos_historial', e);
    }

    // Opcional: mantener compatibilidad con localStorage temporalmente
    try {
      const fecha = new Date().toISOString().slice(0, 10);
      const entry = {
        ...values,
        fecha,
        createdAt: new Date().toISOString(),
      };

      const raw = typeof window !== "undefined" ? localStorage.getItem("maintenanceOrders") : null;
      const arr = raw ? JSON.parse(raw) : [];
      const next = [entry, ...arr];
      localStorage.setItem("maintenanceOrders", JSON.stringify(next));
    } catch (e) {
      console.warn("No se pudo guardar en localStorage", e);
    }

    toast({
      title: "✅ Orden Guardada en BD",
      description: `Orden guardada exitosamente`,
    });
    
    // Limpiar formulario
    form.reset();
    setEquipoQuery("");

  } catch (error) {
    console.error('Error guardando orden:', error);
    toast({
      title: "❌ Error",
      description: error instanceof Error ? error.message : "No se pudo guardar la orden",
      variant: "destructive",
    });
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
              <FormLabel>Equipo</FormLabel>
              <FormControl>
                <Input
                  placeholder="Escribe el código o nombre del equipo"
                  value={equipoQuery}
                  onChange={(e) => {
                    const v = e.target.value
                    setEquipoQuery(v)
                    field.onChange(v)
                    setShowEquipoSuggestions(true)
                  }}
                  onFocus={() => {
                    if (equipoQuery) setShowEquipoSuggestions(true)
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowEquipoSuggestions(false), 150)
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
                        form.setValue("codigoEquipo", e.codigo)
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
          name="zona"
          render={({ field }) => (
            <FormItem className="relative">
              <FormLabel>Zona</FormLabel>
              <FormControl>
                <Input
                  placeholder="Escribe la zona o área (cuando sea labor de mantenimiento locativo o partes altas)"
                  value={zonaQuery}
                  onChange={(e) => {
                    const v = e.target.value
                    setZonaQuery(v)
                    field.onChange(v)
                    setShowZonaSuggestions(true)
                  }}
                  onFocus={() => {
                    setShowZonaSuggestions(true)
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowZonaSuggestions(false), 150)
                  }}
                />
              </FormControl>
              {showZonaSuggestions && filteredZonas.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover text-xs shadow-md">
                  {filteredZonas.map((z) => (
                    <button
                      type="button"
                      key={z.id}
                      className="flex w-full flex-col items-start px-2 py-1.5 text-left hover:bg-accent"
                      onMouseDown={(ev) => {
                        ev.preventDefault();
                        const label = z.area ? `${z.area} - ${z.nombre}` : z.nombre;
                        setZonaQuery(label);
                        field.onChange(label);
                        setShowZonaSuggestions(false);
                      }}
                    >
                      <span className="font-medium">{z.area ?? "Sin área"}</span>
                      <span className="text-[11px] text-muted-foreground">Zona • {z.nombre}</span>
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
          name="tipoMantenimiento"
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
                  <SelectItem value="Rutinario">Rutinario</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="descripcionFalla"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción del trabajo realizado</FormLabel>
              <FormControl>
                <Textarea placeholder="Describa el trabajo realizado en el equipo..." {...field} />
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
              <FormLabel>Repuestos o Materiales Empleados</FormLabel>
              <FormControl>
                <Textarea placeholder="Lista los repuestos, cantidades o materiales utilizados..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="prioridad"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridad</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione la prioridad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Media">Media</SelectItem>
                    <SelectItem value="Baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="responsableMantenimiento"
          render={({ field }) => (
            <TechnicianSelectField
              field={field}
              label="Responsable del Mantenimiento"
              placeholder="Selecciona quien ejecutó"
              inputPlaceholder="Escribe el nombre del técnico"
            />
          )}
        />
        <FormField
          control={form.control}
          name="observaciones"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones o Recomendaciones</FormLabel>
              <FormControl>
                <Textarea placeholder="Registra hallazgos, recomendaciones o pasos siguientes..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="horaInicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora de Inicio</FormLabel>
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
                <FormLabel>Hora de Finalización</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit">Guardar Orden</Button>
      </form>
    </Form>
  )
}
