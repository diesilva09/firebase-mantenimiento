"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ArrowLeft, CalendarIcon, Eye, Factory, FileDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { exportToExcel, exportToPDF } from "@/lib/export-utils"
import { TURNOS_SUGERIDOS } from "@/lib/paradas-operativas/constants"
import type { ParadaOperativaDetalle, RegistroLineaProduccion } from "@/lib/paradas-operativas/types"
import {
  calcularCumplimiento,
  calcularMinutosEntreHoras,
  calcularTasaNoConformidad,
  calcularUnidadesConformes,
  formatearMinutos,
  getLineaLabel,
  registroCoincideFecha,
  registroCoincideLinea,
  registroCoincidePeriodo,
  sumarMinutosParadas,
  sumarUnidadesNoConformes,
} from "@/lib/paradas-operativas/utils"
import { cn } from "@/lib/utils"
import { StopDetailDialog } from "./stop-detail-dialog"

const CHART_COLORS = [
  "#89BBEF", "#4A639A", "#F87171", "#34D399",
  "#FBBF24", "#A78BFA", "#FB7185", "#60A5FA",
]

const MESES = [
  { value: "todos", label: "Todos los meses" },
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
]

interface ParadaConContexto {
  parada: ParadaOperativaDetalle
  registro: RegistroLineaProduccion
  indice: number
}

interface ParadasLineReportProps {
  lineaKey: string
  registros: RegistroLineaProduccion[]
  onVolver: () => void
}

export function ParadasLineReport({ lineaKey, registros, onVolver }: ParadasLineReportProps) {
  const { toast } = useToast()
  const registrosDeLinea = useMemo(
    () => registros.filter((r) => registroCoincideLinea(r, lineaKey)),
    [registros, lineaKey],
  )

  const aniosDisponibles = useMemo(() => {
    const set = new Set(registrosDeLinea.map((r) => r.apertura.fecha.getFullYear()))
    return Array.from(set).sort((a, b) => b - a)
  }, [registrosDeLinea])

  const [filtroAnio, setFiltroAnio] = useState("todos")
  const [filtroMes, setFiltroMes] = useState("todos")
  const [filtroTurno, setFiltroTurno] = useState("todos")
  const [filtroLote, setFiltroLote] = useState("")
  const [filtroFechaEspecifica, setFiltroFechaEspecifica] = useState<Date | undefined>()
  const [paradaDetalle, setParadaDetalle] = useState<ParadaConContexto | null>(null)
  const [exportando, setExportando] = useState(false)

  const registrosFiltrados = useMemo(() => {
    return registrosDeLinea.filter((r) => {
      if (!registroCoincideFecha(r.apertura.fecha, filtroFechaEspecifica)) return false
      if (
        !filtroFechaEspecifica &&
        !registroCoincidePeriodo(r.apertura.fecha, filtroAnio, filtroMes)
      ) {
        return false
      }
      if (filtroTurno !== "todos" && r.apertura.turno !== filtroTurno) return false
      if (filtroLote && !(r.apertura.lote ?? "").toLowerCase().includes(filtroLote.toLowerCase())) {
        return false
      }
      return true
    })
  }, [
    registrosDeLinea,
    filtroAnio,
    filtroMes,
    filtroTurno,
    filtroLote,
    filtroFechaEspecifica,
  ])

  const paradasDetalladas = useMemo(() => {
    const items: ParadaConContexto[] = []
    for (const registro of registrosFiltrados) {
      registro.paradas?.forEach((parada, indice) => {
        items.push({ parada, registro, indice })
      })
    }

    return items.sort((a, b) => {
      const fechaDiff =
        b.registro.apertura.fecha.getTime() - a.registro.apertura.fecha.getTime()
      if (fechaDiff !== 0) return fechaDiff
      return a.parada.horaInicio.localeCompare(b.parada.horaInicio)
    })
  }, [registrosFiltrados])

  const tiempoPorMotivo = useMemo(() => {
    const map = new Map<string, number>()
    for (const reg of registrosFiltrados) {
      for (const p of reg.paradas) {
        if (!p.motivo) continue
        map.set(p.motivo, (map.get(p.motivo) ?? 0) + p.tiempoMinutos)
      }
    }
    return Array.from(map.entries())
      .map(([motivo, minutos]) => ({ motivo, minutos }))
      .sort((a, b) => b.minutos - a.minutos)
  }, [registrosFiltrados])

  const noConformesPorMotivo = useMemo(() => {
    const map = new Map<string, number>()
    for (const reg of registrosFiltrados) {
      for (const p of reg.paradas) {
        if (!p.motivo || p.unidadesNoConformes <= 0) continue
        map.set(p.motivo, (map.get(p.motivo) ?? 0) + p.unidadesNoConformes)
      }
    }
    return Array.from(map.entries())
      .map(([motivo, unidades]) => ({ motivo, unidades }))
      .sort((a, b) => b.unidades - a.unidades)
  }, [registrosFiltrados])

  const calidadPorTurno = useMemo(() => {
    return registrosFiltrados
      .filter((r) => r.estado === "cerrado" && r.cierre)
      .map((r) => {
        const reales = r.cierre!.unidadesRealesTotales
        const noConformes = r.cierre!.unidadesNoConformesTotales
        return {
          etiqueta: `${format(r.apertura.fecha, "dd MMM", { locale: es })} · ${r.apertura.lote}`,
          conformes: calcularUnidadesConformes(reales, noConformes),
          noConformes,
          reales,
        }
      })
  }, [registrosFiltrados])

  const disponibilidadPorTurno = useMemo(() => {
    return registrosFiltrados.map((r) => {
      const tiempoPerdido = sumarMinutosParadas(r.paradas)
      const minutosTurno =
        calcularMinutosEntreHoras(
          r.apertura.horaInicio,
          r.apertura.finTurnoProgramado,
        ) ?? 540
      const disponibilidad = Math.max(
        0,
        Math.min(100, Math.round(((minutosTurno - tiempoPerdido) / minutosTurno) * 100)),
      )
      return {
        etiqueta: `${format(r.apertura.fecha, "dd/MM", { locale: es })} · ${r.apertura.lote}`,
        disponibilidad,
        tiempoPerdido,
        paradas: r.paradas.length,
      }
    })
  }, [registrosFiltrados])

  const impactoProduccion = useMemo(() => {
    return registrosFiltrados
      .filter((r) => r.estado === "cerrado" && r.cierre)
      .map((r) => ({
        id: r.id,
        etiqueta: `${format(r.apertura.fecha, "dd MMM", { locale: es })} · ${r.apertura.lote}`,
        lote: r.apertura.lote,
        fecha: format(r.apertura.fecha, "dd/MM/yyyy", { locale: es }),
        programadas: r.apertura.unidadesProgramadas,
        reales: r.cierre!.unidadesRealesTotales,
        noConformes: r.cierre!.unidadesNoConformesTotales,
        cumplimiento: calcularCumplimiento(
          r.apertura.unidadesProgramadas,
          r.cierre!.unidadesRealesTotales,
        ),
        tiempoPerdido: sumarMinutosParadas(r.paradas),
      }))
  }, [registrosFiltrados])

  const kpis = useMemo(() => {
    const totalParadas = registrosFiltrados.reduce((acc, r) => acc + r.paradas.length, 0)
    const tiempoPerdido = registrosFiltrados.reduce(
      (acc, r) => acc + sumarMinutosParadas(r.paradas),
      0,
    )
    const cerrados = registrosFiltrados.filter((r) => r.estado === "cerrado")
    const unidadesProgramadas = registrosFiltrados.reduce(
      (acc, r) => acc + r.apertura.unidadesProgramadas,
      0,
    )
    const unidadesReales = cerrados.reduce(
      (acc, r) => acc + (r.cierre?.unidadesRealesTotales ?? 0),
      0,
    )
    const noConformesTotales = cerrados.reduce(
      (acc, r) => acc + (r.cierre?.unidadesNoConformesTotales ?? 0),
      0,
    )
    const noConformesEnParadas = registrosFiltrados.reduce(
      (acc, r) => acc + sumarUnidadesNoConformes(r.paradas),
      0,
    )
    const tasaNoConformidad =
      unidadesReales > 0 ? calcularTasaNoConformidad(unidadesReales, noConformesTotales) : 0
    const cumplimientoPromedio =
      cerrados.length > 0
        ? Math.round(
            cerrados.reduce(
              (acc, r) =>
                acc +
                calcularCumplimiento(
                  r.apertura.unidadesProgramadas,
                  r.cierre!.unidadesRealesTotales,
                ),
              0,
            ) / cerrados.length,
          )
        : 0

    return {
      registros: registrosFiltrados.length,
      activos: registrosFiltrados.filter((r) => r.estado === "activo").length,
      cerrados: cerrados.length,
      totalParadas,
      tiempoPerdido,
      unidadesProgramadas,
      unidadesReales,
      noConformesTotales,
      noConformesEnParadas,
      tasaNoConformidad,
      cumplimientoPromedio,
    }
  }, [registrosFiltrados])

  const tituloLinea = lineaKey

  function limpiarFiltros() {
    setFiltroAnio("todos")
    setFiltroMes("todos")
    setFiltroTurno("todos")
    setFiltroLote("")
    setFiltroFechaEspecifica(undefined)
  }

  async function exportarInforme(formato: "excel" | "pdf") {
    if (paradasDetalladas.length === 0 && registrosFiltrados.length === 0) {
      toast({
        title: "Sin datos para exportar",
        description: "No hay registros ni paradas con los filtros actuales.",
        variant: "destructive",
      })
      return
    }

    setExportando(true)
    try {
      const periodo =
        filtroFechaEspecifica != null
          ? format(filtroFechaEspecifica, "dd-MM-yyyy", { locale: es })
          : filtroAnio !== "todos" || filtroMes !== "todos"
            ? `${filtroMes !== "todos" ? MESES.find((m) => m.value === filtroMes)?.label : "todos"}-${filtroAnio !== "todos" ? filtroAnio : "todos"}`
            : "completo"

      const dataToExport = paradasDetalladas.map((item, index) => ({
        "#": index + 1,
        Fecha: format(item.registro.apertura.fecha, "dd/MM/yyyy", { locale: es }),
        Turno: item.registro.apertura.turno,
        Lote: item.registro.apertura.lote,
        "Hora inicio": item.parada.horaInicio,
        "Hora fin": item.parada.horaFin,
        "Tiempo parada": formatearMinutos(item.parada.tiempoMinutos),
        Motivo: item.parada.motivo || "—",
        "Unidades tramo": item.parada.unidadesReales,
        "No conformes": item.parada.unidadesNoConformes,
        Responsable: item.parada.responsable,
        Observaciones: item.parada.observaciones?.trim() || "—",
      }))

      const columns = Object.keys(dataToExport[0] || {})
      const fileName = `Informe_Paradas_${lineaKey.replace(/\s+/g, "_")}_${periodo}`
      const title = `Informe de paradas — ${tituloLinea}`

      if (formato === "excel") {
        await exportToExcel(dataToExport, fileName)
      } else {
        await exportToPDF(dataToExport, columns, title, fileName)
      }

      toast({
        title: "Informe generado",
        description: `Se exportó el informe en formato ${formato.toUpperCase()}.`,
        variant: "success",
      })
    } catch {
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el informe.",
        variant: "destructive",
      })
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onVolver}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al listado
          </Button>
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Informe — {tituloLinea}</h3>
              <p className="text-xs text-muted-foreground">
                Reporte de paradas operativas y producción
              </p>
            </div>
          </div>
        </div>
        <Badge variant="outline">
          {kpis.registros} registro{kpis.registros !== 1 ? "s" : ""} · {paradasDetalladas.length}{" "}
          parada{paradasDetalladas.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Filtros del informe</CardTitle>
              <CardDescription>
                Filtra por fecha específica, período, turno o lote
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={exportando}
                onClick={() => exportarInforme("pdf")}
              >
                {exportando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 h-4 w-4" />
                )}
                Exportar PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={exportando}
                onClick={() => exportarInforme("excel")}
              >
                {exportando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 h-4 w-4" />
                )}
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Fecha específica
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start pl-3 text-left font-normal",
                      !filtroFechaEspecifica && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filtroFechaEspecifica
                      ? format(filtroFechaEspecifica, "PPP", { locale: es })
                      : "Todas las fechas"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filtroFechaEspecifica}
                    onSelect={setFiltroFechaEspecifica}
                    locale={es}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {filtroFechaEspecifica && (
                <Button
                  type="button"
                  variant="link"
                  className="mt-1 h-auto p-0 text-xs"
                  onClick={() => setFiltroFechaEspecifica(undefined)}
                >
                  Quitar fecha
                </Button>
              )}
            </div>
            <FiltroSelect
              label="Año"
              value={filtroAnio}
              onChange={setFiltroAnio}
              disabled={!!filtroFechaEspecifica}
              opciones={[
                { value: "todos", label: "Todos los años" },
                ...aniosDisponibles.map((a) => ({ value: String(a), label: String(a) })),
              ]}
            />
            <FiltroSelect
              label="Mes"
              value={filtroMes}
              onChange={setFiltroMes}
              disabled={!!filtroFechaEspecifica}
              opciones={MESES}
            />
            <FiltroSelect
              label="Turno"
              value={filtroTurno}
              onChange={setFiltroTurno}
              opciones={[
                { value: "todos", label: "Todos los turnos" },
                ...TURNOS_SUGERIDOS.map((t) => ({ value: t, label: t })),
              ]}
            />
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Lote
              </label>
              <Input
                placeholder="Buscar lote..."
                value={filtroLote}
                onChange={(e) => setFiltroLote(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={limpiarFiltros}>
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {registrosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No hay registros para <strong>{tituloLinea}</strong> con los filtros seleccionados.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Registros" value={String(kpis.registros)} sub={`${kpis.activos} activos · ${kpis.cerrados} cerrados`} />
            <KpiCard label="Total paradas" value={String(kpis.totalParadas)} />
            <KpiCard label="Tiempo perdido" value={formatearMinutos(kpis.tiempoPerdido)} destacado />
            <KpiCard
              label="Cumplimiento prom."
              value={kpis.cerrados > 0 ? `${kpis.cumplimientoPromedio}%` : "—"}
              sub={
                kpis.cerrados > 0
                  ? `${kpis.unidadesReales.toLocaleString()} / ${kpis.unidadesProgramadas.toLocaleString()} uds.`
                  : "Sin cierres en el período"
              }
            />
            <KpiCard
              label="No conformes"
              value={kpis.cerrados > 0 ? kpis.noConformesTotales.toLocaleString() : kpis.noConformesEnParadas.toLocaleString()}
              sub={
                kpis.cerrados > 0
                  ? `${kpis.tasaNoConformidad}% sobre unidades reales`
                  : "Acumulado en paradas del período"
              }
            />
            <KpiCard
              label="Disponibilidad prom."
              value={
                disponibilidadPorTurno.length > 0
                  ? `${Math.round(
                      disponibilidadPorTurno.reduce((a, d) => a + d.disponibilidad, 0) /
                        disponibilidadPorTurno.length,
                    )}%`
                  : "—"
              }
              sub="Tiempo productivo vs turno programado"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paradas registradas</CardTitle>
              <CardDescription>
                Cada parada del período filtrado. Haz clic en una fila para ver el detalle completo.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {paradasDetalladas.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No hay paradas registradas con los filtros seleccionados.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Turno</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead>Tiempo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Unidades</TableHead>
                      <TableHead>No conformes</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paradasDetalladas.map((item, index) => (
                      <TableRow
                        key={`${item.registro.id}-${item.parada.id}`}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => setParadaDetalle(item)}
                      >
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          {format(item.registro.apertura.fecha, "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell>{item.registro.apertura.turno}</TableCell>
                        <TableCell>{item.registro.apertura.lote}</TableCell>
                        <TableCell className="font-mono text-sm">{item.parada.horaInicio}</TableCell>
                        <TableCell className="font-mono text-sm">{item.parada.horaFin}</TableCell>
                        <TableCell className="text-destructive">
                          {formatearMinutos(item.parada.tiempoMinutos)}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate" title={item.parada.motivo}>
                          {item.parada.motivo || "—"}
                        </TableCell>
                        <TableCell>{item.parada.unidadesReales.toLocaleString()}</TableCell>
                        <TableCell className="text-amber-700 dark:text-amber-400">
                          {item.parada.unidadesNoConformes.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setParadaDetalle(item)
                            }}
                            aria-label={`Ver detalle parada ${index + 1}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tiempo perdido por motivo</CardTitle>
                <CardDescription>Minutos improductivos en el período</CardDescription>
              </CardHeader>
              <CardContent>
                {tiempoPorMotivo.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={tiempoPorMotivo} margin={{ top: 5, right: 10, left: -10, bottom: 70 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="motivo" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatearMinutos(v), "Tiempo"]} />
                      <Bar dataKey="minutos" fill="#89BBEF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribución por motivo</CardTitle>
                <CardDescription>Proporción del tiempo perdido</CardDescription>
              </CardHeader>
              <CardContent>
                {tiempoPorMotivo.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={tiempoPorMotivo}
                        dataKey="minutos"
                        nameKey="motivo"
                        cx="50%"
                        cy="45%"
                        outerRadius={95}
                        label={({ motivo, percent }) =>
                          percent != null
                            ? `${String(motivo).split(" ")[0]} ${(percent * 100).toFixed(0)}%`
                            : String(motivo)
                        }
                        labelLine={false}
                      >
                        {tiempoPorMotivo.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatearMinutos(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">No conformes por motivo</CardTitle>
                <CardDescription>
                  Unidades rechazadas o defectuosas asociadas a cada causa de parada
                </CardDescription>
              </CardHeader>
              <CardContent>
                {noConformesPorMotivo.length === 0 ? (
                  <EmptyChart mensaje="Sin unidades no conformes en el período" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={noConformesPorMotivo}
                      margin={{ top: 5, right: 10, left: -10, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="motivo"
                        tick={{ fontSize: 10 }}
                        angle={-40}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="unidades" name="No conformes" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Disponibilidad por turno</CardTitle>
                <CardDescription>
                  Porcentaje de tiempo productivo respecto al turno programado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {disponibilidadPorTurno.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={disponibilidadPorTurno}
                      margin={{ top: 5, right: 10, left: -10, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                      <Tooltip
                        formatter={(v: number, name: string) =>
                          name === "disponibilidad" ? [`${v}%`, "Disponibilidad"] : [v, name]
                        }
                      />
                      <Bar dataKey="disponibilidad" name="Disponibilidad" fill="#34D399" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calidad por turno cerrado</CardTitle>
              <CardDescription>
                Unidades conformes vs no conformes al cierre de cada lote/turno
              </CardDescription>
            </CardHeader>
            <CardContent>
              {calidadPorTurno.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No hay registros cerrados en este período para analizar calidad.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={calidadPorTurno} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="conformes" name="Conformes" stackId="calidad" fill="#34D399" />
                    <Bar dataKey="noConformes" name="No conformes" stackId="calidad" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Impacto en la producción</CardTitle>
              <CardDescription>
                Unidades programadas vs reales por turno/lote cerrado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {impactoProduccion.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No hay registros cerrados en este período para comparar producción.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={impactoProduccion} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="programadas" name="Unidades programadas" fill="#4A639A" />
                    <Bar dataKey="reales" name="Unidades reales" fill="#34D399" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalle de registros</CardTitle>
              <CardDescription>Historial de turnos y lotes en el período filtrado</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Paradas</TableHead>
                    <TableHead>T. perdido</TableHead>
                    <TableHead>Prog.</TableHead>
                    <TableHead>Reales</TableHead>
                    <TableHead>No conf.</TableHead>
                    <TableHead>Cumpl.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrosFiltrados.map((r) => {
                    const tiempo = sumarMinutosParadas(r.paradas)
                    const reales =
                      r.cierre?.unidadesRealesTotales ??
                      r.paradas.reduce((a, p) => a + p.unidadesReales, 0)
                    const cumpl = calcularCumplimiento(r.apertura.unidadesProgramadas, reales)

                    const noConformes =
                      r.cierre?.unidadesNoConformesTotales ??
                      sumarUnidadesNoConformes(r.paradas)

                    return (
                      <TableRow key={r.id}>
                        <TableCell>{format(r.apertura.fecha, "dd/MM/yyyy", { locale: es })}</TableCell>
                        <TableCell>{r.apertura.turno}</TableCell>
                        <TableCell>{r.apertura.lote}</TableCell>
                        <TableCell>
                          <Badge variant={r.estado === "activo" ? "default" : "secondary"}>
                            {r.estado === "activo" ? "Activo" : "Cerrado"}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.paradas.length}</TableCell>
                        <TableCell className="text-destructive">{formatearMinutos(tiempo)}</TableCell>
                        <TableCell>{r.apertura.unidadesProgramadas.toLocaleString()}</TableCell>
                        <TableCell>{reales.toLocaleString()}</TableCell>
                        <TableCell className="text-amber-700 dark:text-amber-400">
                          {noConformes.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {r.estado === "cerrado" ? `${cumpl}%` : `${cumpl}%*`}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <p className="mt-2 text-xs text-muted-foreground">
                * Cumplimiento parcial en registros aún activos.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      <StopDetailDialog
        parada={paradaDetalle?.parada ?? null}
        indice={paradaDetalle?.indice}
        open={!!paradaDetalle}
        onOpenChange={(open) => {
          if (!open) setParadaDetalle(null)
        }}
        contexto={
          paradaDetalle
            ? {
                linea: getLineaLabel(paradaDetalle.registro.apertura),
                fecha: format(paradaDetalle.registro.apertura.fecha, "dd/MM/yyyy", {
                  locale: es,
                }),
                turno: paradaDetalle.registro.apertura.turno,
                lote: paradaDetalle.registro.apertura.lote,
              }
            : undefined
        }
      />
    </div>
  )
}

function FiltroSelect({
  label,
  value,
  onChange,
  opciones,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  opciones: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opciones.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  destacado,
}: {
  label: string
  value: string
  sub?: string
  destacado?: boolean
}) {
  return (
    <div className="rounded-xl border bg-card p-4 lg:p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold lg:text-3xl ${destacado ? "text-destructive" : ""}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function EmptyChart({ mensaje = "Sin paradas en el período seleccionado" }: { mensaje?: string }) {
  return (
    <p className="py-12 text-center text-sm text-muted-foreground">{mensaje}</p>
  )
}
