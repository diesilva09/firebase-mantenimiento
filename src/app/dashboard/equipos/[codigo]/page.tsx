"use client"

import React, { useMemo, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatPrice } from '@/lib/utils'
import { ArrowLeft, Folder, Eye, Download, FileSpreadsheet, FileText, File } from "lucide-react"
import { exportToExcel, exportToPDF, exportToWord } from "@/lib/export-utils"
import { useUser } from '@/firebase/auth/use-user'

interface HojaVidaRow {
  fecha: string
  descripcion: string
  responsable: string
  repuestos: string
  tipo: string
  observaciones: string
}

interface ParadaRow {
  fecha: string
  hora: string
  duracionMin: number
  motivo: string
  impacto: string
  tecnico: string
}

export default function EquipoDetallePage() {
  const router = useRouter()
  const params = useParams()
  const codigo = params.codigo as string
  const searchParams = useSearchParams()
  const view = (searchParams.get("view") || "hoja-vida") as "hoja-vida" | "paradas" | "repuestos" | "anexos"

  const [attachmentsUrl, setAttachmentsUrl] = useState<string>("")
  const [loadingAttachments, setLoadingAttachments] = useState<boolean>(true)

  useEffect(() => {
    if (typeof window === "undefined") return

    const loadAttachmentsUrl = async () => {
      setLoadingAttachments(true)
      try {
        // 1) Intentar leer desde localStorage (sinpegar siempre a la API)
        try {
          const raw = localStorage.getItem("equipos")
          if (raw) {
            const all = JSON.parse(raw) as any[]
            const eq = all.find((e) => e && e.codigo === codigo)
            if (eq?.attachmentsUrl) {
              setAttachmentsUrl(eq.attachmentsUrl as string)
              return
            }
          }
        } catch (e) {
          console.warn("No se pudo leer equipos desde localStorage para anexos", e)
        }

        // 2) Si no se encontró nada en localStorage, intentar leer directamente desde la API
        try {
          const res = await fetch("/api/equipos")
          if (!res.ok) return
          const json = await res.json()
          const data: any[] = Array.isArray(json?.data) ? json.data : []
          const row = data.find((r) => r && r.codigo === codigo)
          if (row?.attachments_url) {
            setAttachmentsUrl(row.attachments_url as string)
          }
        } catch (e) {
          console.warn("No se pudo cargar attachments_url desde /api/equipos", e)
        }
      } finally {
        setLoadingAttachments(false)
      }
    }

    loadAttachmentsUrl()
  }, [codigo])

 const [hojaVida, setHojaVida] = useState<HojaVidaRow[]>([])
const [loadingHojaVida, setLoadingHojaVida] = useState(false)
const [tipoFilter, setTipoFilter] = useState<string>("")
const [startDateFilter, setStartDateFilter] = useState<string>("")
const [endDateFilter, setEndDateFilter] = useState<string>("")

useEffect(() => {
  const fetchHojaVida = async () => {
    try {
      setLoadingHojaVida(true)
      const res = await fetch(
        `/api/equipos/historial?codigoEquipo=${encodeURIComponent(codigo)}`
      )
      if (!res.ok) {
        console.warn("Error cargando hoja de vida desde equipos_historial")
        setHojaVida([])
        return
      }

      const json = await res.json()
      const data: any[] = Array.isArray(json?.data) ? json.data : []

      const mapped: HojaVidaRow[] = data.map((r) => ({
        fecha:
          typeof r.fecha_evento === "string"
            ? r.fecha_evento.slice(0, 10) // yyyy-mm-dd
            : "",
        descripcion: r.labor ?? "",
        responsable: r.ejecutado_por ?? "",
        repuestos: r.repuestos_usados ?? "",
        tipo: r.tipo_mantenimiento ?? "",
        observaciones: r.observaciones ?? "",
      }))

      setHojaVida(mapped)
    } catch (e) {
      console.warn("No se pudo cargar equipos_historial", e)
      setHojaVida([])
    } finally {
      setLoadingHojaVida(false)
    }
  }

  fetchHojaVida()
}, [codigo])

  const [startDateFilterParadas, setStartDateFilterParadas] = useState<string>("")
  const [endDateFilterParadas, setEndDateFilterParadas] = useState<string>("")

  const paradas = useMemo<ParadaRow[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const raw = localStorage.getItem("paradasOperativas")
      if (!raw) return []
      const all = JSON.parse(raw) as any[]
      return all
        .filter((r) => r && r.codigoEquipo === codigo)
        .map((r) => ({
          fecha: typeof r.fecha === "string" ? r.fecha : "",
          hora: r.horaParada ?? "",
          duracionMin: typeof r.duracion === "number" ? r.duracion : 0,
          motivo: r.motivo ?? "",
          impacto: r.impacto ?? "",
          tecnico: r.tecnico ?? "",
        }))
    } catch (e) {
      console.warn("No se pudo leer paradasOperativas desde localStorage", e)
      return []
    }
  }, [codigo])

  const filteredParadas = useMemo(() => {
    return paradas.filter((row) => {
      // Filtros por fecha (row.fecha está en formato yyyy-mm-dd)
      if (startDateFilterParadas && row.fecha && row.fecha < startDateFilterParadas) return false
      if (endDateFilterParadas && row.fecha && row.fecha > endDateFilterParadas) return false

      return true
    })
  }, [paradas, startDateFilterParadas, endDateFilterParadas])

  const [expandedHojaVidaIndex, setExpandedHojaVidaIndex] = useState<number | null>(null)
  const [expandedParadaIndex, setExpandedParadaIndex] = useState<number | null>(null)

  const filteredHojaVida = useMemo(() => {
    return hojaVida.filter((row) => {
      const normalizedTipo = (row.tipo || "").toLowerCase().trim()

      // Filtro por tipo de mantenimiento (comparación normalizada)
      if (tipoFilter && normalizedTipo !== tipoFilter) return false

      // Filtros por fecha (row.fecha está en formato yyyy-mm-dd)
      if (startDateFilter && row.fecha && row.fecha < startDateFilter) return false
      if (endDateFilter && row.fecha && row.fecha > endDateFilter) return false

      return true
    })
  }, [hojaVida, tipoFilter, startDateFilter, endDateFilter])

  const handleExportHojaVida = (format: 'excel' | 'pdf' | 'word') => {
    const dataToExport = filteredHojaVida.map(row => ({
      'Fecha': row.fecha,
      'Descripción': row.descripcion,
      'Responsable': row.responsable,
      'Repuestos': row.repuestos,
      'Tipo': row.tipo,
      'Observaciones': row.observaciones
    }));

    const columns = ['Fecha', 'Descripción', 'Responsable', 'Repuestos', 'Tipo', 'Observaciones'];
    const filename = `Hoja_Vida_${codigo}_${new Date().toISOString().split('T')[0]}`;

    if (format === 'excel') {
      exportToExcel(dataToExport, filename);
    } else if (format === 'pdf') {
      exportToPDF(dataToExport, columns, `Hoja de Vida - Equipo ${codigo}`, filename);
    } else if (format === 'word') {
      exportToWord(dataToExport, columns, `Hoja de Vida - Equipo ${codigo}`, filename);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Detalle del equipo</h1>
          <p className="text-sm text-muted-foreground">Información asociada al código: {codigo}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex items-center gap-1 text-sm shrink-0"
          onClick={() => router.push(`/dashboard/equipos?view=list&selectedCodigo=${encodeURIComponent(codigo)}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver</span>
        </Button>
      </div>
      {view === "hoja-vida" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Hoja de vida</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExportHojaVida('excel')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportHojaVida('pdf')}>
                  <FileText className="mr-2 h-4 w-4 text-red-600" /> PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportHojaVida('word')}>
                  <File className="mr-2 h-4 w-4 text-blue-600" /> Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] sm:text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">Tipo mantenimiento</span>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-[11px] focus-visible:outline-none"
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="correctivo">Correctivo</option>
                <option value="preventivo">Preventivo</option>
                <option value="rutinario">Rutinario</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">Desde</span>
              <Input
                type="date"
                className="h-8 px-2 text-[11px]"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">Hasta</span>
              <Input
                type="date"
                className="h-8 px-2 text-[11px]"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border bg-card">
            <table className="min-w-full text-[11px] sm:text-xs">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 font-semibold">Fecha</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 font-semibold">Descripción del trabajo</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 font-semibold">Responsable</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 font-semibold">Repuestos usados</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 font-semibold">Tipo</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 font-semibold hidden sm:table-cell">Observaciones</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 font-semibold text-right">Ver</th>
                </tr>
              </thead>
              <tbody>
                {hojaVida.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 py-4 sm:px-3 text-center text-muted-foreground">
                      No hay registros de hoja de vida aún para este equipo.
                    </td>
                  </tr>
                ) : filteredHojaVida.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 py-4 sm:px-3 text-center text-muted-foreground">
                      No hay registros que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredHojaVida.map((row, idx) => (
                    <React.Fragment key={`hv-${idx}`}>
                      <tr className="border-t">
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-top whitespace-nowrap">{row.fecha}</td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-top max-w-[140px] sm:max-w-xs truncate" title={row.descripcion}>{row.descripcion}</td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-top whitespace-nowrap">{row.responsable}</td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-top max-w-[140px] sm:max-w-xs truncate" title={row.repuestos}>{row.repuestos}</td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-top whitespace-nowrap">{row.tipo}</td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-top max-w-[140px] sm:max-w-xs truncate hidden sm:table-cell" title={row.observaciones}>{row.observaciones}</td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-top text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 ml-auto"
                            onClick={() =>
                              setExpandedHojaVidaIndex(prev => (prev === idx ? null : idx))
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                      {expandedHojaVidaIndex === idx && (
                        <tr className="border-t bg-muted/30">
                          <td colSpan={7} className="px-2 py-3 sm:px-3">
                            <div className="grid gap-2 text-[11px] sm:text-xs sm:grid-cols-2">
                              <div className="flex gap-2">
                                <span className="font-medium text-muted-foreground shrink-0">Descripción:</span>
                                <span className="whitespace-pre-wrap break-all">{row.descripcion || "-"}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="font-medium text-muted-foreground shrink-0">Repuestos usados:</span>
                                <span className="whitespace-pre-wrap break-all">{row.repuestos || "-"}</span>
                              </div>
                              <div className="flex gap-2 sm:col-span-2">
                                <span className="font-medium text-muted-foreground shrink-0">Observaciones:</span>
                                <span className="whitespace-pre-wrap break-all">{row.observaciones || "-"}</span>
                              </div>
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

      {view === "paradas" && (
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Paradas operativas</h2>

          <div className="flex flex-wrap gap-2 text-[11px] sm:text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">Desde</span>
              <Input
                type="date"
                className="h-8 px-2 text-[11px]"
                value={startDateFilterParadas}
                onChange={(e) => setStartDateFilterParadas(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">Hasta</span>
              <Input
                type="date"
                className="h-8 px-2 text-[11px]"
                value={endDateFilterParadas}
                onChange={(e) => setEndDateFilterParadas(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border bg-card">
            <table className="min-w-full text-xs">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Hora</th>
                  <th className="px-3 py-2 font-semibold">Duración (min)</th>
                  <th className="px-3 py-2 font-semibold">Motivo</th>
                  <th className="px-3 py-2 font-semibold">Impacto en producción</th>
                  <th className="px-3 py-2 font-semibold">Técnico encargado</th>
                  <th className="px-3 py-2 font-semibold text-right">Ver</th>
                </tr>
              </thead>
              <tbody>
                {paradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                      No hay paradas operativas registradas aún para este equipo.
                    </td>
                  </tr>
                ) : filteredParadas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                      No hay paradas operativas que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredParadas.map((row, idx) => (
                    <React.Fragment key={`po-${idx}`}>
                      <tr className="border-t">
                        <td className="px-3 py-2 align-top whitespace-nowrap">{row.fecha}</td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">{row.hora}</td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">{row.duracionMin}</td>
                        <td className="px-3 py-2 align-top max-w-xs truncate" title={row.motivo}>{row.motivo}</td>
                        <td className="px-3 py-2 align-top max-w-xs truncate" title={row.impacto}>{row.impacto}</td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">{row.tecnico}</td>
                        <td className="px-3 py-2 align-top text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() =>
                              setExpandedParadaIndex(prev => (prev === idx ? null : idx))
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                      {expandedParadaIndex === idx && (
                        <tr className="border-t bg-muted/30">
                          <td colSpan={7} className="px-3 py-3">
                            <div className="grid gap-2 text-[11px] sm:text-xs sm:grid-cols-2">
                              <div className="flex gap-2">
                                <span className="font-medium text-muted-foreground shrink-0">Motivo:</span>
                                <span className="whitespace-pre-wrap break-all">{row.motivo || "-"}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="font-medium text-muted-foreground shrink-0">Impacto en producción:</span>
                                <span className="whitespace-pre-wrap break-all">{row.impacto || "-"}</span>
                              </div>
                              <div className="flex gap-2 sm:col-span-2">
                                <span className="font-medium text-muted-foreground shrink-0">Técnico encargado:</span>
                                <span className="whitespace-pre-wrap break-all">{row.tecnico || "-"}</span>
                              </div>
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

      {view === "repuestos" && (
        <RepuestosSection codigoEquipo={codigo} />
      )}

      {view === "anexos" && (
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Anexos</h2>
          <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground space-y-4">
            {loadingAttachments ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent"></div>
                <span>Cargando carpeta...</span>
              </div>
            ) : attachmentsUrl ? (
              <button
                type="button"
                className="flex items-center gap-3 rounded-md border bg-background px-4 py-3 text-left hover:bg-accent/60"
                onClick={() => {
                  if (attachmentsUrl) {
                    window.open(attachmentsUrl, "_blank")
                  }
                }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  <Folder className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Carpeta de anexos en Drive</span>
                  <span className="text-xs text-muted-foreground">
                    Haz clic para abrir la carpeta de documentos, manuales y planos de este equipo en una nueva pestaña.
                  </span>
                </div>
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Este equipo aún no tiene configurada una carpeta de anexos. Agrega la URL de la carpeta de Drive desde el formulario de equipos.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface Repuesto {
  id: number
  codigo_equipo: string
  codigo_repuesto: string
  nombre: string
  descripcion: string | null
  cantidad: number
  precio: number | null
  ubicacion: string | null
  foto_url: string | null
}

function RepuestosSection({ codigoEquipo }: { codigoEquipo: string }) {
  const { user } = useUser()
  const [repuestos, setRepuestos] = useState<Repuesto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isAdmin, setIsAdmin] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Repuesto | null>(null)
  const [codigoRepuesto, setCodigoRepuesto] = useState("")
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [cantidad, setCantidad] = useState<number | "">("")
  const [ubicacion, setUbicacion] = useState("")
  const [precio, setPrecio] = useState<number | "">("")
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Repuesto | null>(null)
  const [expandedRepuestoId, setExpandedRepuestoId] = useState<number | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchRepuestos = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/repuestos?codigo_equipo=${encodeURIComponent(codigoEquipo)}`)
        if (!res.ok) throw new Error("Error cargando repuestos")
        const json = await res.json()
        const data = Array.isArray(json?.data) ? json.data : []
        // Asegurar que el precio se mapee correctamente
        const mappedData = data.map((r: any) => {
          // Debug: ver qué viene de la API
          console.log('Repuesto desde API:', { id: r.id, nombre: r.nombre, precio_raw: r.precio, tipo_precio: typeof r.precio })
          
          // Procesar precio: puede venir como string, number, null, undefined, o "0"
          // IMPORTANTE: 0 es un valor válido, no debe tratarse como null
          let precioValue: number | null = null
          
          // Verificar si el precio existe (incluyendo 0 como valor válido)
          if (r.precio !== null && r.precio !== undefined) {
            // Si es string vacío, es null
            if (r.precio === '') {
              precioValue = null
            } else {
              // Convertir a número (puede ser string "0" o número 0)
              if (typeof r.precio === 'string') {
                const parsed = parseFloat(r.precio)
                precioValue = isNaN(parsed) ? null : parsed
              } else {
                precioValue = Number(r.precio)
              }
            }
          }
          
          console.log('Precio procesado:', precioValue, 'tipo:', typeof precioValue, 'es 0?', precioValue === 0)
          return {
            ...r,
            precio: precioValue
          }
        })
        setRepuestos(mappedData as Repuesto[])
      } catch (e) {
        console.warn("Error cargando repuestos", e)
        setError("No se pudieron cargar los repuestos de este equipo.")
      } finally {
        setLoading(false)
      }
    }

    fetchRepuestos()
  }, [codigoEquipo])

  useEffect(() => {
    let mounted = true
    const checkAdmin = async () => {
      if (!user) {
        if (mounted) setIsAdmin(false)
        return
      }
      // Validar contra la variable de entorno pública o API
      const email = user.email?.toLowerCase().trim()
      if (email) {
        const adminEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
        if (mounted) setIsAdmin(adminEnv.includes(email))
      }
    }
    checkAdmin()
    return () => { mounted = false }
  }, [user])

  const resetForm = () => {
    setCodigoRepuesto("")
    setNombre("")
    setDescripcion("")
    setCantidad("")
    setPrecio("")
    setUbicacion("")
    setFotoFile(null)
    setEditing(null)
  }

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = (err) => reject(err)
      reader.readAsDataURL(file)
    })
  }

  const openForCreate = () => {
    resetForm()
    setOpen(true)
  }

  const openForEdit = (rep: Repuesto) => {
    console.log('Abriendo para editar repuesto:', rep)
    console.log('Precio del repuesto:', rep.precio, 'tipo:', typeof rep.precio)
    setEditing(rep)
    setCodigoRepuesto(rep.codigo_repuesto)
    setNombre(rep.nombre)
    setDescripcion(rep.descripcion || "")
    setCantidad(rep.cantidad)
    // Manejar precio: si es null/undefined usar "", si es 0 o número usar el número
    const precioValue = rep.precio === null || rep.precio === undefined ? "" : rep.precio
    console.log('Precio establecido en formulario:', precioValue)
    setPrecio(precioValue)
    setUbicacion(rep.ubicacion || "")
    setFotoFile(null)
    setOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!isAdmin) return

    try {
      const res = await fetch(`/api/repuestos?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error eliminando repuesto")
      setRepuestos(prev => prev.filter(r => r.id !== id))
      setDeleteTarget(null)
    } catch (e) {
      console.error(e)
      setError("No se pudo eliminar el repuesto.")
    }
  }

  const handleSave = async () => {
    if (!codigoRepuesto.trim() || !nombre.trim()) return

    try {
      setSaving(true)
      setError(null)

      let fotoUrl: string | null = null
      if (fotoFile) {
        fotoUrl = await readFileAsDataUrl(fotoFile)
      }

      const payload = {
        codigoEquipo,
        codigoRepuesto: codigoRepuesto.trim(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        cantidad: typeof cantidad === "number" ? cantidad : 0,
        precio: precio !== "" && precio !== null && precio !== undefined ? (typeof precio === "number" ? precio : Number(precio)) : null,
        ubicacion: ubicacion.trim() || null,
        fotoUrl,
      }

      const isEdit = !!editing
      const res = await fetch("/api/repuestos", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...payload, id: editing!.id } : payload),
      })

      if (!res.ok) throw new Error(isEdit ? "Error al actualizar el repuesto" : "Error al guardar el repuesto")
      const saved = await res.json()
      console.log('Respuesta del servidor después de guardar:', saved)
      console.log('Precio en respuesta:', saved.precio, 'tipo:', typeof saved.precio)
      
      // Asegurar que el precio se mapee correctamente (incluyendo cuando es 0)
      let precioMapped: number | null = null
      if (saved.precio !== null && saved.precio !== undefined && saved.precio !== '') {
        if (typeof saved.precio === 'string') {
          const parsed = parseFloat(saved.precio)
          precioMapped = isNaN(parsed) ? null : parsed
        } else {
          precioMapped = Number(saved.precio)
        }
      }
      
      console.log('Precio mapeado:', precioMapped)
      
      const savedMapped = {
        ...saved,
        precio: precioMapped
      } as Repuesto

      setRepuestos(prev =>
        isEdit ? prev.map(r => (r.id === savedMapped.id ? savedMapped : r)) : [savedMapped, ...prev]
      )

      resetForm()
      setOpen(false)
    } catch (e) {
      console.error(e)
      setError("No se pudo guardar el repuesto.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-medium">Repuestos</h2>
        {isAdmin && (
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o)
              if (!o) resetForm()
            }}
          >
            <Button size="sm" type="button" onClick={openForCreate}>
              Agregar repuesto
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar repuesto" : "Agregar repuesto"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigoRepuesto">Código repuesto</Label>
                    <Input
                      id="codigoRepuesto"
                      placeholder="Código repuesto"
                      value={codigoRepuesto}
                      onChange={(e) => setCodigoRepuesto(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombreRepuesto">Nombre</Label>
                    <Input
                      id="nombreRepuesto"
                      placeholder="Nombre"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcionRepuesto">Descripción</Label>
                  <Input
                    id="descripcionRepuesto"
                    placeholder="Descripción"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cantidadRepuesto">Cantidad</Label>
                    <Input
                      id="cantidadRepuesto"
                      type="number"
                      placeholder="Cantidad"
                      value={cantidad}
                      onChange={(e) => {
                        const v = e.target.value
                        setCantidad(v === "" ? "" : Number(v))
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="precioRepuesto">Precio</Label>
                    <Input
                      id="precioRepuesto"
                      type="number"
                      step="0.01"
                      placeholder="Precio"
                      value={precio}
                      onChange={(e) => {
                        const v = e.target.value
                        setPrecio(v === "" ? "" : Number(v))
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ubicacionRepuesto">Ubicación</Label>
                    <Input
                      id="ubicacionRepuesto"
                      placeholder="Ubicación"
                      value={ubicacion}
                      onChange={(e) => setUbicacion(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fotoRepuesto">Imagen del repuesto</Label>
                    <Input
                      id="fotoRepuesto"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null
                        setFotoFile(file)
                      }}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !codigoRepuesto.trim() || !nombre.trim()}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        {loading ? (
          <div className="p-4 text-xs text-muted-foreground">Cargando repuestos...</div>
        ) : error ? (
          <div className="p-4 text-xs text-red-600">{error}</div>
        ) : repuestos.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">
            Aún no hay repuestos registrados para este equipo.
          </div>
        ) : (
          <table className="min-w-full text-xs">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Foto</th>
                <th className="px-3 py-2 font-semibold">Código repuesto</th>
                <th className="px-3 py-2 font-semibold">Nombre</th>
                <th className="px-3 py-2 font-semibold">Descripción</th>
                <th className="px-3 py-2 font-semibold">Cantidad</th>
                <th className="px-3 py-2 font-semibold">Precio</th>
                <th className="px-3 py-2 font-semibold">Ubicación</th>
                <th className="px-3 py-2 font-semibold text-right">Ver</th>
                {isAdmin && <th className="px-3 py-2 font-semibold text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {repuestos.map((r) => (
                <React.Fragment key={r.id}>
                  <tr className="border-t">
                    <td className="px-3 py-2 align-top">
                      {r.foto_url ? (
                        <button
                          type="button"
                          className="inline-flex rounded-md border bg-background p-0.5 hover:bg-accent"
                          onClick={() => setImagePreviewUrl(r.foto_url!)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={r.foto_url}
                            alt={r.nombre}
                            className="h-10 w-10 rounded-md object-cover"
                          />
                        </button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">{r.codigo_repuesto}</td>
                    <td className="px-3 py-2 align-top">{r.nombre}</td>
                    <td className="px-3 py-2 align-top max-w-xs whitespace-nowrap truncate" title={r.descripcion || "-"}>
                      {r.descripcion || "-"}
                    </td>
                    <td className="px-3 py-2 align-top">{r.cantidad}</td>
                    <td className="px-3 py-2 align-top">
                      {formatPrice(r.precio)}
                    </td>
                    <td className="px-3 py-2 align-top">{r.ubicacion || "-"}</td>
                    <td className="px-3 py-2 align-top text-right">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() =>
                          setExpandedRepuestoId(prev => (prev === r.id ? null : r.id))
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                    {isAdmin && (
                      <td className="px-3 py-2 align-top">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <span className="sr-only">Acciones</span>
                                ⋮
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              <DropdownMenuItem onClick={() => openForEdit(r)}>
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => setDeleteTarget(r)}
                              >
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    )}
                  </tr>

                  {expandedRepuestoId === r.id && (
                    <tr className="border-t bg-muted/30">
                      <td
                        className="px-3 py-3"
                        colSpan={isAdmin ? 9 : 8}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                          <div className="flex justify-center sm:justify-start">
                            {r.foto_url ? (
                              <button
                                type="button"
                                className="inline-flex rounded-md border bg-background p-1 hover:bg-accent"
                                onClick={() => setImagePreviewUrl(r.foto_url!)}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={r.foto_url}
                                  alt={r.nombre}
                                  className="h-32 w-32 rounded-md object-contain"
                                />
                              </button>
                            ) : (
                              <div className="h-32 w-32 rounded-md border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                Sin imagen
                              </div>
                            )}
                          </div>
                          <div className="flex-1 space-y-2 text-[11px] sm:text-xs">
                            <div className="flex gap-2">
                              <span className="font-medium text-muted-foreground shrink-0">Descripción:</span>
                              <span className="whitespace-pre-wrap break-words">{r.descripcion || "-"}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-medium text-muted-foreground shrink-0">Cantidad:</span>
                              <span>{r.cantidad}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-medium text-muted-foreground shrink-0">Precio:</span>
                              <span>
                                {formatPrice(r.precio)}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-medium text-muted-foreground shrink-0">Ubicación:</span>
                              <span>{r.ubicacion || "-"}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isAdmin && deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar repuesto</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              ¿Seguro que deseas eliminar el repuesto
              {" "}
              <span className="font-medium">
                {deleteTarget.codigo_repuesto} - {deleteTarget.nombre}
              </span>
              ? Esta acción no se puede deshacer.
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
                onClick={() => handleDelete(deleteTarget.id)}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {imagePreviewUrl && (
        <Dialog open={!!imagePreviewUrl} onOpenChange={(open) => !open && setImagePreviewUrl(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Imagen del repuesto</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center items-center mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt="Imagen del repuesto"
                className="max-h-[70vh] w-auto rounded-md object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
