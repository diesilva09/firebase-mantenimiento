"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { useFormPersistence } from "@/hooks/use-form-persistence"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TechnicianSelectField } from "./technician-select-field"
import { FolderOpen, ExternalLink, Image as ImageIcon, FileText, Folder, Link } from "lucide-react"
import { MultiFileUploader } from "@/components/multi-file-uploader"
import { useUser } from "@/firebase/auth/use-user"
import { useNotificationsContext as useNotifications } from "@/context/notifications-context"
import { emitLiveUpdate } from "@/hooks/use-live-refresh"

const formSchema = z.object({
  fecha: z.string().min(1, "La fecha es requerida."),
  equipo: z.string().optional(),
  codigoEquipo: z.string().optional(),
  zona: z.string().optional(),
  otro: z.string().optional(),
  tipoMantenimiento: z.enum(["Correctivo", "Preventivo", "Rutinario"]),
  descripcionFalla: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
  repuestos: z.string().min(1, "Registra los repuestos o materiales empleados."),
  prioridad: z.enum(["Urgente", "Alta", "Media", "Baja"]),
  responsableMantenimiento: z.string().min(1, "Indica quién ejecutó el mantenimiento."),
  observaciones: z.string().min(1, "Agrega observaciones o recomendaciones."),
  horaInicio: z.string().min(1, "La hora de inicio es requerida."),
  horaFin: z.string().min(1, "La hora de finalización es requerida."),
  imageBeforeUrl: z.string().optional().default(""),
  imageAfterUrl: z.string().optional().default(""),
  anexoUrl: z.string().optional().default(""),
})

export function MaintenanceOrderForm() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const { refreshNotifications } = useNotifications()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: new Date().toISOString().split('T')[0],
      equipo: "",
      codigoEquipo: "",
      zona: "",
      otro: "",
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

  // Persistencia del formulario
  const { clearPersistedData } = useFormPersistence<z.infer<typeof formSchema>>(
    "maintenance-order-form",
    form.control,
    form.setValue,
    form.watch,
    {
      excludeFields: ["imageBeforeUrl", "imageAfterUrl", "anexoUrl"],
    }
  )

  type EquipmentLookup = { codigo: string; nombre: string; area?: string | null; linea?: string | null }

  type ZonaLookup = { id: string; codigo: string | null; nombre: string; area: string | null; tipo: string; imagenes_folder_url?: string | null; attachments_url?: string | null }

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

  // Estado para información de carpetas de la zona seleccionada
  const [zonaInfo, setZonaInfo] = useState<EquipoInfo | null>(null)
  const [loadingZona, setLoadingZona] = useState(false)

  // Estado para la pestaña activa (equipo, locativo u otro)
  const [activeTab, setActiveTab] = useState<"equipo" | "locativo" | "otro">("equipo")
  const sourceRequestId = searchParams.get("sourceRequestId")
  const targetTabParam = searchParams.get("target")

  // Limpiar campos cuando cambia la pestaña
  useEffect(() => {
    if (activeTab === "equipo") {
      form.setValue("zona", "")
      form.setValue("otro", "")
      setZonaQuery("")
      setZonaInfo(null)
    } else if (activeTab === "locativo") {
      form.setValue("equipo", "")
      form.setValue("codigoEquipo", "")
      form.setValue("otro", "")
      setEquipoQuery("")
      setEquipoInfo(null)
    } else {
      form.setValue("equipo", "")
      form.setValue("codigoEquipo", "")
      form.setValue("zona", "")
      setEquipoQuery("")
      setZonaQuery("")
      setEquipoInfo(null)
      setZonaInfo(null)
    }
  }, [activeTab, form])

  useEffect(() => {
    if (targetTabParam === "equipo" || targetTabParam === "locativo" || targetTabParam === "otro") {
      setActiveTab(targetTabParam)
    }
  }, [targetTabParam])

  useEffect(() => {
    const requestId = sourceRequestId ? Number(sourceRequestId) : NaN
    if (!requestId || Number.isNaN(requestId)) {
      return
    }

    let cancelled = false

    const loadSourceRequest = async () => {
      try {
        const response = await fetch(`/api/solicitudes-mantenimiento?id=${requestId}`, {
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error("No se pudo cargar la solicitud de mantenimiento.")
        }

        const json = await response.json()
        const request = Array.isArray(json?.data) ? json.data[0] : null
        if (!request || cancelled) return

        form.setValue("fecha", request.fecha_solicitud || new Date().toISOString().split("T")[0])
        form.setValue("descripcionFalla", request.descripcion_solicitud || "")
        // La evidencia de la orden debe registrarse manualmente; no se hereda desde la solicitud.
        form.setValue("imageBeforeUrl", "")
        form.setValue("imageAfterUrl", "")
        form.setValue("anexoUrl", "")

        if (targetTabParam === "equipo") {
          form.setValue("equipo", request.area_equipo || "")
          setEquipoQuery(request.area_equipo || "")
        } else if (targetTabParam === "locativo") {
          form.setValue("zona", request.area_equipo || "")
          setZonaQuery(request.area_equipo || "")
        } else if (targetTabParam === "otro") {
          form.setValue("otro", request.area_equipo || "")
        }
      } catch (error) {
        console.error("Error loading source maintenance request:", error)
      }
    }

    loadSourceRequest()

    return () => {
      cancelled = true
    }
  }, [sourceRequestId, targetTabParam, form])

  // Función para extraer folder ID de un URL de carpeta de Drive
  const extractFolderId = (url: string | null | undefined): string | null => {
    if (!url) return null;
    // Patrón para URLs de carpetas de Drive: /folders/FOLDER_ID
    const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  // Función para validar si un URL de archivo pertenece a una carpeta específica
  const isUrlFromFolder = (fileUrl: string | null | undefined, folderUrl: string | null | undefined): boolean => {
    if (!fileUrl || !folderUrl) return true; // Si no hay carpeta configurada, no validar
    const folderId = extractFolderId(folderUrl);
    if (!folderId) return true; // Si no se puede extraer el ID, no validar
    // Verificar si el URL del archivo contiene referencias a la carpeta
    // Los URLs de archivos de Drive típicamente no contienen el folderId,
    // pero podemos verificar si el dominio es correcto
    return fileUrl.includes('drive.google.com') || fileUrl.includes('docs.google.com');
  };

  // Estado para prevenir doble envío del formulario
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estados para validación de URLs de Drive
  const [validationErrors, setValidationErrors] = useState<{
    imageBefore?: string;
    imageAfter?: string;
    anexo?: string;
  }>({});

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
          imagenes_folder_url: z.imagenes_folder_url ?? null,
          attachments_url: z.attachments_url ?? null,
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

  // Función para cargar información de carpetas de la zona
  const loadZonaInfo = (zona: ZonaLookup) => {
    setLoadingZona(true);
    try {
      setZonaInfo({
        imagenesFolderUrl: zona.imagenes_folder_url,
        attachmentsUrl: zona.attachments_url,
      });
    } catch (error) {
      console.warn('Error cargando info de la zona:', error);
      setZonaInfo(null);
    } finally {
      setLoadingZona(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
  // Prevenir doble envío
  if (isSubmitting) return;
  setIsSubmitting(true);

  try {
    // Validar según la pestaña activa
    if (activeTab === "equipo" && !values.equipo?.trim()) {
      throw new Error('Debe seleccionar un equipo.');
    }
    if (activeTab === "locativo" && !values.zona?.trim()) {
      throw new Error('Debe seleccionar una zona.');
    }
    if (activeTab === "otro" && !values.otro?.trim()) {
      throw new Error('Debe ingresar una referencia para la orden.');
    }

    // Extraer código del equipo si se seleccionó un equipo
    let codigoEquipo = values.codigoEquipo;

    // Si está en la pestaña equipo y hay un equipo seleccionado, intentar extraer el código
    if (activeTab === "equipo" && !codigoEquipo && values.equipo) {
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
      }
    }

    // Limpiar espacios
    codigoEquipo = codigoEquipo?.trim() || '';

    // Extraer código de zona si está en la pestaña locativo
    let codigoZona = null;
    if (activeTab === "locativo" && values.zona) {
      // Intentar formato "CODIGO - ..."
      const parts = values.zona.split(' - ');
      codigoZona = parts[0]?.trim() || null;
    }

    // Preparar datos para la base de datos
    const requestId = sourceRequestId ? Number(sourceRequestId) : null
    const isRequestedOrder = Boolean(requestId && !Number.isNaN(requestId))

    const ordenData = {
      codigo_equipo: activeTab === "equipo" ? codigoEquipo || null : null,
      zona: activeTab === "locativo" ? values.zona || null : null,
      referencia_otro: activeTab === "otro" ? values.otro || null : null,
      tipo_mantenimiento: values.tipoMantenimiento,
      fecha_solicitud: values.fecha,
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
      origen_orden: isRequestedOrder ? "solicitada" : "manual",
      solicitud_id: isRequestedOrder ? requestId : null,
      tipo_destino: activeTab,
    };

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
    const isDuplicatedOrder = Boolean(nuevaOrden?.duplicated)

    // Crear registro en la hoja de vida correspondiente
    if (!isDuplicatedOrder && activeTab === "equipo" && codigoEquipo) {
      // Guardar en equipos_historial
      try {
        const historialPayload = {
          codigoEquipo,
          tareaId: null,
          fechaEvento: values.fecha ? new Date(values.fecha).toISOString() : new Date().toISOString(),
          labor: values.descripcionFalla,
          tipoMantenimiento: values.tipoMantenimiento,
          repuestosUsados: values.repuestos,
          observaciones: values.observaciones,
          ejecutadoPor: values.responsableMantenimiento,
          creadoPor: null,
          imagenAntesUrl: values.imageBeforeUrl || null,
          imagenDespuesUrl: values.imageAfterUrl || null,
          anexoUrl: values.anexoUrl || null,
          esSolicitada: isRequestedOrder,
          solicitudId: isRequestedOrder ? requestId : null,
          origenOrden: isRequestedOrder ? "solicitada" : "manual",
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
    } else if (!isDuplicatedOrder && activeTab === "locativo" && codigoZona) {
      // Guardar en zonas_historial
      try {
        const historialPayload = {
          codigoZona,
          tareaId: null,
          fechaEvento: values.fecha ? new Date(values.fecha).toISOString() : new Date().toISOString(),
          labor: values.descripcionFalla,
          tipoMantenimiento: values.tipoMantenimiento,
          repuestosUsados: values.repuestos,
          observaciones: values.observaciones,
          ejecutadoPor: values.responsableMantenimiento,
          creadoPor: null,
          imagenAntesUrl: values.imageBeforeUrl || null,
          imagenDespuesUrl: values.imageAfterUrl || null,
          anexoUrl: values.anexoUrl || null,
          esSolicitada: isRequestedOrder,
          solicitudId: isRequestedOrder ? requestId : null,
          origenOrden: isRequestedOrder ? "solicitada" : "manual",
        };

        await fetch('/api/zonas/historial', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(historialPayload),
        });
      } catch (e) {
        console.warn('No se pudo registrar la orden en zonas_historial', e);
      }
    }

    if (isRequestedOrder) {
      const completeResponse = await fetch('/api/solicitudes-mantenimiento', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: requestId,
          estado: 'completado',
          ordenId: nuevaOrden.id ?? null,
          actorEmail: user?.email || null,
          actorUid: user?.uid || null,
        }),
      })

      const completeJson = await completeResponse.json().catch(() => ({}))
      if (!completeResponse.ok || completeJson?.success === false) {
        throw new Error(completeJson?.error || 'La orden se creó, pero no se pudo completar la solicitud.')
      }

      if (completeJson?.warning) {
        console.warn('Advertencia al completar la solicitud:', completeJson.warning)
      }
    }

    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("maintenanceOrders")
      }
    } catch (e) {
      console.warn("No se pudo limpiar el respaldo local de órdenes", e);
    }

    try {
      await refreshNotifications()
    } catch (error) {
      console.warn("No se pudieron refrescar las notificaciones", error)
    }

    emitLiveUpdate([
      "maintenance-orders",
      "maintenance-requests",
      "responses",
      "notifications",
      "equipment-history",
      "zone-history",
    ])

    toast({
      title: isDuplicatedOrder ? "Orden ya existente" : "✅ Orden Guardada en BD",
      description: isDuplicatedOrder
        ? "La solicitud ya tenía una orden creada y se reutilizó ese registro."
        : "Orden guardada exitosamente",
    });

    // Limpiar datos persistidos primero
    clearPersistedData();

    // Limpiar formulario y estados locales
    form.reset({
      fecha: new Date().toISOString().split('T')[0],
      equipo: "",
      codigoEquipo: "",
      zona: "",
      otro: "",
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
    });
    setEquipoQuery("");
    setZonaQuery("");
    setEquipoInfo(null);
    setZonaInfo(null);
    setActiveTab("equipo");
  } catch (error) {
    console.error('Error guardando orden:', error);
    toast({
      title: "Error al guardar la orden",
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
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "equipo" | "locativo" | "otro")} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="equipo">Equipo</TabsTrigger>
            <TabsTrigger value="locativo">Locativo</TabsTrigger>
            <TabsTrigger value="otro">Otro</TabsTrigger>
          </TabsList>
          <TabsContent value="equipo" className="space-y-4 mt-4">
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
          </TabsContent>
          <TabsContent value="locativo" className="space-y-4 mt-4">
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
                        // Limpiar zonaInfo cuando se escribe manualmente
                        setZonaInfo(null)
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowZonaSuggestions(false)
                        }, 200)
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
                            // Formato completo: Código - Área - Nombre
                            const label = z.codigo
                              ? `${z.codigo} - ${z.area || 'Sin área'} - ${z.nombre}`
                              : (z.area ? `${z.area} - ${z.nombre}` : z.nombre);
                            setZonaQuery(label);
                            field.onChange(label);
                            loadZonaInfo(z);
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
          </TabsContent>
          <TabsContent value="otro" className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="otro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Otro</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Escribe el área, lugar, referencia o detalle correspondiente"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        <FormField
          control={form.control}
          name="fecha"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
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
              <Select onValueChange={field.onChange} value={field.value}>
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
        <div className="grid gap-6">
          <FormField
            control={form.control}
            name="prioridad"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridad</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
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
        <div className="grid gap-6 md:grid-cols-2">
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
          <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
            <FolderOpen className="h-4 w-4 text-primary" />
            Evidencia Fotográfica
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Imagen Antes */}
                <FormField
                  control={form.control}
                  name="imageBeforeUrl"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-semibold text-slate-700">Fotos del Antes</FormLabel>
                      <FormControl>
                        <MultiFileUploader
                          value={field.value || ""}
                          onChange={field.onChange}
                          accept="image/*"
                          label="Fotos Antes"
                          isImageOnly={true}
                          maxFiles={5}
                          showCamera={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Imagen Después */}
                <FormField
                  control={form.control}
                  name="imageAfterUrl"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-semibold text-slate-700">Fotos del Después</FormLabel>
                      <FormControl>
                        <MultiFileUploader
                          value={field.value || ""}
                          onChange={field.onChange}
                          accept="image/*"
                          label="Fotos Después"
                          isImageOnly={true}
                          maxFiles={5}
                          showCamera={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Sección de Anexos */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                <FileText className="h-4 w-4 text-primary" />
                Archivos Adjuntos (Anexos)
              </h3>

              <FormField
                control={form.control}
                name="anexoUrl"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormControl>
                      <MultiFileUploader
                        value={field.value || ""}
                        onChange={field.onChange}
                        accept="*/*"
                        label="Archivos Anexos"
                        isImageOnly={false}
                        maxFiles={5}
                        showCamera={false}
                        maxSizeMB={null}
                      />
                    </FormControl>
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
