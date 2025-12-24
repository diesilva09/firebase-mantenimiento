"use client"


import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { z } from "zod"
import React, { useState, useEffect } from "react"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useToast } from "@/hooks/use-toast"

import { useEquipos } from "@/hooks/use-equipos"
import { useUser } from "@/firebase/auth/use-user"
import { useDashboardSearch, type SearchSuggestion } from "@/context/dashboard-search-context"

import { Form, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, MoreHorizontal } from "lucide-react"
import { initializeFirebase } from "@/firebase"

// helper
async function getAuthHeaders() {
  const { auth } = initializeFirebase()
  const currentUser = auth.currentUser
  if (!currentUser) return {}
  const token = await currentUser.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export const repuestoSchema = z.object({
  codigo: z.string().min(1, "Requerido"),

  // descripción del repuesto
  nombre: z.string().min(1, "Requerido"),

  // Clasificación
  categoria: z.enum(["Mecanico", "Neumatico", "Electrico", "Otro"], {
    required_error: "Seleccione una categoría",
  }),
  subcategoria: z.string().optional(),     // luego la llenaremos por categoría

  // Datos de compra
  codigoCompra: z.string().optional(),
  proveedor: z.string().optional(),
  precio: z
    .number({ invalid_type_error: "Debe ser un número" })
    .min(0, "No puede ser negativo")
    .optional(),

  // Stock
  unidad: z.string().min(1, "Requerido"),  // Unidad, Juego, Metro, Litro…
  stockMaximo: z
    .number({ invalid_type_error: "Debe ser un número" })
    .min(0, "No puede ser negativo"),
  stockMinimo: z
    .number({ invalid_type_error: "Debe ser un número" })
    .min(0, "No puede ser negativo"),
  stockActual: z
    .number({ invalid_type_error: "Debe ser un número" })
    .min(0, "No puede ser negativo"),

  // Otros opcionales
  ubicacion: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  notas: z.string().optional(),
  descripcion: z.string().optional(),

  // Imagen (archivo en el formulario)
  imagen: z.any().optional(),
})

export type RepuestoForm = z.infer<typeof repuestoSchema>

export type RepuestoItem = RepuestoForm & {
  id: number
  descripcion?: string | null
  imagen_url?: string | null
  stockInicial: number
  precio?: number | null
}

export const CATEGORIAS = ["Mecanico", "Neumatico", "Electrico", "Otro"] as const

export const CATEGORIA_LABELS: Record<(typeof CATEGORIAS)[number], string> = {
  Mecanico: "Mecánico",
  Neumatico: "Neumático",
  Electrico: "Eléctrico",
  Otro: "Otro",
}

export const CATEGORIA_SUBCATEGORIAS: Record<string, string[]> = {
  Mecanico: ["Rodamientos", "Correas", "Engranes", "Estructuras"],
  Neumatico: ["Válvulas", "Cilindros", "Racores", "Mangueras"],
  Electrico: ["Sensores", "Motores", "Contactores", "Interruptores", "Cableado"],
  // Por ahora 'Otro' sin subcategorías predefinidas
}

// helper
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })
}

export default function InventarioPage() {
  const searchParams = useSearchParams()
  const selectedRepuestoIdFromQuery = searchParams.get("selectedRepuestoId")

  const [open, setOpen] = useState(false)

  const [isAdmin, setIsAdmin] = useState(false)

  const [repuestos, setRepuestos] = useState<RepuestoItem[]>([])
  const [loadingRepuestos, setLoadingRepuestos] = useState(false)
  const [errorRepuestos, setErrorRepuestos] = useState<string | null>(null)
  const [expandedCategoria, setExpandedCategoria] = useState<string | null>(null)
  const [subcategoriaFilters, setSubcategoriaFilters] = useState<Record<string, string>>({})

  const { user } = useUser()

  // Calcular isAdmin a partir del email actual de Firebase
  useEffect(() => {
    const normalizedEmail = user?.email
      ? user.email.toLowerCase().trim()
      : null

    const isBoss = normalizedEmail === "mantenimiento.admin@coruna.com"
    setIsAdmin(isBoss)
  }, [user])

  // Guardar estado de UI (categoría expandida y filtros) en localStorage cuando cambie
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const payload = {
        expandedCategoria,
        subcategoriaFilters,
      }
      window.localStorage.setItem("inventarioUI", JSON.stringify(payload))
    } catch {
      // ignorar errores de escritura
    }
  }, [expandedCategoria, subcategoriaFilters])
  const [descripcionExpandidaId, setDescripcionExpandidaId] = useState<number | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [usoOpen, setUsoOpen] = useState(false)
  const [usoRepuesto, setUsoRepuesto] = useState<RepuestoItem | null>(null)
  const [usoCantidad, setUsoCantidad] = useState<number>(1)
  const [usoMaquina, setUsoMaquina] = useState("")
  const [usoResponsable, setUsoResponsable] = useState("")
  const [usoDescripcion, setUsoDescripcion] = useState("")
  const [usoMaquinaSeleccionada, setUsoMaquinaSeleccionada] = useState<any | null>(null)
  const { toast } = useToast()
  const { equipos } = useEquipos()
  const [usoMaquinaFocused, setUsoMaquinaFocused] = useState(false)
  const { setSuggestions } = useDashboardSearch()

  const maquinaSuggestions = React.useMemo(() => {
    const term = usoMaquina.trim().toLowerCase()
    if (!term) return []

    return equipos
      .filter((e: any) => {
        const areaPart = e.area ? ` ${e.area}` : ""
        const lineaPart = e.linea ? ` ${e.linea}` : ""
        const label = `${e.codigo}${areaPart}${lineaPart} ${e.nombre || ""}`
        return label.toLowerCase().includes(term)
      })
      .slice(0, 8)
  }, [usoMaquina, equipos])

function mapRowToRepuestoItem(row: any): RepuestoItem {
  const stockMaximo = Number(row.stock_maximo ?? row.stockMaximo ?? 0)
  const stockActual = Number(row.stock_actual ?? row.stockActual ?? stockMaximo) // Si stock_actual es null, usar stock_maximo
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre ?? "",
    descripcion: row.descripcion ?? null,
    categoria: row.categoria,
    subcategoria: row.subcategoria ?? "",
    codigoCompra: row.codigo_compra ?? row.codigoCompra ?? "",
    proveedor: row.proveedor ?? "",
    precio: Number(row.precio ?? 0),
    unidad: "Unidad",
    stockMaximo: stockMaximo,
    stockMinimo: Number(row.stock_minimo ?? row.stockMinimo ?? 0),
    stockActual: stockActual,
    ubicacion: row.ubicacion ?? "",
    marca: row.marca ?? "",
    modelo: row.modelo ?? "",
    notas: row.notas ?? "",
    imagen: undefined,
    imagen_url: row.imagen_url ?? null,
    stockInicial: stockMaximo,
  }
}

  function handleSubcategoriaChange(cat: string, value: string) {
    setSubcategoriaFilters((prev) => ({ ...prev, [cat]: value }))
  }

  function getRepuestosByCategoria(cat: string) {
    const sub = subcategoriaFilters[cat] || ""
    return repuestos.filter((r) => {
      if (r.categoria !== cat) return false
      if (!sub) return true
      return (r.subcategoria || "") === sub
    })
  }

  function toggleCategoria(cat: string) {
    setExpandedCategoria((prev) => (prev === cat ? null : cat))
  }

  function toggleDescripcion(id: number) {
    setDescripcionExpandidaId((prev) => (prev === id ? null : id))
  }

  function openImagePreview(url: string | null | undefined) {
    if (!url) return
    setImagePreviewUrl(url)
    setImagePreviewOpen(true)
  }

  useEffect(() => {
    async function loadInventario() {
      setLoadingRepuestos(true)
      setErrorRepuestos(null)
      try {
        const res = await fetch("/api/inventario")
        if (!res.ok) {
          throw new Error("No se pudo cargar el inventario")
        }
        const json = await res.json()
        const data = Array.isArray(json.data) ? json.data : []
        setRepuestos(data.map(mapRowToRepuestoItem))
      } catch (err: any) {
        console.error("Error cargando inventario:", err)
        setErrorRepuestos(err.message || "Error cargando inventario")
      } finally {
        setLoadingRepuestos(false)
      }
    }

    loadInventario()
  }, [])

  // Registrar sugerencias globales de repuestos (código, categoría, subcategoría y nombre)
  useEffect(() => {
    const items: SearchSuggestion[] = repuestos.map((r) => {
      const categoriaLabel = CATEGORIA_LABELS[r.categoria as (typeof CATEGORIAS)[number]] || r.categoria
      const subLabel = r.subcategoria ? ` • ${r.subcategoria}` : ""
      // Orden solicitado: código - categoría - subcategoría - nombre
      const label = `${r.codigo} - ${categoriaLabel}${subLabel} - ${r.nombre}`

      return {
        id: String(r.id),
        label,
        type: "repuesto",
        route: `/dashboard/inventario?selectedRepuestoId=${r.id}`,
      }
    })

    setSuggestions((prev) => {
      // Mantener sugerencias de otros módulos y reemplazar solo las de tipo "repuesto"
      const others = prev.filter((s) => s.type !== "repuesto")
      return [...others, ...items]
    })
  }, [repuestos, setSuggestions])

  // Si venimos desde el buscador global con un repuesto seleccionado,
  // expandir su categoría y subcategoría para que sea visible.
  useEffect(() => {
    if (!selectedRepuestoIdFromQuery) return
    if (!repuestos || repuestos.length === 0) return

    const targetId = Number(selectedRepuestoIdFromQuery)
    if (!targetId) return

    const target = repuestos.find((r) => r.id === targetId)
    if (!target) return

    setExpandedCategoria(target.categoria)

    if (target.subcategoria) {
      setSubcategoriaFilters((prev) => ({
        ...prev,
        [target.categoria]: target.subcategoria || "",
      }))
    }
  }, [selectedRepuestoIdFromQuery, repuestos])

  // Scroll automático hasta la fila del repuesto buscado y limpiar el parámetro
  useEffect(() => {
    if (!selectedRepuestoIdFromQuery) return
    if (typeof document === "undefined" || typeof window === "undefined") return

    const elementId = `repuesto-${selectedRepuestoIdFromQuery}`

    const tryScroll = () => {
      const el = document.getElementById(elementId)
      if (!el) return false

      el.scrollIntoView({ behavior: "smooth", block: "center" })

      const params = new URLSearchParams(window.location.search)
      params.delete("selectedRepuestoId")
      const queryString = params.toString()
      const newUrl = queryString
        ? `/dashboard/inventario?${queryString}`
        : "/dashboard/inventario"
      window.history.replaceState(null, "", newUrl)

      return true
    }

    if (!tryScroll()) {
      const timeout = setTimeout(() => {
        tryScroll()
      }, 300)

      return () => clearTimeout(timeout)
    }
  }, [selectedRepuestoIdFromQuery, repuestos])

  const form = useForm<RepuestoForm>({
    resolver: zodResolver(repuestoSchema),
    defaultValues: {
      codigo: "",
      nombre: "",
      descripcion: "",
      categoria: "Mecanico",
      subcategoria: "",
      codigoCompra: "",
      proveedor: "",
      precio: 0,
      unidad: "Unidad",
      stockMaximo: 0,
      stockMinimo: 0,
      stockActual: 0,
      ubicacion: "",
      marca: "",
      modelo: "",
      notas: "",
      imagen: undefined,
    },
  })

  const watchedCategoria = form.watch("categoria")

  async function onSubmit(values: RepuestoForm) {
    try {
      if (!user) {
        toast({
          title: "Sesión requerida",
          description: "Debes iniciar sesión nuevamente para guardar cambios en el inventario.",
          variant: "destructive",
        })
        return
      }

      const existing = editingId ? repuestos.find((r) => r.id === editingId) : undefined
      let imagenUrl: string | null = existing?.imagen_url ?? null
      const fileList = values.imagen as FileList | undefined
      if (fileList && fileList.length > 0) {
        try {
          imagenUrl = await readFileAsDataUrl(fileList[0])
        } catch (e) {
          console.error("Error leyendo imagen", e)
        }
      }

      const payload = {
        id: editingId ?? undefined,
        codigo: values.codigo,
        categoria: values.categoria,
        subcategoria: values.subcategoria || null,
        nombre: values.nombre,
        descripcion: values.descripcion || null,
        codigoCompra: values.codigoCompra || null,
        proveedor: values.proveedor || null,
        precio: values.precio || null,
        stockMaximo: values.stockMaximo ?? 0,
        stockMinimo: values.stockMinimo ?? 0,
        imagenUrl,
      }

      const token = await user.getIdToken()
      const res = await fetch("/api/inventario", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error("Error guardando el repuesto")
      }

      const raw = await res.json()
      const item = mapRowToRepuestoItem(raw)

      if (editingId) {
        setRepuestos((prev) => prev.map((r) => (r.id === editingId ? item : r)))
      } else {
        setRepuestos((prev) => [item, ...prev])
      }

      setOpen(false)
      setEditingId(null)

      form.reset({
        codigo: "",
        nombre: "",
        descripcion: "",
        categoria: "Mecanico",
        subcategoria: "",
        codigoCompra: "",
        proveedor: "",
        precio: 0,
        unidad: "Unidad",
        stockMaximo: 0,
        stockMinimo: 0,
        stockActual: 0,
        ubicacion: "",
        marca: "",
        modelo: "",
        notas: "",
        imagen: undefined,
      })

      toast({
        title: editingId ? "Repuesto actualizado" : "Repuesto creado",
        description: editingId
          ? "Los datos del repuesto se actualizaron correctamente."
          : "El repuesto se registró correctamente en el inventario.",
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el repuesto. Intenta nuevamente.",
        variant: "destructive",
      })
    }
  }

  function handleEdit(repuesto: RepuestoItem) {
    setEditingId(repuesto.id)
    form.reset({
      codigo: repuesto.codigo,
      nombre: repuesto.nombre,
      descripcion: repuesto.descripcion || "",
      categoria: repuesto.categoria,
      subcategoria: repuesto.subcategoria || "",
      codigoCompra: repuesto.codigoCompra || "",
      proveedor: repuesto.proveedor || "",
      precio: repuesto.precio || 0,
      unidad: repuesto.unidad || "Unidad",
      stockMaximo: repuesto.stockMaximo,
      stockMinimo: repuesto.stockMinimo,
      stockActual: repuesto.stockActual,
      ubicacion: repuesto.ubicacion || "",
      marca: repuesto.marca || "",
      modelo: repuesto.modelo || "",
      notas: repuesto.notas || "",
      imagen: undefined,
    })
    setOpen(true)
  }

  async function handleDelete(id: number) {
    try {
      if (!user) {
        toast({
          title: "Sesión requerida",
          description: "Debes iniciar sesión nuevamente para eliminar un repuesto.",
          variant: "destructive",
        })
        return
      }

      const token = await user.getIdToken()
      const res = await fetch(`/api/inventario?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error("Error eliminando repuesto")
      }
      setRepuestos((prev) => prev.filter((r) => r.id !== id))
      if (descripcionExpandidaId === id) setDescripcionExpandidaId(null)

      toast({
        title: "Repuesto eliminado",
        description: "El repuesto se eliminó correctamente del inventario.",
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el repuesto. Intenta nuevamente.",
        variant: "destructive",
      })
    }
  }

  function handleOpenUso(repuesto: RepuestoItem) {
    setUsoRepuesto(repuesto)
    setUsoCantidad(1)
    setUsoMaquina("")
    setUsoResponsable("")
    setUsoDescripcion("")
    setUsoMaquinaSeleccionada(null)
    setUsoOpen(true)
  }

  function handleCloseUso() {
    setUsoOpen(false)
    setUsoRepuesto(null)
    setUsoCantidad(1)
    setUsoMaquina("")
    setUsoResponsable("")
    setUsoDescripcion("")
    setUsoMaquinaSeleccionada(null)
  }

  async function handleSubmitUso() {
    if (!usoRepuesto) return

    if (!usoCantidad || usoCantidad <= 0) {
      toast({
        title: "Cantidad inválida",
        description: "Ingresa una cantidad solicitada mayor a cero.",
        variant: "destructive",
      })
      return
    }
    if (!usoMaquina.trim()) {
      toast({
        title: "Máquina requerida",
        description: "Indica la máquina que requiere el repuesto.",
        variant: "destructive",
      })
      return
    }
    if (!usoResponsable.trim()) {
      toast({
        title: "Responsable requerido",
        description: "Indica el responsable del uso.",
        variant: "destructive",
      })
      return
    }

    try {
      // Si se eligió una sugerencia, usamos directamente sus datos
      let maquinaCodigo: string
      let maquinaLabel: string

      if (usoMaquinaSeleccionada) {
        maquinaCodigo = usoMaquinaSeleccionada.codigo
        const areaText = usoMaquinaSeleccionada.area ? ` - ${usoMaquinaSeleccionada.area}` : ""
        const lineaText = usoMaquinaSeleccionada.linea ? ` - ${usoMaquinaSeleccionada.linea}` : ""
        maquinaLabel = `${usoMaquinaSeleccionada.codigo}${areaText}${lineaText} - ${usoMaquinaSeleccionada.nombre || ""}`.trim()
      } else {
        // Fallback para textos escritos a mano
        maquinaLabel = usoMaquina.trim()
        maquinaCodigo = maquinaLabel.split(" - ")[0]?.trim() || maquinaLabel
      }

      const res = await fetch("/api/uso-repuesto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repuestoId: usoRepuesto.id,
          cantidad: usoCantidad,
          maquinaCodigo,
          maquinaLabel,
          responsable: usoResponsable.trim(),
          descripcionUso: usoDescripcion.trim() || null,
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || "No se pudo registrar la solicitud de uso.")
      }

      const updated = json.data?.updatedRepuesto
      const lowStock = Boolean(json.data?.lowStock)

      if (updated && typeof updated.id !== "undefined") {
        setRepuestos((prev) =>
          prev.map((r) =>
            r.id === usoRepuesto.id
              ? {
                  ...r,
                  // Actualizar valores retornados por el servidor (compatibilidad con stock_actual y stock_maximo)
                  stockActual: Number(updated.stock_actual ?? updated.stock_maximo ?? r.stockActual),
                  stockMaximo: Number(updated.stock_maximo ?? updated.stock_actual ?? r.stockMaximo),
                  stockMinimo: Number(updated.stock_minimo ?? r.stockMinimo),
                }
              : r
          )
        )
      }

      toast({
        title: "Solicitud de uso registrada",
        description: `Se registró la solicitud de uso para el repuesto ${usoRepuesto.codigo}.`,
      })

      if (lowStock) {
        toast({
          title: "Stock mínimo alcanzado",
          description:
            "Este repuesto ha llegado o está por debajo del stock mínimo configurado.",
          variant: "destructive",
        })
      }

      handleCloseUso()
    } catch (err: any) {
      console.error("Error registrando uso de repuesto", err)
      toast({
        title: "Error al registrar uso",
        description: err?.message || "No se pudo registrar la solicitud de uso.",
        variant: "destructive",
      })
    }
  }

  // Determina la clase de color de fila según el nivel de stock
  // Regla ajustada usando solo el stock mínimo como referencia (funciona bien con cantidades pequeñas):
  // - current = stockActual (stock actual)
  // - Rojo: current <= stockMinimo (pocas unidades / por debajo del mínimo)
  // - Naranja: stockMinimo < current <= stockMinimo * 2 (quedan pocas pero aún no en rojo)
  // - Verde: current > stockMinimo * 2 (stock saludable)
  function getStockRowClass(r: RepuestoItem) {
    const current = r.stockActual
    const min = r.stockMinimo || 0

    // Rojo: en o por debajo del mínimo configurado
    if (current <= min) {
      return "bg-red-200 border-l-4 border-red-500 font-semibold"
    }

    const orangeThreshold = min * 2 || 1

    // Naranja: por encima del mínimo, pero ya por debajo o igual al doble del mínimo
    if (current <= orangeThreshold) {
      return "bg-amber-200 border-l-4 border-amber-500 font-semibold"
    }

    // Verde: por encima del doble del mínimo
    return "bg-emerald-200 border-l-4 border-emerald-500 font-semibold"
  }

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4">
      {/* Header con título y botón */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventario de Repuestos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Busca y gestiona los repuestos del área de mantenimiento por categoría.
          </p>
        </div>

        <div className="flex gap-2 self-start sm:self-auto">
          {isAdmin && (
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => setOpen(true)}
            >
              Añadir Repuesto
            </Button>
          )}
          <Link href="/dashboard/usos-repuestos">
            <Button variant="outline" className="text-xs">
              Ver usos de repuestos
            </Button>
          </Link>
        </div>
      </div>

      {/* Card con categorías */}
      <div className="mt-6 rounded-md border bg-card">
        <div className="border-b px-4 py-3 text-sm text-muted-foreground">
          Inventario organizado por categoría
        </div>

        <div className="divide-y">
          {/* Mecánica */}
          <div>
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent"
              onClick={() => toggleCategoria("Mecanico")}
            >
              <span className="font-medium">Mecánica</span>
              <span>{expandedCategoria === "Mecanico" ? "▴" : "▾"}</span>
            </button>

            {expandedCategoria === "Mecanico" && (
              <div className="px-4 pb-3 text-sm text-muted-foreground space-y-3">
                {CATEGORIA_SUBCATEGORIAS["Mecanico"] && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Subcategoría:</span>
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={subcategoriaFilters["Mecanico"] || ""}
                      onChange={(e) => handleSubcategoriaChange("Mecanico", e.target.value)}
                    >
                      <option value="">Todas</option>
                      {CATEGORIA_SUBCATEGORIAS["Mecanico"].map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="w-14 border px-2 py-1 text-left">Img</th>
                        <th className="border px-2 py-1 text-left">Código</th>
                        <th className="border px-2 py-1 text-left">Nombre</th>
                        <th className="border px-2 py-1 text-left">Descripción</th>
                        <th className="border px-2 py-1 text-left">Código compra</th>
                        <th className="border px-2 py-1 text-left">Proveedor</th>
                        <th className="border px-2 py-1 text-right">Precio</th>
                        <th className="border px-2 py-1 text-right">Stock </th>
                        <th className="w-20 border px-2 py-1 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getRepuestosByCategoria("Mecanico").length === 0 ? (
                        <tr>
                          <td className="border px-2 py-2 text-center text-[11px]" colSpan={9}>
                            Aún no hay repuestos registrados en esta categoría.
                          </td>
                        </tr>
                      ) : (
                        getRepuestosByCategoria("Mecanico").map((r) => (
                          <React.Fragment key={r.id}>
                            <tr id={`repuesto-${r.id}`} className={`align-top ${getStockRowClass(r)}`}>
                              <td className="border px-2 py-1">
                                <button
                                  type="button"
                                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border bg-muted text-[11px] text-muted-foreground"
                                  onClick={() => openImagePreview(r.imagen_url)}
                                  disabled={!r.imagen_url}
                                >
                                  {r.imagen_url ? (
                                    <img
                                      src={r.imagen_url}
                                      alt={r.codigo}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span>{(r.codigo || "?").slice(0, 2).toUpperCase()}</span>
                                  )}
                                </button>
                              </td>
                              <td className="border px-2 py-1 align-top font-medium">{r.codigo}</td>
                              <td className="border px-2 py-1 align-top truncate max-w-[200px]">{r.nombre}</td>
                              <td className="border px-2 py-1 align-top truncate max-w-[260px]">{r.descripcion}</td>
                              <td className="border px-2 py-1 align-top">{r.codigoCompra}</td>
                              <td className="border px-2 py-1 align-top">{r.proveedor}</td>
                              <td className="border px-2 py-1 text-right align-top">{r.precio !== null && r.precio !== undefined ? `$${r.precio.toFixed(2)}` : '-'}</td>
                              <td className="border px-2 py-1 text-right align-top">{r.stockActual}</td>
                              <td className="border px-2 py-1 align-top">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => toggleDescripcion(r.id)}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>

                                  {isAdmin && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-7 w-7">
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="text-xs">
                                        <DropdownMenuItem onClick={() => handleOpenUso(r)}>
                                          Uso
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleEdit(r)}>
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDelete(r.id)}>
                                          Borrar
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {descripcionExpandidaId === r.id && r.descripcion && (
                              <tr>
                                <td className="border px-2 py-2" colSpan={9}>
                                  <div className="text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                                    {r.descripcion}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Eléctrica */}
          <div>
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent"
              onClick={() => toggleCategoria("Electrico")}
            >
              <span className="font-medium">Eléctrica</span>
              <span>{expandedCategoria === "Electrico" ? "▴" : "▾"}</span>
            </button>

            {expandedCategoria === "Electrico" && (
              <div className="px-4 pb-3 text-sm text-muted-foreground space-y-3">
                {CATEGORIA_SUBCATEGORIAS["Electrico"] && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Subcategoría:</span>
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={subcategoriaFilters["Electrico"] || ""}
                      onChange={(e) => handleSubcategoriaChange("Electrico", e.target.value)}
                    >
                      <option value="">Todas</option>
                      {CATEGORIA_SUBCATEGORIAS["Electrico"].map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="w-14 border px-2 py-1 text-left">Img</th>
                        <th className="border px-2 py-1 text-left">Código</th>
                        <th className="border px-2 py-1 text-left">Nombre</th>
                        <th className="border px-2 py-1 text-left">Descripción</th>
                        <th className="border px-2 py-1 text-left">Código compra</th>
                        <th className="border px-2 py-1 text-left">Proveedor</th>
                        <th className="border px-2 py-1 text-right">Precio</th>
                        <th className="border px-2 py-1 text-right">Stock </th>
                        <th className="w-20 border px-2 py-1 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getRepuestosByCategoria("Electrico").length === 0 ? (
                        <tr>
                          <td className="border px-2 py-2 text-center text-[11px]" colSpan={9}>
                            Aún no hay repuestos registrados en esta categoría.
                          </td>
                        </tr>
                      ) : (
                        getRepuestosByCategoria("Electrico").map((r) => (
                          <React.Fragment key={r.id}>
                            <tr id={`repuesto-${r.id}`} className={`align-top ${getStockRowClass(r)}`}>
                              <td className="border px-2 py-1">
                                <button
                                  type="button"
                                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border bg-muted text-[11px] text-muted-foreground"
                                  onClick={() => openImagePreview(r.imagen_url)}
                                  disabled={!r.imagen_url}
                                >
                                  {r.imagen_url ? (
                                    <img
                                      src={r.imagen_url}
                                      alt={r.codigo}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span>{(r.codigo || "?").slice(0, 2).toUpperCase()}</span>
                                  )}
                                </button>
                              </td>
                              <td className="border px-2 py-1 align-top font-medium">{r.codigo}</td>
                              <td className="border px-2 py-1 align-top truncate max-w-[200px]">{r.nombre}</td>
                              <td className="border px-2 py-1 align-top truncate max-w-[260px]">{r.descripcion}</td>
                              <td className="border px-2 py-1 align-top">{r.codigoCompra}</td>
                              <td className="border px-2 py-1 align-top">{r.proveedor}</td>
                              <td className="border px-2 py-1 text-right align-top">{r.precio !== null && r.precio !== undefined ? `$${r.precio.toFixed(2)}` : '-'}</td>
                              <td className="border px-2 py-1 text-right align-top">{r.stockActual}</td>
                              <td className="border px-2 py-1 align-top">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => toggleDescripcion(r.id)}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>

                                  {isAdmin && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-7 w-7">
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="text-xs">
                                        <DropdownMenuItem onClick={() => handleOpenUso(r)}>
                                          Uso
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleEdit(r)}>
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDelete(r.id)}>
                                          Borrar
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {descripcionExpandidaId === r.id && r.descripcion && (
                              <tr>
                                <td className="border px-2 py-2" colSpan={9}>
                                  <div className="text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                                    {r.descripcion}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Neumática */}
          <div>
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent"
              onClick={() => toggleCategoria("Neumatico")}
            >
              <span className="font-medium">Neumática</span>
              <span>{expandedCategoria === "Neumatico" ? "▴" : "▾"}</span>
            </button>

            {expandedCategoria === "Neumatico" && (
              <div className="px-4 pb-3 text-sm text-muted-foreground space-y-3">
                {CATEGORIA_SUBCATEGORIAS["Neumatico"] && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Subcategoría:</span>
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={subcategoriaFilters["Neumatico"] || ""}
                      onChange={(e) => handleSubcategoriaChange("Neumatico", e.target.value)}
                    >
                      <option value="">Todas</option>
                      {CATEGORIA_SUBCATEGORIAS["Neumatico"].map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="w-14 border px-2 py-1 text-left">Img</th>
                        <th className="border px-2 py-1 text-left">Código</th>
                        <th className="border px-2 py-1 text-left">Nombre</th>
                        <th className="border px-2 py-1 text-left">Descripción</th>
                        <th className="border px-2 py-1 text-left">Código compra</th>
                        <th className="border px-2 py-1 text-left">Proveedor</th>
                        <th className="border px-2 py-1 text-right">Precio</th>
                        <th className="border px-2 py-1 text-right">Stock </th>
                        <th className="w-20 border px-2 py-1 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getRepuestosByCategoria("Neumatico").length === 0 ? (
                        <tr>
                          <td className="border px-2 py-2 text-center text-[11px]" colSpan={9}>
                            Aún no hay repuestos registrados en esta categoría.
                          </td>
                        </tr>
                      ) : (
                        getRepuestosByCategoria("Neumatico").map((r) => (
                          <React.Fragment key={r.id}>
                            <tr className={`align-top ${getStockRowClass(r)}`}>
                              <td className="border px-2 py-1">
                                <button
                                  type="button"
                                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border bg-muted text-[11px] text-muted-foreground"
                                  onClick={() => openImagePreview(r.imagen_url)}
                                  disabled={!r.imagen_url}
                                >
                                  {r.imagen_url ? (
                                    <img
                                      src={r.imagen_url}
                                      alt={r.codigo}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span>{(r.codigo || "?").slice(0, 2).toUpperCase()}</span>
                                  )}
                                </button>
                              </td>
                              <td className="border px-2 py-1 align-top font-medium">{r.codigo}</td>
                              <td className="border px-2 py-1 align-top truncate max-w-[200px]">{r.nombre}</td>
                              <td className="border px-2 py-1 align-top truncate max-w-[260px]">{r.descripcion}</td>
                              <td className="border px-2 py-1 align-top">{r.codigoCompra}</td>
                              <td className="border px-2 py-1 align-top">{r.proveedor}</td>
                              <td className="border px-2 py-1 text-right align-top">{r.precio !== null && r.precio !== undefined ? `$${r.precio.toFixed(2)}` : '-'}</td>
                              <td className="border px-2 py-1 text-right align-top">{r.stockActual}</td>
                              <td className="border px-2 py-1 align-top">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => toggleDescripcion(r.id)}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>

                                  {isAdmin && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-7 w-7">
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="text-xs">
                                        <DropdownMenuItem onClick={() => handleOpenUso(r)}>
                                          Uso
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleEdit(r)}>
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDelete(r.id)}>
                                          Borrar
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {descripcionExpandidaId === r.id && r.descripcion && (
                              <tr>
                                <td className="border px-2 py-2" colSpan={9}>
                                  <div className="text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                                    {r.descripcion}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Otro */}
          <div>
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent"
              onClick={() => toggleCategoria("Otro")}
            >
              <span className="font-medium">Otro</span>
              <span>{expandedCategoria === "Otro" ? "▴" : "▾"}</span>
            </button>

            {expandedCategoria === "Otro" && (
              <div className="px-4 pb-3 text-sm text-muted-foreground space-y-3">
                <div className="overflow-x-auto">
                  <table className="min-w-full border text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="w-14 border px-2 py-1 text-left">Img</th>
                        <th className="border px-2 py-1 text-left">Código</th>
                        <th className="border px-2 py-1 text-left">Nombre</th>
                        <th className="border px-2 py-1 text-left">Descripción</th>
                        <th className="border px-2 py-1 text-left">Código compra</th>
                        <th className="border px-2 py-1 text-left">Proveedor</th>
                        <th className="border px-2 py-1 text-right">Precio</th>
                        <th className="border px-2 py-1 text-right">Stock </th>
                        <th className="w-20 border px-2 py-1 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getRepuestosByCategoria("Otro").length === 0 ? (
                        <tr>
                          <td className="border px-2 py-2 text-center text-[11px]" colSpan={9}>
                            Aún no hay repuestos registrados en esta categoría.
                          </td>
                        </tr>
                      ) : (
                        getRepuestosByCategoria("Otro").map((r) => (
                          <React.Fragment key={r.id}>
                            <tr className={`align-top ${getStockRowClass(r)}`}>
                              <td className="border px-2 py-1">
                                <button
                                  type="button"
                                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border bg-muted text-[11px] text-muted-foreground"
                                  onClick={() => openImagePreview(r.imagen_url)}
                                  disabled={!r.imagen_url}
                                >
                                  {r.imagen_url ? (
                                    <img
                                      src={r.imagen_url}
                                      alt={r.codigo}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span>{(r.codigo || "?").slice(0, 2).toUpperCase()}</span>
                                  )}
                                </button>
                              </td>
                              <td className="border px-2 py-1 align-top font-medium">{r.codigo}</td>
                              <td className="border px-2 py-1 align-top truncate max-w-[200px]">{r.nombre}</td>
                              <td className="border px-2 py-1 align-top truncate max-w-[260px]">{r.descripcion}</td>
                              <td className="border px-2 py-1 align-top">{r.codigoCompra}</td>
                              <td className="border px-2 py-1 align-top">{r.proveedor}</td>
                              <td className="border px-2 py-1 text-right align-top">{r.precio !== null && r.precio !== undefined ? `$${r.precio.toFixed(2)}` : '-'}</td>
                              <td className="border px-2 py-1 text-right align-top">{r.stockActual}</td>
                              <td className="border px-2 py-1 align-top">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => toggleDescripcion(r.id)}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>

                                  {isAdmin && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-7 w-7">
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="text-xs">
                                        <DropdownMenuItem onClick={() => handleOpenUso(r)}>
                                          Uso
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleEdit(r)}>
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDelete(r.id)}>
                                          Borrar
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {descripcionExpandidaId === r.id && r.descripcion && (
                              <tr>
                                <td className="border px-2 py-2" colSpan={9}>
                                  <div className="text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                                    {r.descripcion}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de preview de imagen */}
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Imagen de repuesto</DialogTitle>
            <DialogDescription>Vista ampliada de la imagen del repuesto.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center">
            {imagePreviewUrl && (
              <img
                src={imagePreviewUrl}
                alt="Preview imagen repuesto"
                className="max-h-[70vh] w-auto object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de solicitud de uso */}
      <Dialog open={usoOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseUso()
        } else {
          setUsoOpen(true)
        }
      }}>
        <DialogContent className="max-w-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitud de uso de repuesto</DialogTitle>
            <DialogDescription>
              Registra la cantidad a usar y la máquina que requiere este repuesto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Repuesto seleccionado</span>
              <div className="mt-1 rounded-md border bg-muted/40 px-2 py-1 text-xs">
                {usoRepuesto ? (
                  <>
                    <div className="flex items-center gap-3">
                      {usoRepuesto.imagen_url && (
                        <button
                          type="button"
                          className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted"
                          onClick={() => {
                            setImagePreviewUrl(usoRepuesto.imagen_url || null)
                            setImagePreviewOpen(true)
                          }}
                        >
                          <img
                            src={usoRepuesto.imagen_url || ""}
                            alt={usoRepuesto.codigo}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      )}
                      <div>
                        <div className="font-medium">{usoRepuesto.codigo}</div>
                        <div className="text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                          {usoRepuesto.nombre}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground">Ningún repuesto seleccionado</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Cantidad solicitada</label>
                <Input
                  type="number"
                  min={1}
                  value={usoCantidad}
                  onChange={(e) => setUsoCantidad(Number(e.target.value) || 0)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Responsable del uso</label>
                <Input
                  value={usoResponsable}
                  onChange={(e) => setUsoResponsable(e.target.value)}
                  className="mt-1 h-9 text-xs"
                  placeholder="Nombre del responsable"
                />
              </div>
            </div>

            <div className="relative">
              <label className="text-xs font-medium">Máquina que requiere</label>
              <Input
                value={usoMaquina}
                onChange={(e) => {
                  setUsoMaquina(e.target.value)
                  setUsoMaquinaSeleccionada(null)
                }}

                onFocus={() => setUsoMaquinaFocused(true)}
                onBlur={() => {
                  // pequeño delay para permitir click en la sugerencia
                  setTimeout(() => setUsoMaquinaFocused(false), 150)
                }}
                className="mt-1 h-9 text-xs"
                placeholder="Ej: CODIGO - Área - Línea - Equipo"
              />

              {usoMaquinaFocused && usoMaquina.trim() !== "" && maquinaSuggestions.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-background text-[11px] shadow">
                  {maquinaSuggestions.map((eq: any) => {
                    const areaPart = eq.area ? ` - ${eq.area}` : ""
                    const lineaPart = eq.linea ? ` - ${eq.linea}` : ""
                    const label = `${eq.codigo}${areaPart}${lineaPart} - ${eq.nombre || ""}`

                    return (
                      <button
                        key={eq.id}
                        type="button"
                        className="flex w-full cursor-pointer items-start gap-1 px-2 py-1 text-left hover:bg-muted"
                        onMouseDown={(ev) => {
                          ev.preventDefault()
                          setUsoMaquina(label)
                          setUsoMaquinaSeleccionada(eq)
                          setUsoMaquinaFocused(false)
                        }}
                      >
                        <span className="font-semibold">{eq.codigo}</span>
                        <span className="text-muted-foreground truncate">
                          {areaPart.replace(" - ", "")}
                          {lineaPart}
                          {eq.nombre ? ` - ${eq.nombre}` : ""}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              <p className="mt-1 text-[11px] text-muted-foreground">
                Empieza a escribir el código, área, línea o nombre del equipo para ver sugerencias.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium">Descripción del uso (operario)</label>
              <Textarea
                rows={3}
                value={usoDescripcion}
                onChange={(e) => setUsoDescripcion(e.target.value)}
                className="mt-1 text-xs"
                placeholder="El operario puede describir aquí cómo se usó el repuesto."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" type="button" onClick={handleCloseUso}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmitUso}>
              Registrar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



            {/* Dialog de formulario */}

            <Dialog open={open} onOpenChange={setOpen}>

              <DialogContent className="max-w-2xl sm:max-w-lg">

                <DialogHeader>

                  <DialogTitle>{editingId ? "Editar" : "Registrar"} repuesto</DialogTitle>

                </DialogHeader>

      

                <Form {...form}>

                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                    <Tabs defaultValue="general">

                      <TabsList className="grid w-full grid-cols-2">

                        <TabsTrigger value="general">Información General</TabsTrigger>

                        <TabsTrigger value="compra-stock">Compra y Stock</TabsTrigger>

                      </TabsList>

      

                      <TabsContent value="general" className="pt-4">

                        <div className="space-y-4">

                          <FormItem>

                            <FormLabel>Código</FormLabel>

                            <FormControl>

                              <Input {...form.register("codigo")} />

                            </FormControl>

                            <FormMessage />

                          </FormItem>

      

                          <FormItem>

                            <FormLabel>Nombre</FormLabel>

                            <FormControl>

                              <Input {...form.register("nombre")} />

                            </FormControl>

                            <FormMessage />

                          </FormItem>

      

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                            <FormItem>

                              <FormLabel>Categoría</FormLabel>

                              <FormControl>

                                <select

                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"

                                  {...form.register("categoria")}

                                >

                                  {CATEGORIAS.map((cat) => (

                                    <option key={cat} value={cat}>

                                      {CATEGORIA_LABELS[cat]}

                                    </option>

                                  ))}

                                </select>

                              </FormControl>

                              <FormMessage />

                            </FormItem>

      

                            {watchedCategoria && CATEGORIA_SUBCATEGORIAS[watchedCategoria] && (

                              <FormItem>

                                <FormLabel>Subcategoría</FormLabel>

                                <FormControl>

                                  <select

                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"

                                    {...form.register("subcategoria")}

                                  >

                                    <option value="">Seleccione una subcategoría</option>

                                    {CATEGORIA_SUBCATEGORIAS[watchedCategoria].map((sub) => (

                                      <option key={sub} value={sub}>

                                        {sub}

                                      </option>

                                    ))}

                                  </select>

                                </FormControl>

                                <FormMessage />

                              </FormItem>

                            )}

                          </div>

      

                          <FormItem>

                            <FormLabel>Descripción</FormLabel>

                            <FormControl>

                              <Textarea rows={3} {...form.register("descripcion")} />

                            </FormControl>

                            <FormMessage />

                          </FormItem>

      

                          <FormItem>

                            <FormLabel>Imagen</FormLabel>

                            <FormControl>

                              <Input type="file" accept="image/*" {...form.register("imagen")} />

                            </FormControl>

                            <FormMessage />

                          </FormItem>

                        </div>

                      </TabsContent>

      

                      <TabsContent value="compra-stock" className="pt-4">

                        <div className="space-y-4">

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                            <FormItem>

                              <FormLabel>Código de compra</FormLabel>

                              <FormControl>

                                <Input {...form.register("codigoCompra")} />

                              </FormControl>

                              <FormMessage />

                            </FormItem>

      

                            <FormItem>

                              <FormLabel>Proveedor</FormLabel>

                              <FormControl>

                                <Input {...form.register("proveedor")} />

                              </FormControl>

                              <FormMessage />

                            </FormItem>

                          </div>

      

                          <FormItem>

                            <FormLabel>Precio</FormLabel>

                            <FormControl>

                              <Input

                                type="number"

                                step="0.01"

                                {...form.register("precio", { valueAsNumber: true })}

                              />

                            </FormControl>

                            <FormMessage />

                          </FormItem>

      

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                            <FormItem>

                              <FormLabel>Stock máximo</FormLabel>

                              <FormControl>

                                <Input

                                  type="number"

                                  {...form.register("stockMaximo", { valueAsNumber: true })}

                                />

                              </FormControl>

                              <FormMessage />

                            </FormItem>

      

                            <FormItem>

                              <FormLabel>Stock mínimo</FormLabel>

                              <FormControl>

                                <Input

                                  type="number"

                                  {...form.register("stockMinimo", { valueAsNumber: true })}

                                />

                              </FormControl>

                              <FormMessage />

                            </FormItem>

                          </div>

                        </div>

                      </TabsContent>

                    </Tabs>

      

                    <DialogFooter>

                      <Button variant="ghost" type="button" onClick={() => {

                        setOpen(false)

                        setEditingId(null)

                      }}>

                        Cancelar

                      </Button>

                      <Button type="submit">

                        {editingId ? "Actualizar" : "Guardar"} repuesto

                      </Button>

                    </DialogFooter>

                  </form>

                </Form>

              </DialogContent>

            </Dialog>

          </div>
        )

}
