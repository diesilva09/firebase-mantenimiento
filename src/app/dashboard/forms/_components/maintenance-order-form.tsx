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
import { AlertCircle, FolderOpen, ExternalLink, Image as ImageIcon, FileText, Folder, Link } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  imageBeforeUrl: z.string().url().optional().or(z.literal("")),
  imageAfterUrl: z.string().url().optional().or(z.literal("")),
  anexoUrl: z.string().url().optional().or(z.literal("")),
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
      imageBeforeUrl: "",
      imageAfterUrl: "",
      anexoUrl: "",
    },
  })

  type EquipmentLookup = { codigo: string; nombre: string; area?: string | null; linea?: string | null }

  type ZonaLookup = { id: string; codigo: string | null; nombre: string; area: string | null; tipo: string }

  const [equipos, setEquipos] = useState<EquipmentLookup[]>([])
  const [equipoQuery, setEquipoQuery] = useState("")
  const [showEquipoSuggestions, setShowEquipoSuggestions] = useState(false)

  const [zonas, setZonas] = useState<ZonaLookup[]>([])
  const [zonaQuery, setZonaQuery] = useState("")
  const [showZonaSuggestions, setShowZonaSuggestions] = useState(false)

  // Estado para información de carpetas del equipo seleccionado
  interface EquipoInfo {
    imagenesFolderUrl?: string | null
    attachmentsUrl?: string | null
  }
  const [equipoInfo, setEquipoInfo] = useState<EquipoInfo | null>(null)
  const [loadingEquipo, setLoadingEquipo] = useState(false)

  // Estado para prevenir doble envío del formulario
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // 1. Estrategia Cache-First: Cargar inmediatamente del almacenamiento local si existe
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("equipos") : null
      if (raw) {
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
      }
    } catch (e) { console.warn("Error leyendo caché local", e) }

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

        console.log('Equipos cargados desde API:', mapped.length, 'Primeros 5:', mapped.slice(0, 5).map(e => e.codigo));
        setEquipos(mapped)
        
        // Guardar en caché LIGERO (solo campos necesarios para evitar quota exceeded)
        if (typeof window !== "undefined" && Array.isArray(equiposData)) {
           try {
             const liteData = equiposData.map((e: any) => ({
               id: e.id,
               codigo: e.codigo,
               nombre: e.nombre,
               area: e.area,
               linea: e.linea,
             }))
             localStorage.setItem("equipos", JSON.stringify(liteData))
           } catch (storageError) {
             console.warn('No se pudo guardar en localStorage (quota exceeded):', storageError);
           }
        }
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
        console.warn("Fallo carga de red, usando versión en caché si existe", e)
        // No necesitamos fallback aquí porque ya cargamos el caché al principio
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
          codigo: z.codigo ?? null,
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
    if (!q) {
      return [];
    }
    const qDigits = q.replace(/\D/g, '');
    // Buscar en código y nombre, y también por números (ej: buscar "009" encuentra "EQT-009")
    const filtered = equipos.filter(
      (e) => {
        // Validar que el equipo tenga código y nombre válidos
        if (!e || typeof e.codigo !== 'string' || typeof e.nombre !== 'string') {
          return false;
        }
        const codigoLower = e.codigo.toLowerCase();
        const nombreLower = e.nombre.toLowerCase();
        // Buscar en código o nombre
        if (codigoLower.includes(q) || nombreLower.includes(q)) {
          return true;
        }
        // Solo buscar por números si la query tiene dígitos
        if (qDigits && qDigits.length > 0) {
          const codeDigits = e.codigo.replace(/\D/g, '');
          return codeDigits.includes(qDigits);
        }
        return false;
      }
    );
    return filtered.slice(0, 50); // Limitar a 50 resultados para mejor performance
  }, [equipoQuery, equipos])

  const filteredZonas = useMemo(() => {
    const q = zonaQuery.trim().toLowerCase();
    if (!q) return zonas;
    return zonas
      .filter((z) =>
        (z.area ?? "").toLowerCase().includes(q) ||
        z.nombre.toLowerCase().includes(q) ||
        (z.codigo ?? "").toLowerCase().includes(q)
      );
  }, [zonaQuery, zonas]);

  // Función para cargar información de carpetas del equipo
  const loadEquipoInfo = async (codigo: string) => {
    setLoadingEquipo(true);
    try {
      const res = await fetch('/api/equipos');
      if (res.ok) {
        const json = await res.json();
        const equipos = json.data || [];
        const equipo = equipos.find((e: any) => e.codigo === codigo);
        if (equipo) {
          setEquipoInfo({
            imagenesFolderUrl: equipo.imagenes_folder_url,
            attachmentsUrl: equipo.attachments_url,
          });
        } else {
          setEquipoInfo(null);
        }
      }
    } catch (error) {
      console.warn('Error cargando info del equipo:', error);
      setEquipoInfo(null);
    } finally {
      setLoadingEquipo(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
  // Prevenir doble envío
  if (isSubmitting) return;
  setIsSubmitting(true);

  try {
    // Extraer código del equipo
    let codigoEquipo = values.codigoEquipo;
    
    // Si no hay codigoEquipo guardado, intentar extraer del texto
    if (!codigoEquipo && values.equipo) {
      // Intentar formato "CODIGO - ..."
      const parts = values.equipo.split(' - ');
      codigoEquipo = parts[0];
      
      // Si no coincide con ningún equipo conocido, buscar en la lista
      const equipoEncontrado = equipos.find(e => 
        e.codigo === codigoEquipo || 
        e.nombre.toLowerCase() === values.equipo.toLowerCase() ||
        values.equipo.toLowerCase().includes(e.codigo.toLowerCase()) ||
        values.equipo.toLowerCase().includes(e.nombre.toLowerCase())
      );
      
      if (equipoEncontrado) {
        codigoEquipo = equipoEncontrado.codigo;
        console.log('Equipo encontrado por búsqueda:', equipoEncontrado.codigo, '-', equipoEncontrado.nombre);
      }
    }
    
    // Limpiar espacios y validar
    codigoEquipo = codigoEquipo?.trim() || '';
    
    if (!codigoEquipo) {
      throw new Error('No se pudo determinar el código del equipo. Por favor selecciona un equipo de la lista.');
    }
    
    console.log('Código de equipo final:', codigoEquipo, '| Input original:', values.equipo, '| CodigoEquipo guardado:', values.codigoEquipo);
    
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
      observaciones: values.observaciones,
      imagen_antes_url: values.imageBeforeUrl || null,
      imagen_despues_url: values.imageAfterUrl || null,
      anexo_url: values.anexoUrl || null,
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
        imagenAntesUrl: values.imageBeforeUrl || null,
        imagenDespuesUrl: values.imageAfterUrl || null,
        anexoUrl: values.anexoUrl || null,
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
  } finally {
    setIsSubmitting(false);
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
                    setShowEquipoSuggestions(true)
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowEquipoSuggestions(false), 150)
                  }}
                  autoComplete="off"
                />
              </FormControl>
              {showEquipoSuggestions && equipoQuery.trim() !== '' && (
                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover text-xs shadow-md">
                  {filteredEquipos.length === 0 ? (
                    <div className="px-3 py-2 text-muted-foreground">
                      No se encontraron equipos con "{equipoQuery}"
                    </div>
                  ) : (
                    filteredEquipos.map((e) => (
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
                          loadEquipoInfo(e.codigo)
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
                    ))
                  )}
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
                        const label = z.codigo || (z.area ? `${z.area} - ${z.nombre}` : z.nombre);
                        setZonaQuery(label);
                        field.onChange(label);
                        setShowZonaSuggestions(false);
                      }}
                    >
                      <span className="font-medium">{z.codigo || (z.area ?? "Sin área")}</span>
                      <span className="text-[11px] text-muted-foreground">{z.codigo ? `Código: ${z.codigo} • ` : ""}Zona • {z.nombre}</span>
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

        {/* Sección de Imágenes de Evidencia */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Imágenes de Evidencia (Antes/Después)
          </h3>

          {/* Estado de la carpeta de imágenes del equipo */}
          {loadingEquipo ? (
            <Alert className="bg-gray-50 border-gray-200">
              <AlertDescription className="text-sm">Cargando información del equipo...</AlertDescription>
            </Alert>
          ) : equipoInfo?.imagenesFolderUrl ? (
            <Alert className="bg-green-50 border-green-200">
              <FolderOpen className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-800">
                <strong>Carpeta de imágenes configurada:</strong>
                <a
                  href={equipoInfo.imagenesFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 ml-2 text-green-700 hover:underline"
                >
                  Abrir carpeta <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="default" className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-800">
                <strong>Sin carpeta configurada:</strong> Sube las imágenes a cualquier carpeta de Drive y pega los links aquí.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Link Imagen Antes */}
            <FormField
              control={form.control}
              name="imageBeforeUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    Link de Drive - Imagen Antes
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://drive.google.com/file/d/..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Pega el link de la imagen ya subida a Drive
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Link Imagen Después */}
            <FormField
              control={form.control}
              name="imageAfterUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    Link de Drive - Imagen Después
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://drive.google.com/file/d/..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Pega el link de la imagen ya subida a Drive
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Sección de Anexos */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Adjuntar Archivo (Anexo)
          </h3>

          {/* Estado de la carpeta de anexos del equipo */}
          {loadingEquipo ? (
            <Alert className="bg-gray-50 border-gray-200">
              <AlertDescription className="text-sm">Cargando información del equipo...</AlertDescription>
            </Alert>
          ) : equipoInfo?.attachmentsUrl ? (
            <Alert className="bg-blue-50 border-blue-200">
              <Folder className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                <strong>Carpeta de anexos configurada:</strong>
                <a
                  href={equipoInfo.attachmentsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 ml-2 text-blue-700 hover:underline"
                >
                  Abrir carpeta <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="default" className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-800">
                <strong>Sin carpeta de anexos:</strong> Sube el archivo a cualquier carpeta de Drive y pega el link aquí.
              </AlertDescription>
            </Alert>
          )}

          <FormField
            control={form.control}
            name="anexoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Link className="h-4 w-4 text-muted-foreground" />
                  Link de Drive - Archivo Anexo
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://drive.google.com/file/d/..."
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Pega el link del archivo (PDF, Word, Excel, etc.) ya subido a Drive
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar Orden"}
        </Button>
      </form>
    </Form>
  )
}
