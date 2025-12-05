"use client"

import * as React from "react"
import { useEffect, useState, useRef } from "react"

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

const equipmentSchema = z.object({
  codigo: z.string().min(1, "Requerido"),
  version: z.string().optional(),
  fechaImplementacion: z.string().optional(),
  nombre: z.string().min(1, "Requerido"),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  fabricante: z.string().optional(),
  fechaAdquisicion: z.string().optional(),
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
  ]).optional(),
  linea: z.string().optional(),
  // especificaciones tecnicas
  capacidad: z.string().optional(),
  amperaje: z.string().optional(),
  potencia: z.string().optional(),
  voltaje: z.string().optional(),
  rpm: z.string().optional(),
  magnitudMedida: z.string().optional(),
  attachmentsUrl: z.string().optional(),
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

  const { equipos, createEquipo, updateEquipo, deleteEquipo } = useEquipos()

  // Búsqueda global desde el header (solo para sugerencias, no para filtrar la lista)
  const { /* query, */ setSuggestions } = useDashboardSearch()

  // Registrar sugerencias globales para equipos (código + nombre)
  useEffect(() => {
    const items: SearchSuggestion[] = equipos.map((e) => ({
      id: e.id,
      label: `${e.codigo} - ${e.nombre}`,
      type: 'equipo',
      // Desde el buscador global vamos a la vista de listado y resaltamos el equipo
      route: `/dashboard/equipos?view=list&selectedCodigo=${encodeURIComponent(e.codigo)}`,
    }));
    setSuggestions(items);
  }, [equipos, setSuggestions])

  useEffect(() => {
    let mounted = true

    async function checkAdmin() {
      setCheckingAdmin(true)

      try {
        // 1) Primero, usar bandera de localStorage (puesta en el login)
        if (typeof window !== 'undefined') {
          const localFlag = localStorage.getItem('isAdmin')
          const localEmail = localStorage.getItem('userEmail')

          if (localFlag === 'true') {
            if (mounted) setIsAdmin(true)
            setCheckingAdmin(false)
            return
          }

          if (user && localEmail && user.email === localEmail) {
            if (localFlag === 'true') {
              if (mounted) setIsAdmin(true)
            } else if (localFlag === 'false') {
              if (mounted) setIsAdmin(false)
            }
            setCheckingAdmin(false)
            return
          }
        }

        // 2) Si no hay bandera, usar NEXT_PUBLIC_ADMIN_EMAILS
        const email = user?.email?.toLowerCase().trim()
        if (email) {
          const adminEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)

          const isEnvAdmin = adminEnv.includes(email)
          if (mounted) setIsAdmin(isEnvAdmin)

          if (typeof window !== 'undefined') {
            localStorage.setItem('isAdmin', isEnvAdmin ? 'true' : 'false')
            localStorage.setItem('userEmail', user?.email || '')
          }
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
      area: "Conservas",
      linea: "",
      capacidad: "",
      amperaje: "",
      potencia: "",
      voltaje: "",
      rpm: "",
      magnitudMedida: "",
      attachmentsUrl: "",
    },
  })

  const { toast } = useToast()

  const [view, setView] = useState<"form" | "list">(initialView)

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
  >("all")
  const [editingId, setEditingId] = useState<string | null>(null)

  const AREAS = [
    "Conservas",
    "Etiquetado",
    "Salsas",
    "Frutos Secos",
    "Medicion",
    "PTAR",
    "Servicios de Apoyo",
    "Bodega",
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
  }

  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>(() => {
    const obj: Record<string, boolean> = {}
    AREAS.forEach(a => obj[a] = true)
    return obj
  })

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
      'Laboratorio Micropesaje',
      'Laboratorio Materia Prima',
      'Planta',
    ],
    PTAR: [
      'Laboratorios',
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

  const [lineFilters, setLineFilters] = useState<Record<string,string>>(() => ({}))
  function setLineFilter(area: string, value: string) {
    setLineFilters(prev => ({ ...prev, [area]: value }))
  }

  // Equipo que se muestra en el modal de ficha técnica
  const [modalEquipment, setModalEquipment] = useState<UiStoredEquipment | null>(null)
  // Equipo pendiente de confirmar eliminación
  const [deleteTarget, setDeleteTarget] = useState<UiStoredEquipment | null>(null)
  // Código del equipo cuyo menú (tres puntos) está abierto
  const [menuForCode, setMenuForCode] = useState<string | null>(null)
  // Referencia al contenedor del menú de opciones para poder cerrar al hacer clic fuera
  const menuRef = useRef<HTMLDivElement | null>(null)
  const watchedArea = form.watch("area")

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
    if (editingId) {
      const success = await updateEquipo(editingId, values)
      if (success) {
        setEditingId(null)
        form.reset()
        setView('list')
      }
    } else {
      const success = await createEquipo(values)
      if (success) {
        form.reset()
        setView('list')
      }
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-2 sm:px-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Equipos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registrar un equipo ver el listado por area y linea</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button variant={view === "form" ? "default" : "ghost"} onClick={() => setView("form")} disabled={!isAdmin}>Registrar</Button>
          <Button variant={view === "list" ? "default" : "ghost"} onClick={() => setView("list")}>Listado</Button>
        </div>
      </div>

      <div className="mt-6">
        {view === "form" ? (
          isAdmin ? (
            <div className="rounded-md border bg-card p-3 sm:p-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormItem>
                      <FormLabel>Codigo</FormLabel>
                      <FormControl>
                        <Input {...form.register("codigo")} />
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
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none"
                          {...form.register("area")}
                        >
                          <option value="Conservas">Conservas</option>
                          <option value="Etiquetado">Etiquetado</option>
                          <option value="Salsas">Salsas</option>
                          <option value="Frutos Secos">Frutos secos</option>
                          <option value="Medicion">Medición</option>
                          <option value="PTAR">PTAR</option>
                          <option value="Servicios de Apoyo">Servicios de Apoyo</option>
                          <option value="Bodega">Bodega</option>
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
                        <Input type="file" accept="image/*" {...form.register("image")} />
                      </FormControl>
                      <FormMessage />

                      {(() => {
                        const fileList = form.watch("image") as FileList | undefined
                        if (fileList && fileList.length > 0) {
                          const file = fileList[0]
                          try {
                            const url = URL.createObjectURL(file)
                            return (
                              <div className="mt-2">
                                <img src={url} alt="preview" className="h-24 w-24 object-cover rounded-md border" />
                              </div>
                            )
                          } catch (e) {
                            return null
                          }
                        }
                        return null
                      })()}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Button type="submit">Guardar equipo</Button>
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
          <div className="mx-auto">
            <div className="space-y-4">
              {AREAS.map((a) => {
                const areaItems = equipos
                  .filter(e => e.area === a)

                const isLineArea = Boolean(AREA_LINEAS[a])
                const selectedLine = isLineArea ? (lineFilters[a] ?? '') : ''
                const items = isLineArea
                  ? selectedLine
                    ? areaItems.filter(e => e.linea === selectedLine)
                    : []
                  : areaItems

                return (
                  <div key={a} className="rounded-md border bg-card p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                      <div className="font-medium">
                        {AREA_LABELS[a] ?? a}{" "}
                        <span className="text-sm text-muted-foreground">({items.length})</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {isLineArea && (
                          <select
                            className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none"
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
                        <Button size="sm" variant="ghost" onClick={() => toggleArea(a)}>{expandedAreas[a] ? 'Ocultar' : 'Ver'}</Button>
                      </div>
                    </div>

                    {expandedAreas[a] && (
                      items.length === 0 ? (
                        <div className="rounded-md border bg-card p-3 sm:p-4 text-sm text-muted-foreground">
                          {isLineArea && !selectedLine
                            ? 'Selecciona una línea para ver los equipos.'
                            : 'No hay equipos en esta área.'}
                        </div>
                      ) : (
                        <ul className="grid gap-3">
                          {items.map((e, index) => {
                            const isSelected = selectedCodigoFromQuery && e.codigo === selectedCodigoFromQuery
                            return (
                              <li
                                key={e.id}
                                id={`equipo-${e.codigo}`}
                                className={`relative flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 rounded-md border p-3 cursor-pointer hover:bg-accent/40 ${
                                  isSelected ? 'border-blue-500 ring-2 ring-blue-300 bg-accent/40' : 'bg-card'
                                }`}
                                onClick={() => {
                                  setModalEquipment(e)
                                }}
                              >
                                <div className="h-20 w-20 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                                  {e.imageDataUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={e.imageDataUrl} alt={e.nombre} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">No imagen</div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                                    <div>
                                      <div className="font-medium">{e.nombre}</div>
                                      <div className="text-sm text-muted-foreground">{e.codigo} • {e.marca} {e.modelo}</div>
                                      {e.linea && (
                                        <div className="text-xs text-muted-foreground">Línea: {e.linea}</div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm text-muted-foreground">{e.area}</div>
                                    </div>
                                  </div>
                                  <div className="mt-2 text-sm text-muted-foreground">Capacidad: {e.capacidad ?? '-'} • Potencia: {e.potencia ?? '-'}</div>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="absolute right-2 top-2 h-7 w-7 text-muted-foreground"
                                  onClick={(ev) => {
                                    ev.stopPropagation()
                                    setMenuForCode(prev => (prev === e.codigo ? null : e.codigo))
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
                                              setView('form')
                                              setEditingId(e.id)
                                              form.reset({
                                                codigo: e.codigo,
                                                version: e.version ?? '',
                                                fechaImplementacion: e.fechaImplementacion ?? '',
                                                nombre: e.nombre,
                                                marca: e.marca ?? '',
                                                modelo: e.modelo ?? '',
                                                fabricante: e.fabricante ?? '',
                                                fechaAdquisicion: e.fechaAdquisicion ?? '',
                                                image: undefined,
                                                area: e.area as any,
                                                linea: e.linea ?? '',
                                                capacidad: e.capacidad ?? '',
                                                amperaje: e.amperaje ?? '',
                                                potencia: e.potencia ?? '',
                                                voltaje: e.voltaje ?? '',
                                                rpm: e.rpm ?? '',
                                                magnitudMedida: e.magnitudMedida ?? '',
                                                attachmentsUrl: (e as any).attachmentsUrl ?? '',
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
                                          setMenuForCode(null)
                                        }}
                                      >
                                        Anexos
                                      </Link>
                                    </div>
                                  </div>
                                )}
                              </li>
                            )}
                          )}
                        </ul>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      {modalEquipment && (
        <EquipmentDetailModal
          equipment={modalEquipment}
          onClose={() => setModalEquipment(null)}
        />
      )}

      {isAdmin && deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar equipo</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              ¿Seguro que deseas eliminar el equipo
              {" "}
              <span className="font-medium">
                {deleteTarget.codigo} - {deleteTarget.nombre}
              </span>
              ? Esta acción eliminará también las órdenes de mantenimiento relacionadas.
            </p>
            <DialogFooter className="mt-4">
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
                  await deleteEquipo(deleteTarget.id)
                  setDeleteTarget(null)
                  setMenuForCode(null)
                }}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Modal simple para mostrar detalles del equipo seleccionado
// Se apoya en el estado selectedEquipment y detailTab definido arriba
function EquipmentDetailModal({
  equipment,
  onClose,
}: {
  equipment: UiStoredEquipment | null
  onClose: () => void
}) {
  if (!equipment) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl rounded-md bg-card p-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg font-semibold">{equipment.nombre}</div>
            <div className="text-xs text-muted-foreground">{equipment.codigo} • {equipment.area}{equipment.linea ? ` • ${equipment.linea}` : ''}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="md:col-span-1 flex items-center justify-center">
              <div className="h-40 w-40 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
                {equipment.imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={equipment.imageDataUrl} alt={equipment.nombre} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">Sin imagen</span>
                )}
              </div>
            </div>
            <div className="md:col-span-2 space-y-1">
              <div><span className="font-medium">Código:</span> {equipment.codigo}</div>
              <div><span className="font-medium">Área:</span> {equipment.area}</div>
              {equipment.linea && <div><span className="font-medium">Línea:</span> {equipment.linea}</div>}
              <div><span className="font-medium">Marca:</span> {equipment.marca || '-'}</div>
              <div><span className="font-medium">Modelo:</span> {equipment.modelo || '-'}</div>
              <div><span className="font-medium">Fabricante:</span> {equipment.fabricante || '-'}</div>
              <div><span className="font-medium">Fecha de implementación:</span> {equipment.fechaImplementacion || '-'}</div>
              <div><span className="font-medium">Fecha de adquisición:</span> {equipment.fechaAdquisicion || '-'}</div>
              <div className="mt-2 font-medium">Especificaciones técnicas</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div>Capacidad: {equipment.capacidad || '-'}</div>
                <div>Amperaje: {equipment.amperaje || '-'}</div>
                <div>Potencia: {equipment.potencia || '-'}</div>
                <div>Voltaje: {equipment.voltaje || '-'}</div>
                <div>RPM: {equipment.rpm || '-'}</div>
                <div>Magnitud medida: {equipment.magnitudMedida || '-'}</div>
              </div>
            </div>
          </div>
      </div>
    </div>
  )
}