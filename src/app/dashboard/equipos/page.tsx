"use client"

import * as React from "react"
import { useEffect, useState, useRef, useCallback } from "react"

import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"

import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

import { Form, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useUser } from '@/firebase/auth/use-user'
import { useEquipos } from '@/hooks/use-equipos' 
import { useDashboardSearch, SearchSuggestion } from '@/context/dashboard-search-context'
import { EquipmentDetailModal } from "@/components/equipment-detail-modal"
import { useNotifications } from "@/hooks/use-notifications"

const equipmentSchema = z.object({
  codigo: z.string().min(1, "El código es requerido").max(50, "El código es muy largo"),
  version: z.string().max(20, "La versión es muy larga").optional(),
  fechaImplementacion: z.string().regex(/^\d{4}-\d{2}-\d{2}$|^\s*$|^$/, "Formato de fecha inválido (AAAA-MM-DD)").optional(),
  nombre: z.string().min(1, "El nombre es requerido").max(200, "El nombre es muy largo"),
  marca: z.string().max(100, "La marca es muy larga").optional(),
  modelo: z.string().max(100, "El modelo es muy largo").optional(),
  fabricante: z.string().max(100, "El fabricante es muy largo").optional(),
  fechaAdquisicion: z.string().regex(/^\d{4}-\d{2}-\d{2}$|^\s*$|^$/, "Formato de fecha inválido (AAAA-MM-DD)").optional(),
  image: z.any().optional(),
  area: z.enum([
    "Conservas",
    "Etiquetado",
    "Salsas",
    "Frutos Secos",
    "Medicion",
    "PTAR",
    "Servicios de Apoyo",
    "Bodega",
    "Otros",
  ]).or(z.literal("")).optional(),
  linea: z.string().max(50, "La línea es muy larga").optional(),
  capacidad: z.string().max(50, "La capacidad es muy larga").optional(),
  amperaje: z.string().regex(/^[\d.]+\s*.*$|^\s*$|^$/, "Formato inválido para amperaje").optional(),
  potencia: z.string().max(50, "La potencia es muy larga").optional(),
  voltaje: z.string().regex(/^[\d.]+\s*.*$|^\s*$|^$/, "Formato inválido para voltaje").optional(),
  rpm: z.string().regex(/^\d+.*$|^\s*$|^$/, "Formato inválido para RPM").optional(),
  magnitudMedida: z.string().max(50, "La magnitud medida es muy larga").optional(),
  estado: z.enum(["Operativo", "En mantenimiento", "Fuera de servicio", "En backup"]).optional(),
  attachmentsUrl: z.string().optional().nullable(),
})

type EquipmentForm = z.infer<typeof equipmentSchema>

type UiStoredEquipment = Omit<EquipmentForm, "image"> & {
  id: string
  imageDataUrl?: string | null
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })
}

export default function EquiposPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const selectedCodigoFromQuery = searchParams.get("selectedCodigo") || null

  const initialView = (searchParams.get("view") as "form" | "list") || (selectedCodigoFromQuery ? "list" : "form")

  const { user, loading: userLoading } = useUser()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  const { equipos, loading: equiposLoading, createEquipo, updateEquipo, deleteEquipo } = useEquipos()

  // Manejo de errores
  const [error, setError] = useState<string | null>(null)

  // Búsqueda global desde el header (solo para sugerencias, no para filtrar la lista)
  const { /* query, */ setSuggestions } = useDashboardSearch()

  // Registrar sugerencias globales para equipos (código + nombre + otros campos)
  useEffect(() => {
    const items: SearchSuggestion[] = equipos.map((e) => {
      const areaPart = e.area ? ` - ${e.area}` : ""
      const lineaPart = e.linea ? ` - ${e.linea}` : ""
      const label = `${e.codigo}${areaPart}${lineaPart} - ${e.nombre}`

      // Campos adicionales para mejorar la búsqueda
      const searchTerms = [
        e.codigo,
        e.nombre,
        e.area || '',
        e.linea || '',
        e.marca || '',
        e.modelo || '',
        e.estado || ''
      ].filter(Boolean).join(' ');

      return {
        id: e.id,
        label,
        type: 'equipo',
        searchTerms, // Campo adicional para mejorar la búsqueda
        // Desde el buscador global vamos a la vista de listado y resaltamos el equipo
        route: `/dashboard/equipos?view=list&selectedCodigo=${encodeURIComponent(e.codigo)}`,
      }
    });
    setSuggestions(items);
  }, [equipos, setSuggestions])

  useEffect(() => {
    let mounted = true

    async function checkAdmin() {
      setCheckingAdmin(true)

      try {
        if (user) {
          // Validar rol desde backend para mayor seguridad
          const response = await fetch('/api/auth/role', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.email,
              uid: user.uid,
            }),
          });

          if (response.ok) {
            const roleData = await response.json();
            if (mounted) setIsAdmin(roleData.isAdmin);
          } else {
            // Fallback a verificación local si la API falla
            const email = user.email?.toLowerCase().trim()
            if (email) {
              const adminEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
                .split(',')
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean)

              const isEnvAdmin = adminEnv.includes(email)
              if (mounted) setIsAdmin(isEnvAdmin)
            } else {
              if (mounted) setIsAdmin(false)
            }
          }
        } else {
          if (mounted) setIsAdmin(false)
        }
      } catch (error) {
        console.error('Error verificando rol de usuario:', error);
        // Fallback seguro
        const email = user?.email?.toLowerCase().trim()
        if (email) {
          const adminEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)

          const isEnvAdmin = adminEnv.includes(email)
          if (mounted) setIsAdmin(isEnvAdmin)
        } else {
          if (mounted) setIsAdmin(false)
        }
      } finally {
        if (mounted) setCheckingAdmin(false)
      }
    }


    checkAdmin()
    return () => {
      mounted = false
    }
  }, [user])
  const form = useForm<EquipmentForm>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      codigo: "",
      version: "",
      fechaImplementacion: "",
      nombre: "",
      marca: "",
      modelo: "",
      fabricante: "",
      fechaAdquisicion: "",
      image: undefined,
      area: "",
      linea: "",
      capacidad: "",
      amperaje: "",
      potencia: "",
      voltaje: "",
      rpm: "",
      magnitudMedida: "",
      estado: "Operativo",
      attachmentsUrl: "",
    },
  })

  const { toast } = useToast()

  const [view, setView] = useState<"form" | "list">(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("equiposView")
      if (saved === "form" || saved === "list") return saved
    }
    return initialView
  })

  const [filter, setFilter] = useState<
    | "all"
    | "Conservas"
    | "Etiquetado"
    | "Salsas"
    | "Frutos Secos"
    | "Medicion"
    | "PTAR"
    | "Servicios de Apoyo"
    | "Bodega"
    | "Otros"
  >("all")

  // Filtros adicionales
  const [estadoFilter, setEstadoFilter] = useState<string>("all") // "all", "Operativo", "En mantenimiento", "Fuera de servicio"
  const [editingId, setEditingId] = useState<string | null>(null)

  // Estado para rastrear si hay un código duplicado
  const [codigoDuplicado, setCodigoDuplicado] = useState<boolean>(false)

  // Estado para rastrear si hay una operación en curso
  const [operacionEnCurso, setOperacionEnCurso] = useState<boolean>(false)


  const AREAS = [
    "Conservas",
    "Etiquetado",
    "Salsas",
    "Frutos Secos",
    "Medicion",
    "PTAR",
    "Servicios de Apoyo",
    "Bodega",
    "Otros",
  ] as const

  const AREA_LABELS: Record<string,string> = {
    Conservas: 'Conservas',
    Etiquetado: 'Etiquetado',
    Salsas: 'Salsas',
    'Frutos Secos': 'Frutos secos',
    Medicion: 'Medición',
    PTAR: 'PTAR',
    'Servicios de Apoyo': 'Servicios de Apoyo',
    Bodega: 'Bodega',
    Otros: 'Otros',
  }

  const KNOWN_AREA_KEYS = AREAS.filter((a) => a !== 'Otros').map((a) => a.toLowerCase().trim())

  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>(() => {
    const obj: Record<string, boolean> = {}
    AREAS.forEach((a) => {
      // Todas las áreas empiezan ocultas por defecto
      obj[a] = false
    })
    return obj
  })

  // Estados para optimización de rendimiento
  const [visibleAreas, setVisibleAreas] = useState<Set<string>>(new Set())
  const areaRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const registerAreaRef = useCallback((area: string) => (element: HTMLDivElement | null) => {
    areaRefs.current[area] = element;
  }, []);

  // Detectar áreas visibles con Intersection Observer
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      // Si no hay soporte para IntersectionObserver, mostrar todas las áreas
      setVisibleAreas(new Set(AREAS));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target instanceof HTMLElement) {
            const area = entry.target.dataset.area;
            if (area) {
              setVisibleAreas((prev) => {
                const newSet = new Set(prev);
                if (entry.isIntersecting) {
                  newSet.add(area);
                } else {
                  newSet.delete(area);
                }
                return newSet;
              });
            }
          }
        });
      },
      { rootMargin: '50px 0px' } // Cargar 50px antes de que entre en la vista
    );

    AREAS.forEach((a) => {
      const element = areaRefs.current[a];
      if (element) {
        observer.observe(element);
      }
    });

    // Observar áreas inicialmente visibles
    return () => {
      observer.disconnect();
    };
  }, []);

  function toggleArea(a: string) {
    setExpandedAreas(prev => ({ ...prev, [a]: !prev[a] }))
  }

  const AREA_LINEAS: Record<string, string[]> = {
    Conservas: [
      'Tecnopack',
      'Selladora pedal neumatica',
      'Emerito',
      'Autoclave vertical',
      'Doy pack frutos',
      'Twist off',
      'Lagarde',
    ],
    Etiquetado: [
      'Equiteck 1',
      'Etiquetadora pegante',
      'Tunel termo gris',
      'Tunel termo',
      'Enfardadora',
    ],
    Salsas: [
      '6 Boquillas',
      '16 Boquillas',
      'Rotativa',
      'Doy pack salsas',
    ],
    'Frutos Secos': [
      'Selladora horizontal',
      'Selladora pedal',
    ],
    Medicion: [
      'Laboratorio planta',
      'Laboratorio Calidad',
      'Planta Preparacion',
      'Planta Envasado',
      'Laboratorio PTAR',
    ],
    PTAR: [
      'Tratamiento Agua',
    ],
    'Servicios de Apoyo': [
      'Cuarto Maquinas',
      'Taller',
      'Subestacion Electrica',
    ],
    Bodega: [
      'Materia Prima',
      'Producto Terminado',
    ],
  }

  const [lineFilters, setLineFilters] = useState<Record<string, string>>(() => ({}))
  function setLineFilter(area: string, value: string) {
    setLineFilters((prev) => ({ ...prev, [area]: value }))
  }

  // Código del equipo que debe aparecer resaltado (por ejemplo, cuando venimos del buscador global).
  // Usamos este estado en lugar de depender solo del parámetro de la URL para que el resaltado
  // dure más tiempo y no desaparezca inmediatamente después del scroll inicial.
  const [highlightedCodigo, setHighlightedCodigo] = useState<string | null>(null)

  // Cargar preferencias de vista, filtro de área y líneas desde localStorage (solo una vez)
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const savedFilter = window.localStorage.getItem("equiposFilter") as string | null
      if (savedFilter && (savedFilter === "all" || AREAS.includes(savedFilter as any))) {
        setFilter(savedFilter as any)
      }

      const rawLines = window.localStorage.getItem("equiposLineFilters")
      if (rawLines) {
        const parsed = JSON.parse(rawLines) as Record<string, string> | null
        if (parsed && typeof parsed === "object") {
          setLineFilters(parsed)
        }
      }
    } catch {
      // ignorar errores de parseo
    }
  }, [])

  // Guardar preferencias de vista, filtro y líneas en localStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem("equiposView", view)
      window.localStorage.setItem("equiposFilter", filter)
      window.localStorage.setItem("equiposLineFilters", JSON.stringify(lineFilters))
    } catch {
      // ignorar errores de escritura
    }
  }, [view, filter, lineFilters])

  // Equipo que se muestra en el modal de ficha técnica
  const [modalEquipmentCode, setModalEquipmentCode] = useState<string | null>(null)
  // Equipo pendiente de confirmar eliminación
  const [deleteTarget, setDeleteTarget] = useState<UiStoredEquipment | null>(null)
  // Código del equipo cuyo menú (tres puntos) está abierto
  const [menuForCode, setMenuForCode] = useState<string | null>(null)
  // Referencia al contenedor del menú de opciones para poder cerrar al hacer clic fuera
  const menuRef = useRef<HTMLDivElement | null>(null)
  // Estado para rastrear la carga de anexos
  const [loadingAnexos, setLoadingAnexos] = useState<string | null>(null)

  const modalEquipment = modalEquipmentCode
    ? equipos.find((e) => e.codigo === modalEquipmentCode)
    : null

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const imageFile = form.watch("image")

  useEffect(() => {
    let objectUrl: string | null = null;
    const fileList = imageFile as FileList | undefined;

    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    } else {
      setImagePreview(null);
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageFile]);


  const watchedArea = form.watch("area")
  const watchedCodigo = form.watch("codigo")

  // Validación en vivo: evitar códigos de equipo duplicados
  useEffect(() => {
    const raw = (watchedCodigo || "").toString().trim().toLowerCase()

    // Si no hay código, limpiar error y salir
    if (!raw) {
      form.clearErrors("codigo")
      setCodigoDuplicado(false)
      return
    }

    const hasDuplicate = equipos.some((e) => {
      const eqCodigo = (e.codigo || "").toString().trim().toLowerCase()
      // Si estamos editando, permitimos el mismo código en el mismo id
      if (editingId && e.id === editingId) return false
      return eqCodigo === raw
    })

    if (hasDuplicate) {
      form.setError("codigo", {
        type: "manual",
        message: "Ya existe un equipo con este código.",
      })
      setCodigoDuplicado(true)
    } else {
      form.clearErrors("codigo")
      setCodigoDuplicado(false)
    }
  }, [watchedCodigo, equipos, editingId, form])

  // Si venimos desde el buscador global con un código seleccionado,
  // asegurarnos de expandir el área y la línea correctas para que el equipo sea visible.
  useEffect(() => {
    if (!selectedCodigoFromQuery) return

    if (!equipos || equipos.length === 0) return

    const target = equipos.find((e) => e.codigo === selectedCodigoFromQuery)
    if (!target) return

    // Expandir el área correspondiente
    setExpandedAreas((prev) => ({
      ...prev,
      [target.area]: true,
    }))

    // Si el área tiene líneas y el equipo tiene línea, seleccionarla
    if (AREA_LINEAS[target.area] && target.linea) {
      setLineFilters((prev) => ({
        ...prev,
        [target.area]: target.linea as string,
      }))
    }

    // Marcar este equipo como resaltado para que el borde azul se mantenga visible
    // incluso después de limpiar el parámetro de la URL.
    setHighlightedCodigo(target.codigo)
  }, [selectedCodigoFromQuery, equipos])

  // Hacer scroll automático hasta la tarjeta del equipo buscado en la vista de listado
  // y limpiar el parámetro selectedCodigo de la URL para que no quede "pegado",
  // sin disparar una nueva navegación (para no perder el scroll).
  useEffect(() => {
    if (!selectedCodigoFromQuery) return
    if (view !== 'list') return
    if (typeof document === 'undefined' || typeof window === 'undefined') return

    const elementId = `equipo-${selectedCodigoFromQuery}`

    const tryScroll = () => {
      const el = document.getElementById(elementId)

      if (!el) return false

      el.scrollIntoView({ behavior: 'smooth', block: 'center' })

      // Limpiar selectedCodigo de la URL para que el resaltado sea solo una vez,
      // pero usando history.replaceState para no disparar una navegación ni resetear scroll
      const params = new URLSearchParams(window.location.search)
      params.delete('selectedCodigo')
      const queryString = params.toString()
      const newUrl = queryString ? `/dashboard/equipos?${queryString}` : '/dashboard/equipos'
      window.history.replaceState(null, '', newUrl)

      return true
    }

    // Intentar inmediatamente y, si aún no está montado el elemento,
    // volver a intentar después de un pequeño delay.
    if (!tryScroll()) {
      const timeout = setTimeout(() => {
        tryScroll()
      }, 300)

      return () => clearTimeout(timeout)
    }
  }, [selectedCodigoFromQuery, view, equipos])

  // Cerrar el menú de tres puntos al hacer clic fuera
  useEffect(() => {
    if (!menuForCode) return

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuForCode(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [menuForCode])

  async function onSubmit(values: EquipmentForm) {
    // Validar que no haya código duplicado antes de enviar
    if (codigoDuplicado && !editingId) {
      toast({
        title: "Error",
        description: "No se puede guardar un equipo con código duplicado.",
        variant: "destructive"
      });
      return;
    }

    // Activar indicador de operación en curso
    setOperacionEnCurso(true);

    // Mostrar feedback visual al usuario
    toast({
      title: editingId ? "Actualizando equipo..." : "Guardando equipo...",
      description: "Por favor espere mientras procesamos su solicitud."
    });

    // Normalizar datos: convertir string vacío de área a undefined para evitar errores
    const payload = {
      ...values,
      area: values.area === "" ? undefined : values.area,
      fechaImplementacion: values.fechaImplementacion === "" ? null : values.fechaImplementacion,
      fechaAdquisicion: values.fechaAdquisicion === "" ? null : values.fechaAdquisicion,
    };

    try {
      if (editingId) {
        // Llamar a la actualización real
        const success = await updateEquipo(editingId, payload as any)
        if (success) {
          setEditingId(null)
          form.reset()
          setView('list')
          // Limpiar cualquier resaltado previo (p. ej. venimos de una búsqueda)
          if (highlightedCodigo) setHighlightedCodigo(null)

          toast({
            title: "Equipo actualizado",
            description: "El equipo se ha actualizado correctamente."
          });

          toast({
            title: "Equipo creado",
            description: "El equipo se ha creado correctamente."
          });
        } else {
          toast({
            title: "Error",
            description: "No se pudo actualizar el equipo, por favor inténtelo de nuevo.",
            variant: "destructive"
          })
        }
      } else {
        // Llamar a la creación real
        const success = await createEquipo(payload as any)
        if (success) {
          form.reset()
          setView('list')
          // Limpiar resaltado previo al crear nuevo equipo
          if (highlightedCodigo) setHighlightedCodigo(null)

          toast({
            title: "Equipo creado",
            description: "El equipo se ha creado correctamente."
          });
        } else {
          toast({
            title: "Error",
            description: "No se pudo crear el equipo, por favor inténtelo de nuevo.",
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      console.error('Error en la operación:', error);
      toast({
        title: "Error de red",
        description: error instanceof Error ? error.message : "Ocurrió un error de red, por favor inténtelo de nuevo.",
        variant: "destructive"
      });
    } finally {
      // Desactivar indicador de operación en curso
      setOperacionEnCurso(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-2 sm:px-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Equipos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registrar un equipo ver el listado por area y linea</p>
        </div>
        <div className="flex flex-col gap-3 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button
              variant={view === "form" ? "default" : "ghost"}
              disabled={!isAdmin}
              className="w-full sm:w-auto"
              onClick={() => {
                // Al entrar a "Registrar" siempre preparamos el formulario para un equipo nuevo
                setEditingId(null)
                form.reset({
                  codigo: "",
                  version: "",
                  fechaImplementacion: "",
                  nombre: "",
                  marca: "",
                  modelo: "",
                  fabricante: "",
                  fechaAdquisicion: "",
                  image: undefined,
                  area: "",
                  linea: "",
                  capacidad: "",  
                  amperaje: "",
                  potencia: "",
                  voltaje: "",
                  rpm: "",
                  magnitudMedida: "",
                  estado: "Operativo",
                  attachmentsUrl: "",
                })
                setView("form")
              }}
            >
              Registrar
            </Button>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              onClick={() => setView("list")}
              className="w-full sm:w-auto"
            >
              Listado
            </Button>
          </div>

          {view === "list" && (
            <div className="flex flex-col gap-2 w-full">
              <div className="flex flex-col gap-1 w-full">
                <span className="text-sm font-medium text-muted-foreground text-left">Filtrar por estado:</span>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 w-full"
                  value={estadoFilter}
                  onChange={(e) => setEstadoFilter(e.target.value)}
                >
                  <option value="all">Todos los estados</option>
                  <option value="Operativo">Operativo</option>
                  <option value="En mantenimiento">En mantenimiento</option>
                  <option value="Fuera de servicio">Fuera de servicio</option>
                  <option value="En backup">En backup</option>
                </select>
              </div>
            </div>
          )}
        </div>
       
      </div>

      <div className="mt-6">
        {view === "form" ? (
          isAdmin ? (
            <div className="rounded-md border bg-card p-3 sm:p-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormItem>
                      <FormLabel>Codigo</FormLabel>
                      <FormControl>
                        <Input
                          {...form.register("codigo")}
                          className={`${codigoDuplicado && !editingId ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    <FormItem>
                      <FormLabel>Version</FormLabel>
                      <FormControl>
                        <Input {...form.register("version")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    <FormItem>
                      <FormLabel>Fecha de implementación</FormLabel>
                      <FormControl>
                        <Input type="date" {...form.register("fechaImplementacion")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    <FormItem>
                      <FormLabel>Nombre del equipo</FormLabel>
                      <FormControl>
                        <Input {...form.register("nombre")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl>
                        <Input {...form.register("marca")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    <FormItem>
                      <FormLabel>Modelo</FormLabel>
                      <FormControl>
                        <Input {...form.register("modelo")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    <FormItem>
                      <FormLabel>Fabricante</FormLabel>
                      <FormControl>
                        <Input {...form.register("fabricante")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    <FormItem>
                      <FormLabel>Fecha de adquisición</FormLabel>
                      <FormControl>
                        <Input type="date" {...form.register("fechaAdquisicion")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    <FormItem>
                      <FormLabel>Área</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          {...form.register("area")}
                          onKeyDown={(e) => {
                            // Prevenir que el scroll del mouse afecte la selección accidentalmente
                            if (e.key === 'Tab' || e.key === 'Enter' || e.key === 'Escape' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                              return; // Permitir teclas de navegación estándar
                            }
                            e.stopPropagation(); // Detener propagación para evitar problemas de scroll
                          }}
                          onMouseDown={(e) => {
                            // Prevenir el scroll en el contenedor padre
                            e.stopPropagation();
                          }}
                          onWheel={(e) => {
                            // Prevenir que el scroll del mouse afecte la interfaz global
                            e.stopPropagation();
                          }}
                        >
                          <option value="">Seleccione un área</option>
                          <option value="Conservas">Conservas</option>
                          <option value="Etiquetado">Etiquetado</option>
                          <option value="Salsas">Salsas</option>
                          <option value="Frutos Secos">Frutos secos</option>
                          <option value="Medicion">Medición</option>
                          <option value="PTAR">PTAR</option>
                          <option value="Servicios de Apoyo">Servicios de Apoyo</option>
                          <option value="Bodega">Bodega</option>
                          <option value="Otros">Otros</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    {watchedArea && AREA_LINEAS[watchedArea] && (
                      <FormItem>
                        <FormLabel>Línea</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none"
                            {...form.register("linea")}
                          >
                            <option value="">Seleccione una línea</option>
                            {AREA_LINEAS[watchedArea].map((linea) => (
                              <option key={linea} value={linea}>
                                {linea}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}

                    <FormItem>
                      <FormLabel>Imagen del equipo</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          {...form.register("image", {
                            validate: (value) => {
                              if (value && value[0]) {
                                const file = value[0];

                                // Validar tamaño (máximo 5MB)
                                if (file.size > 5 * 1024 * 1024) {
                                  return "La imagen debe ser menor a 5MB";
                                }

                                // Validar tipo
                                if (!file.type.startsWith('image/')) {
                                  return "Por favor seleccione un archivo de imagen válido";
                                }
                              }
                              return true;
                            }
                          })}
                        />
                      </FormControl>
                      <FormMessage />

                      {imagePreview && (
                        <div className="mt-2">
                          <img src={imagePreview} alt="preview" className="h-24 w-24 object-cover rounded-md border" />
                        </div>
                      )}
                    </FormItem>

                    <FormItem>
                      <FormLabel>Estado del equipo</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none"
                          {...form.register("estado")}
                        >
                          <option value="Operativo">Operativo</option>
                          <option value="En mantenimiento">En mantenimiento</option>
                          <option value="Fuera de servicio">Fuera de servicio</option>
                          <option value="En backup">En backup</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    <FormItem>
                      <FormLabel>URL carpeta Drive de anexos</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Pega aquí la URL de la carpeta de Drive para este equipo"
                          {...form.register("attachmentsUrl")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </div>

                  <Separator className="my-2" />

                  <h2 className="text-lg font-medium">Especificaciones técnicas</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormItem>
                      <FormLabel>Capacidad</FormLabel>
                      <FormControl>
                        <Input {...form.register("capacidad")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    <FormItem>
                      <FormLabel>Amperaje</FormLabel>
                      <FormControl>
                        <Input {...form.register("amperaje")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    <FormItem>
                      <FormLabel>Potencia</FormLabel>
                      <FormControl>
                        <Input {...form.register("potencia")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    <FormItem>
                      <FormLabel>Voltaje</FormLabel>
                      <FormControl>
                        <Input {...form.register("voltaje")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    <FormItem>
                      <FormLabel>RPM</FormLabel>
                      <FormControl>
                        <Input {...form.register("rpm")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                    <FormItem>
                      <FormLabel>Magnitud medida (si aplica)</FormLabel>
                      <FormControl>
                        <Input {...form.register("magnitudMedida")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={codigoDuplicado && !editingId || operacionEnCurso}
                    >
                      {operacionEnCurso ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {editingId ? "Actualizando..." : "Guardando..."}
                        </div>
                      ) : codigoDuplicado && !editingId ? (
                        "Código duplicado"
                      ) : (
                        "Guardar equipo"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          ) : (
            <div className="rounded-md border bg-card p-3 sm:p-4 text-sm text-muted-foreground">
              {checkingAdmin || userLoading ? (
                <div>Comprobando permisos...</div>
              ) : (
                <div>No estás autorizado para registrar equipos. Inicia sesión con una cuenta autorizada.</div>
              )}
            </div>
          )
        ) : (
          <div
            className="mx-auto"
            onClick={() => {
              // Cualquier clic general en la zona de listado limpia el resaltado automático
              // del equipo buscado, para que no quede "pegado" después de interactuar.
              if (highlightedCodigo) setHighlightedCodigo(null)
            }}
          >
            {equiposLoading ? (
              <div className="rounded-md border bg-card p-3 sm:p-4 text-sm text-muted-foreground flex items-center justify-center h-32">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                  <span>Cargando equipos...</span>
                </div>
              </div>
            ) : (
            <div className="space-y-4">
              {AREAS.map((a) => {
                const areaItems = equipos.filter((e) => {
                  const eqArea = (e.area ?? "").toString().toLowerCase().trim()

                  if (!eqArea) {
                    return a === 'Otros'
                  }

                  // En "Otros" mostramos equipos cuya área no coincide con ninguna área conocida
                  if (a === 'Otros') {
                    return !KNOWN_AREA_KEYS.includes(eqArea)
                  }

                  const areaKey = a.toLowerCase().trim()
                  return eqArea === areaKey
                })

                // Aplicar filtros adicionales
                const filteredByAdvancedFilters = areaItems.filter((e) => {
                  // Filtro por estado
                  if (estadoFilter !== "all" && e.estado !== estadoFilter) return false

                  return true
                })

                const isLineArea = Boolean(AREA_LINEAS[a])
                const selectedLine = isLineArea ? (lineFilters[a] ?? "") : ""
                const items = isLineArea
                  ? selectedLine
                    ? filteredByAdvancedFilters.filter((e) => {
                        const eqLine = (e.linea ?? "").toString().toLowerCase().trim()
                        const lineKey = selectedLine.toLowerCase().trim()

                        if (!lineKey) return true

                        // Si estamos buscando un equipo específico que no tiene línea, también debe aparecer
                        if (highlightedCodigo && e.codigo === highlightedCodigo && !eqLine) return true

                        // Aceptar coincidencia exacta o que la linea contenga el texto seleccionado
                        return eqLine === lineKey || eqLine.includes(lineKey)
                      })
                    : filteredByAdvancedFilters
                  : filteredByAdvancedFilters

                return (
                  <div
                    key={a}
                    data-area={a}
                    ref={registerAreaRef(a)}
                    className="rounded-md border bg-card p-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                      <div className="font-medium text-sm">
                        {AREA_LABELS[a] ?? a}{" "}
                        <span className="text-xs text-muted-foreground">({items.length})</span>
                      </div>
                      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 w-full sm:w-auto">
                        {isLineArea && (
                          <select
                            className="w-full sm:w-auto h-8 rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none"
                            value={selectedLine}
                            onChange={(e) => setLineFilter(a, e.target.value)}
                          >
                            <option value="">Seleccione línea</option>
                            {AREA_LINEAS[a].map((linea) => (
                              <option key={linea} value={linea}>
                                {linea}
                              </option>
                            ))}
                          </select>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full sm:w-auto"
                          onClick={() => toggleArea(a)}
                        >
                          {expandedAreas[a] ? "Ocultar" : "Ver"}
                        </Button>
                      </div>
                    </div>

                    {expandedAreas[a] && (
                      items.length === 0 ? (
                        <div className="rounded-md border bg-card p-3 sm:p-4 text-sm text-muted-foreground">
                          No hay equipos en esta área.
                        </div>
                      ) : (
                        <div className="max-h-[400px] overflow-y-auto pr-2 -mr-2 overscroll-contain">
                          <ul className="grid gap-3">
                          {items.map((e, index) => {
                            const isSelected = highlightedCodigo && e.codigo === highlightedCodigo
                            return (
                              <li
                                key={e.id}
                                id={`equipo-${e.codigo}`}
                                className={`relative flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 rounded-md border p-3 cursor-pointer hover:bg-accent/40 ${
                                  isSelected ? "border-blue-500 ring-2 ring-blue-300 bg-accent/40" : "bg-card"
                                }`}
                                onClick={(ev) => {
                                  // Evitar que el clic burbujee al contenedor y solo abra el modal.
                                  ev.stopPropagation()

                                  // Buscar el equipo actualizado en la lista más reciente
                                  const updatedEquipment = equipos.find(eq => eq.id === e.id)
                                  
                                  setModalEquipmentCode(e.codigo)

                                  // Una vez que el usuario interactúa con una tarjeta, limpiamos
                                  // el resaltado automático.
                                  if (highlightedCodigo) setHighlightedCodigo(null)
                                }}
                              >
                                <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                                  {e.imageDataUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={e.imageDataUrl} alt={e.nombre} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                      No imagen
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{e.nombre}</div>
                                      <div className="text-xs sm:text-sm text-muted-foreground truncate">
                                        {e.codigo} • {e.marca || 'Sin marca'} {e.modelo || ''}
                                      </div>
                                      {e.area && (
                                        <div className="text-xs text-muted-foreground truncate">
                                          Área: {e.area} {e.linea ? `• Línea: ${e.linea}` : ''}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-start sm:items-end gap-1 min-w-[120px]">
                                      {(() => {
                                        const estado = (e as any).estado || "Operativo"
                                        let classes =
                                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium mt-6 "
                                        if (estado === "Operativo") classes += "bg-green-100 text-green-800"
                                        else if (estado === "En mantenimiento") classes += "bg-yellow-100 text-yellow-800"
                                        else if (estado === "En backup") classes += "bg-blue-100 text-blue-800"
                                        else classes += "bg-red-100 text-red-800"
                                      
                                        return <span className={classes}>{estado}</span>
                                       
                                      
                                      })()}
                                    </div>
                                  </div>
                                  <div className="mt-2 text-sm text-muted-foreground">
                                    Capacidad: {e.capacidad ?? "-"} • Potencia: {e.potencia ?? "-"}
                                  </div>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="absolute right-2 top-2 h-7 w-7 text-muted-foreground"
                                  onClick={(ev) => {
                                    ev.stopPropagation()
                                    setMenuForCode((prev) => (prev === e.codigo ? null : e.codigo))
                                  }}
                                >
                                  ⋮
                                </Button>
                                <div className="absolute right-3 bottom-2 text-[11px] text-muted-foreground">
                                  #{index + 1}
                                </div>
                                {menuForCode === e.codigo && (
                                  <div
                                    ref={menuRef}
                                    className="absolute right-2 top-10 z-20 w-48 rounded-md border bg-popover text-xs shadow-md"
                                  >
                                    <div className="border-b px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                      Opciones
                                    </div>
                                    <div className="py-1">
                                      {isAdmin && (
                                        <>
                                          <button
                                            type="button"
                                            className="block w-full px-3 py-1.5 text-left hover:bg-accent"
                                            onClick={(ev) => {
                                              ev.stopPropagation()
                                              setMenuForCode(null)
                                              // Limpiar cualquier resaltado previo al editar para evitar
                                              // que otro equipo quede resaltado accidentalmente.
                                              if (highlightedCodigo) setHighlightedCodigo(null)
                                              setView("form")
                                              setEditingId(e.id)
                                              form.reset({
                                                codigo: e.codigo,
                                                version: e.version ?? null,
                                                fechaImplementacion: e.fechaImplementacion ?? null,
                                                nombre: e.nombre,
                                                marca: e.marca ?? null,
                                                modelo: e.modelo ?? null,
                                                fabricante: e.fabricante ?? null,
                                                fechaAdquisicion: e.fechaAdquisicion ?? null,
                                                image: undefined,
                                                area: e.area ?? "",
                                                linea: e.linea ?? null,
                                                capacidad: e.capacidad ?? null,
                                                amperaje: e.amperaje ?? null,
                                                potencia: e.potencia ?? null,
                                                voltaje: e.voltaje ?? null,
                                                rpm: e.rpm ?? null,
                                                magnitudMedida: e.magnitudMedida ?? null,
                                                estado: e.estado ?? "Operativo",
                                                attachmentsUrl: e.attachmentsUrl ?? null,
                                              })
                                            }}
                                          >
                                            Editar equipo
                                          </button>
                                          <button
                                            type="button"
                                            className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-accent/60"
                                            onClick={(ev) => {
                                              ev.stopPropagation()
                                              setDeleteTarget(e)
                                            }}
                                          >
                                            Eliminar equipo
                                          </button>
                                          <div className="my-1 border-t" />
                                        </>
                                      )}
                                      <Link
                                        href={`/dashboard/equipos/${encodeURIComponent(e.codigo)}?view=hoja-vida`}
                                        className="block px-3 py-1.5 hover:bg-accent"
                                        onClick={(ev) => {
                                          ev.stopPropagation()
                                          if (typeof window !== 'undefined') {
                                            const params = new URLSearchParams(window.location.search)
                                            params.set('view', 'list')
                                            params.set('selectedCodigo', e.codigo)
                                            const qs = params.toString()
                                            const newUrl = qs ? `/dashboard/equipos?${qs}` : '/dashboard/equipos'
                                            window.history.replaceState(null, '', newUrl)
                                          }
                                          setMenuForCode(null)
                                        }}
                                      >
                                        Hoja de vida
                                      </Link>
                                      <Link
                                        href={`/dashboard/equipos/${encodeURIComponent(e.codigo)}?view=paradas`}
                                        className="block px-3 py-1.5 hover:bg-accent"
                                        onClick={(ev) => {
                                          ev.stopPropagation()
                                          if (typeof window !== 'undefined') {
                                            const params = new URLSearchParams(window.location.search)
                                            params.set('view', 'list')
                                            params.set('selectedCodigo', e.codigo)
                                            const qs = params.toString()
                                            const newUrl = qs ? `/dashboard/equipos?${qs}` : '/dashboard/equipos'
                                            window.history.replaceState(null, '', newUrl)
                                          }
                                          setMenuForCode(null)
                                        }}
                                      >
                                        Paradas operativas
                                      </Link>
                                      <Link
                                        href={`/dashboard/equipos/${encodeURIComponent(e.codigo)}?view=repuestos`}
                                        className="block px-3 py-1.5 hover:bg-accent"
                                        onClick={(ev) => {
                                          ev.stopPropagation()
                                          if (typeof window !== 'undefined') {
                                            const params = new URLSearchParams(window.location.search)
                                            params.set('view', 'list')
                                            params.set('selectedCodigo', e.codigo)
                                            const qs = params.toString()
                                            const newUrl = qs ? `/dashboard/equipos?${qs}` : '/dashboard/equipos'
                                            window.history.replaceState(null, '', newUrl)
                                          }
                                          setMenuForCode(null)
                                        }}
                                      >
                                        Repuestos
                                      </Link>
                                      <Link
                                        href={`/dashboard/equipos/${encodeURIComponent(e.codigo)}?view=anexos`}
                                        className="block px-3 py-1.5 hover:bg-accent"
                                        onClick={(ev) => {
                                          ev.stopPropagation()
                                          setLoadingAnexos(e.codigo)
                                          if (typeof window !== 'undefined') {
                                            const params = new URLSearchParams(window.location.search)
                                            params.set('view', 'list')
                                            params.set('selectedCodigo', e.codigo)
                                            const qs = params.toString()
                                            const newUrl = qs ? `/dashboard/equipos?${qs}` : '/dashboard/equipos'
                                            window.history.replaceState(null, '', newUrl)
                                          }
                                          setMenuForCode(null)
                                        }}
                                      >
                                        {loadingAnexos === e.codigo ? (
                                          <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"></div>
                                            <span>Cargando...</span>
                                          </div>
                                        ) : (
                                          "Anexos"
                                        )}
                                      </Link>
                                    </div>
                                  </div>
                                )}
                              </li>
                            )}
                          )}
                        </ul>
                        </div>
                      )
                    )}
                  </div>
                )
              })}
            </div>
            )}
          </div>
        )}
      </div>

      <EquipmentDetailModal
        equipment={modalEquipment as any}
        isOpen={!!modalEquipmentCode}
        onClose={() => setModalEquipmentCode(null)}
        isLoading={!!modalEquipmentCode && equiposLoading}
      /> 

      {isAdmin && deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm text-muted-foreground">
                ¿Estás seguro que deseas eliminar el equipo <strong>{deleteTarget?.nombre}</strong> (código: {deleteTarget?.codigo})?
              </p>
              <p className="text-sm text-red-600 mt-2 font-medium">
                ⚠️ Esta acción no se puede deshacer y también eliminará todas las órdenes de mantenimiento relacionadas.
              </p>
            </div>
            <DialogFooter className="gap-2 mt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                type="button"
                onClick={async () => {
                  if (!deleteTarget) return
                  try {
                    await deleteEquipo(deleteTarget.id)
                    toast({
                      title: "✅ Equipo eliminado",
                      description: `El equipo ${deleteTarget.nombre} se ha eliminado correctamente.`
                    })
                    setDeleteTarget(null)
                    setMenuForCode(null)
                  } catch (error) {
                    console.error('Error eliminando equipo:', error);
                    toast({
                      title: "❌ Error de red",
                      description: error instanceof Error ? error.message : "Error de red al eliminar equipo",
                      variant: "destructive"
                    })
                  }
                }}
              >
                Confirmar eliminación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
