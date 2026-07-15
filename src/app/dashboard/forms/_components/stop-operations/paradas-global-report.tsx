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
import { ArrowLeft, BarChart3, FileDown, Globe, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import type { RegistroLineaProduccion } from "@/lib/paradas-operativas/types"
import {
  calcularDisponibilidadPorLinea,
  calcularKpisRegistros,
  calcularNoConformesPorMotivo,
  calcularResumenPorLinea,
  calcularTiempoPorMotivo,
  filtrarRegistrosPorPeriodo,
  MESES_REPORTE,
  obtenerLineasConDatos,
} from "@/lib/paradas-operativas/report-metrics"
import {
  construirListadoLineas,
  formatearMinutos,
  obtenerFechaValida,
} from "@/lib/paradas-operativas/utils"

const CHART_COLORS = [
  "#89BBEF", "#4A639A", "#F87171", "#34D399",
  "#FBBF24", "#A78BFA", "#FB7185", "#60A5FA",
]

interface ParadasGlobalReportProps {
  registros: RegistroLineaProduccion[]
  lineasPersonalizadas: string[]
  onVolver: () => void
}

export function ParadasGlobalReport({
  registros,
  lineasPersonalizadas,
  onVolver,
}: ParadasGlobalReportProps) {
  const { toast } = useToast()
  const ahora = new Date()

  const aniosDisponibles = useMemo(() => {
    const set = new Set(
      registros.map((r) => obtenerFechaValida(r.apertura?.fecha).getFullYear()),
    )
    if (set.size === 0) set.add(ahora.getFullYear())
    return Array.from(set).sort((a, b) => b - a)
  }, [registros, ahora])

  const [filtroAnio, setFiltroAnio] = useState(String(ahora.getFullYear()))
  const [filtroMes, setFiltroMes] = useState(String(ahora.getMonth() + 1))
  const [exportando, setExportando] = useState(false)

  const lineasCatalogo = useMemo(
    () => construirListadoLineas(lineasPersonalizadas, registros),
    [lineasPersonalizadas, registros],
  )

  const registrosFiltrados = useMemo(
    () => filtrarRegistrosPorPeriodo(registros, filtroAnio, filtroMes),
    [registros, filtroAnio, filtroMes],
  )

  const lineasConDatos = useMemo(
    () => obtenerLineasConDatos(registrosFiltrados, lineasCatalogo),
    [registrosFiltrados, lineasCatalogo],
  )

  const kpis = useMemo(
    () => calcularKpisRegistros(registrosFiltrados),
    [registrosFiltrados],
  )

  const resumenPorLinea = useMemo(
    () => calcularResumenPorLinea(registrosFiltrados, lineasConDatos),
    [registrosFiltrados, lineasConDatos],
  )

  const tiempoPorMotivo = useMemo(
    () => calcularTiempoPorMotivo(registrosFiltrados),
    [registrosFiltrados],
  )

  const noConformesPorMotivo = useMemo(
    () => calcularNoConformesPorMotivo(registrosFiltrados),
    [registrosFiltrados],
  )

  const disponibilidadPorLinea = useMemo(
    () => calcularDisponibilidadPorLinea(resumenPorLinea),
    [resumenPorLinea],
  )

  const tiempoPorLinea = useMemo(
    () =>
      resumenPorLinea.map((item) => ({
        linea: item.linea.length > 14 ? `${item.linea.slice(0, 12)}…` : item.linea,
        lineaCompleta: item.linea,
        minutos: item.tiempoPerdido,
      })),
    [resumenPorLinea],
  )

  const cumplimientoPorLinea = useMemo(
    () =>
      resumenPorLinea
        .filter((item) => item.cerrados > 0)
        .map((item) => ({
          linea: item.linea.length > 14 ? `${item.linea.slice(0, 12)}…` : item.linea,
          lineaCompleta: item.linea,
          cumplimiento: item.cumplimientoPromedio,
        })),
    [resumenPorLinea],
  )

  const etiquetaPeriodo = useMemo(() => {
    const mesLabel = MESES_REPORTE.find((m) => m.value === filtroMes)?.label ?? filtroMes
    return `${mesLabel} ${filtroAnio}`
  }, [filtroAnio, filtroMes])

  async function exportarInforme(formato: "excel" | "pdf") {
    if (resumenPorLinea.length === 0) {
      toast({
        title: "Sin datos para exportar",
        description: "No hay registros en el mes seleccionado.",
        variant: "destructive",
      })
      return
    }

    setExportando(true)
    try {
      const dataToExport = resumenPorLinea.map((item, index) => ({
        "#": index + 1,
        Línea: item.linea,
        Registros: item.registros,
        Activos: item.activos,
        Cerrados: item.cerrados,
        Paradas: item.totalParadas,
        "Tiempo perdido": formatearMinutos(item.tiempoPerdido),
        "Cumplimiento %": item.cerrados > 0 ? item.cumplimientoPromedio : "—",
        "Disponibilidad %": item.disponibilidadPromedio,
        "No conformes": item.noConformes,
        "Unidades reales": item.unidadesReales,
        "Unidades programadas": item.unidadesProgramadas,
      }))

      const columns = Object.keys(dataToExport[0] || {})
      const fileName = `Informe_Global_Paradas_${filtroMes}-${filtroAnio}`
      const title = `Informe global de paradas operativas — ${etiquetaPeriodo}`

      if (formato === "excel") {
        await exportToExcel(dataToExport, fileName)
      } else {
        await exportToPDF(dataToExport, columns, title, fileName)
      }

      toast({
        title: "Informe generado",
        description: `Se exportó el informe global en formato ${formato.toUpperCase()}.`,
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
            <Globe className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Informe global mensual</h3>
              <p className="text-xs text-muted-foreground">
                Consolidado de todas las líneas de producción
              </p>
            </div>
          </div>
        </div>
        <Badge variant="outline">
          {kpis.registros} registro{kpis.registros !== 1 ? "s" : ""} · {resumenPorLinea.length}{" "}
          línea{resumenPorLinea.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Período del informe</CardTitle>
              <CardDescription>
                Selecciona el mes y año para el consolidado de todas las líneas
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
          <div className="grid gap-4 sm:grid-cols-2 max-w-md">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Mes
              </label>
              <Select value={filtroMes} onValueChange={setFiltroMes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES_REPORTE.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Año
              </label>
              <Select value={filtroAnio} onValueChange={setFiltroAnio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aniosDisponibles.map((anio) => (
                    <SelectItem key={anio} value={String(anio)}>
                      {anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Mostrando datos de <strong>{etiquetaPeriodo}</strong>
            {kpis.registros > 0 && (
              <> · generado el {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</>
            )}
          </p>
        </CardContent>
      </Card>

      {registrosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No hay registros de paradas operativas en <strong>{etiquetaPeriodo}</strong>.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="Registros"
              value={String(kpis.registros)}
              sub={`${kpis.activos} activos · ${kpis.cerrados} cerrados`}
            />
            <KpiCard label="Total paradas" value={String(kpis.totalParadas)} />
            <KpiCard
              label="Tiempo perdido"
              value={formatearMinutos(kpis.tiempoPerdido)}
              destacado
            />
            <KpiCard
              label="Cumplimiento prom."
              value={kpis.cerrados > 0 ? `${kpis.cumplimientoPromedio}%` : "—"}
              sub={
                kpis.cerrados > 0
                  ? `${kpis.unidadesReales.toLocaleString()} / ${kpis.unidadesProgramadas.toLocaleString()} uds.`
                  : "Sin cierres en el mes"
              }
            />
            <KpiCard
              label="No conformes"
              value={
                kpis.cerrados > 0
                  ? kpis.noConformesTotales.toLocaleString()
                  : kpis.noConformesEnParadas.toLocaleString()
              }
              sub={
                kpis.cerrados > 0
                  ? `${kpis.tasaNoConformidad}% sobre unidades reales`
                  : "Acumulado en paradas del mes"
              }
            />
            <KpiCard
              label="Disponibilidad prom."
              value={`${kpis.disponibilidadPromedio}%`}
              sub="Tiempo productivo vs turno programado"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Comparativo por línea — {etiquetaPeriodo}
              </CardTitle>
              <CardDescription>
                Resumen mensual de cada línea con actividad registrada
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Línea</TableHead>
                    <TableHead className="text-right">Registros</TableHead>
                    <TableHead className="text-right">Paradas</TableHead>
                    <TableHead className="text-right">Tiempo perdido</TableHead>
                    <TableHead className="text-right">Cumplimiento</TableHead>
                    <TableHead className="text-right">Disponibilidad</TableHead>
                    <TableHead className="text-right">No conformes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumenPorLinea.map((item) => (
                    <TableRow key={item.linea}>
                      <TableCell className="font-medium">{item.linea}</TableCell>
                      <TableCell className="text-right">
                        {item.registros}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({item.cerrados} cerr.)
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{item.totalParadas}</TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatearMinutos(item.tiempoPerdido)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.cerrados > 0 ? `${item.cumplimientoPromedio}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right">{item.disponibilidadPromedio}%</TableCell>
                      <TableCell className="text-right text-amber-700 dark:text-amber-400">
                        {item.noConformes.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tiempo perdido por línea</CardTitle>
                <CardDescription>Minutos improductivos en el mes</CardDescription>
              </CardHeader>
              <CardContent>
                {tiempoPorLinea.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={tiempoPorLinea} margin={{ top: 5, right: 10, left: -10, bottom: 70 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="linea"
                        tick={{ fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v: number) => [formatearMinutos(v), "Tiempo"]}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.lineaCompleta ?? ""
                        }
                      />
                      <Bar dataKey="minutos" fill="#89BBEF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Motivos de parada (global)</CardTitle>
                <CardDescription>Distribución del tiempo perdido en todas las líneas</CardDescription>
              </CardHeader>
              <CardContent>
                {tiempoPorMotivo.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
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
                <CardTitle className="text-base">Disponibilidad por línea</CardTitle>
                <CardDescription>
                  Porcentaje de tiempo productivo respecto al turno programado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {disponibilidadPorLinea.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={disponibilidadPorLinea}
                      margin={{ top: 5, right: 10, left: -10, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="linea"
                        tick={{ fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                      <Tooltip
                        formatter={(v: number) => [`${v}%`, "Disponibilidad"]}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.lineaCompleta ?? ""
                        }
                      />
                      <Bar dataKey="disponibilidad" fill="#34D399" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">No conformes por motivo</CardTitle>
                <CardDescription>
                  Unidades rechazadas o defectuosas asociadas a cada causa de parada
                </CardDescription>
              </CardHeader>
              <CardContent>
                {noConformesPorMotivo.length === 0 ? (
                  <EmptyChart mensaje="Sin unidades no conformes en el mes" />
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
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
                      <Tooltip formatter={(v: number) => [v.toLocaleString(), "No conformes"]} />
                      <Bar dataKey="unidades" name="No conformes" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {cumplimientoPorLinea.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cumplimiento de producción por línea</CardTitle>
                <CardDescription>
                  Promedio de cumplimiento en registros cerrados del mes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={cumplimientoPorLinea}
                    margin={{ top: 5, right: 10, left: -10, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="linea"
                      tick={{ fontSize: 10 }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                    <Tooltip
                      formatter={(v: number) => [`${v}%`, "Cumplimiento"]}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.lineaCompleta ?? ""
                      }
                    />
                    <Bar dataKey="cumplimiento" fill="#34D399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
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
    <p className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
      {mensaje}
    </p>
  )
}
