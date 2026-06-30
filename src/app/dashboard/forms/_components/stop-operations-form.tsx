"use client"

import { useEffect, useMemo, useState } from "react"
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
import { TechnicianSelectField } from "./technician-select-field"

const formSchema = z.object({
  maquina: z.string().min(1, "El nombre de la máquina es requerido."),
  codigoEquipo: z.string().optional(),
  referencia: z.string().min(1, "La referencia es requerida."),
  fechaParada: z.date({ required_error: "La fecha es requerida." }),
  horaParada: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)."),
  duracion: z.number().min(1, "La duración debe ser al menos 1 minuto."),
  tipoParada: z.enum(["Programada", "No programada", "Calidad"]),
  motivo: z.string().min(5, "El motivo es requerido."),
  impacto: z.string().optional(),
  observaciones: z.string().optional(),
  tecnico: z.string().min(1, "Selecciona el técnico encargado."),
})

export function StopOperationsForm() {
  const { toast } = useToast()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      maquina: "",
      codigoEquipo: "",
      referencia: "",
      horaParada: "",
      motivo: "",
      tipoParada: "No programada",
      impacto: "",
      observaciones: "",
      tecnico: "",
    },
  })

  type EquipmentLookup = { codigo: string; nombre: string; area?: string | null; linea?: string | null }

  const [equipos, setEquipos] = useState<EquipmentLookup[]>([])
  const [maquinaQuery, setMaquinaQuery] = useState("")
  const [showMaquinaSuggestions, setShowMaquinaSuggestions] = useState(false)

  useEffect(() => {
    const fetchEquipos = async () => {
      try {
        const response = await fetch('/api/equipos');
        const data = await response.json();
        const equiposData = data.data || [];

        const mapped: EquipmentLookup[] = equiposData
          .filter((e: any) => e && typeof e.codigo === "string" && typeof e.nombre === "string")
          .map((e: any) => ({
            codigo: e.codigo,
            nombre: e.nombre,
            area: e.area ?? null,
            linea: e.linea ?? null,
          }));

        setEquipos(mapped);
      } catch (e) {
        console.warn("No se pudo cargar la lista de equipos desde la API", e);

        // Fallback a localStorage si la API falla
        try {
          const raw = typeof window !== "undefined" ? localStorage.getItem("equipos") : null;
          if (!raw) return;
          const parsed = JSON.parse(raw) as any[];
          const mapped: EquipmentLookup[] = parsed
            .filter((e) => e && typeof e.codigo === "string" && typeof e.nombre === "string")
            .map((e) => ({
              codigo: e.codigo,
              nombre: e.nombre,
              area: e.area ?? null,
              linea: e.linea ?? null,
            }));
          setEquipos(mapped);
        } catch (localError) {
          console.warn("Fallback a localStorage también falló", localError);
        }
      }
    };

    fetchEquipos();
  }, []);
  const filteredEquipos = useMemo(() => {
    const q = maquinaQuery.trim().toLowerCase()
    if (!q) return []
    return equipos.filter(
      (e) =>
        e.codigo.toLowerCase().includes(q) ||
        e.nombre.toLowerCase().includes(q),
    ).slice(0, 10)
  }, [maquinaQuery, equipos])

  async function onSubmit(values: z.infer<typeof formSchema>) {
  try {
    // Extraer código del equipo del formato "CODIGO - Nombre"
    const codigoEquipo = values.codigoEquipo || values.maquina.split(' - ')[0];
    
    // Preparar datos para la base de datos
    const paradaData = {
      codigo_equipo: codigoEquipo,
      referencia: values.referencia,
      fecha_parada: values.fechaParada.toISOString().split('T')[0],
      hora_parada: values.horaParada,
      duracion_min: values.duracion,
      tipo_parada: values.tipoParada,
      motivo: values.motivo,
      impacto_produccion: values.impacto,
      observaciones: values.observaciones,
      tecnico_encargado: values.tecnico,
    };

    // Guardar en la base de datos
    const response = await fetch('/api/paradas-operativas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paradaData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al guardar en la BD');
    }

    const nuevaParada = await response.json();

    // Opcional: mantener compatibilidad con localStorage temporalmente
    try {
      const fechaIso = values.fechaParada instanceof Date ? values.fechaParada.toISOString() : new Date().toISOString();
      const fecha = fechaIso.slice(0, 10);
      const entry = {
        ...values,
        fecha,
        createdAt: new Date().toISOString(),
      };

      const raw = typeof window !== "undefined" ? localStorage.getItem("paradasOperativas") : null;
      const arr = raw ? JSON.parse(raw) : [];
      const next = [entry, ...arr];
      localStorage.setItem("paradasOperativas", JSON.stringify(next));
    } catch (e) {
      console.warn("No se pudo guardar en localStorage", e);
    }

    toast({
      title: "Parada operativa guardada exitosamente",
      description: `La parada operativa ha sido registrada correctamente.`,
      variant: "success",
    });
    
    form.reset();
    setMaquinaQuery("");

  } catch (error) {
    console.error('Error guardando parada:', error);
    toast({
      title: "Error al guardar la parada",
      description: error instanceof Error ? error.message : "No se pudo guardar la parada",
      variant: "destructive",
    });
  }
}
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="maquina"
          render={({ field }) => (
            <FormItem className="relative">
              <FormLabel>Equipo</FormLabel>
              <FormControl>
                <Input
                  placeholder="Escribe el código o nombre del equipo"
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
                      className="flex w-full flex-col items-start px-2 py-1.5 text-left hover:bg-accent"
                      onMouseDown={(ev) => {
                        ev.preventDefault()
                        const areaText = e.area ?? "Sin área";
                        const lineaText = e.linea ?? "Sin línea";
                        const label = `${e.codigo} - ${areaText}${e.linea ? ` - ${lineaText}` : ""} - ${e.nombre}`;
                        setMaquinaQuery(label)
                        field.onChange(label)
                        form.setValue("codigoEquipo", e.codigo)
                        setShowMaquinaSuggestions(false)
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
          name="referencia"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Referencia</FormLabel>
              <FormControl>
                <Input placeholder="" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid md:grid-cols-3 gap-8">
            <FormField
                control={form.control}
                name="fechaParada"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Parada</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? (
                                format(field.value, "PPP")
                            ) : (
                                <span>Seleccione una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
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
                name="horaParada"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Hora de Parada</FormLabel>
                    <FormControl>
                        <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="duracion"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Duración (minutos)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ej: 30"
                        value={field.value === undefined || field.value === null ? "" : field.value}
                        onChange={(e) => {
                          const v = e.target.value

                          // Permitir campo vacío sin forzar 0 mientras el usuario escribe
                          if (v === "") {
                            field.onChange("")
                            return
                          }

                          const num = parseInt(v, 10)
                          if (Number.isNaN(num)) {
                            field.onChange("")
                          } else {
                            field.onChange(num)
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <FormField
          control={form.control}
          name="tipoParada"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Parada</FormLabel>
              <FormControl>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value as any)}
                >
                  <option value="Programada">Programada</option>
                  <option value="No programada">No programada</option>
                  <option value="Calidad">Calidad</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="motivo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo de la Parada</FormLabel>
              <FormControl>
                <Textarea placeholder="" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="impacto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Impacto en Producción (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="" {...field} />
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
              label="Técnico Encargado"
              placeholder="Selecciona un técnico"
              inputPlaceholder="Escribe el nombre del técnico"
            />
          )}
        />
        <Button type="submit">Registrar Parada</Button>
      </form>
    </Form>
  )
}
