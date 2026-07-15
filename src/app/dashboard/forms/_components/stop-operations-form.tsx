"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { BarChart3, ClipboardList, Loader2 } from "lucide-react"
import type {
  AperturaLinea,
  CierreLinea,
  ParadaOperativaDetalle,
  RegistroLineaProduccion,
} from "@/lib/paradas-operativas/types"
import {
  abrirRegistroLinea,
  actualizarAperturaLinea,
  actualizarParada,
  agregarParada,
  cerrarRegistroLinea,
  eliminarParada,
  eliminarRegistroLinea,
  fetchRegistrosLinea,
  fetchLineasPersonalizadas,
  eliminarLineaPersonalizada,
} from "@/lib/paradas-operativas/api"
import {
  calcularCumplimiento,
  formatearMinutos,
  getLineaLabel,
} from "@/lib/paradas-operativas/utils"
import { PhaseStepper } from "./stop-operations/phase-stepper"
import { LineOpeningSection } from "./stop-operations/line-opening-section"
import { ActiveSessionHeader } from "./stop-operations/active-session-header"
import { StopEntrySection } from "./stop-operations/stop-entry-section"
import { LineClosureSection } from "./stop-operations/line-closure-section"
import { ParadasDashboard } from "./stop-operations/paradas-dashboard"
import {
  ActiveLinesSelector,
  type VistaOperacion,
} from "./stop-operations/active-lines-selector"
import { ClosedLinesHistory } from "./stop-operations/closed-lines-history"
import { SectionErrorBoundary } from "@/components/section-error-boundary"

export function StopOperationsForm() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando paradas operativas...
        </div>
      }
    >
      <StopOperationsFormContent />
    </Suspense>
  )
}

function StopOperationsFormContent() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const registroIdParam = searchParams.get("registroId")
  const [lineasActivas, setLineasActivas] = useState<RegistroLineaProduccion[]>([])
  const [historial, setHistorial] = useState<RegistroLineaProduccion[]>([])
  const [vistaOperacion, setVistaOperacion] = useState<VistaOperacion>("nueva")
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [editandoApertura, setEditandoApertura] = useState(false)
  const [lineasPersonalizadas, setLineasPersonalizadas] = useState<string[]>([])
  const operacionEnCurso = useRef(false)

  function puedeEjecutarOperacion(): boolean {
    if (operacionEnCurso.current || guardando) return false
    operacionEnCurso.current = true
    setGuardando(true)
    return true
  }

  function finalizarOperacion() {
    operacionEnCurso.current = false
    setGuardando(false)
  }

  useEffect(() => {
    let cancelado = false

    async function cargarRegistros() {
      try {
        const [registrosResult, personalizadasResult] = await Promise.allSettled([
          fetchRegistrosLinea(),
          fetchLineasPersonalizadas(),
        ])
        if (cancelado) return

        if (registrosResult.status === "rejected") {
          throw registrosResult.reason
        }

        const registros = registrosResult.value ?? []
        const personalizadas =
          personalizadasResult.status === "fulfilled" ? personalizadasResult.value : []

        setLineasActivas(registros.filter((r) => r?.estado === "activo"))
        setHistorial(registros.filter((r) => r?.estado === "cerrado"))
        setLineasPersonalizadas(personalizadas)

        if (registroIdParam) {
          const registroObjetivo = registros.find((r) => r.id === registroIdParam)
          if (registroObjetivo) {
            setVistaOperacion(registroObjetivo.id)
          }
        }
      } catch (err) {
        if (!cancelado) {
          toast({
            title: "Error al cargar registros",
            description:
              err instanceof Error ? err.message : "No se pudieron obtener los datos.",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargarRegistros()
    return () => {
      cancelado = true
    }
  }, [toast, registroIdParam])

  const registroSeleccionado = useMemo(
    () =>
      [...lineasActivas, ...historial].find((r) => r.id === vistaOperacion) ?? null,
    [lineasActivas, historial, vistaOperacion],
  )

  const faseActual: 1 | 2 | 3 =
    vistaOperacion === "nueva"
      ? 1
      : registroSeleccionado?.estado === "cerrado"
        ? 3
        : 2

  function integrarRegistro(registro: RegistroLineaProduccion) {
    if (registro.estado === "activo") {
      setLineasActivas((prev) => {
        const sinEste = prev.filter((r) => r.id !== registro.id)
        return [registro, ...sinEste]
      })
      setHistorial((prev) => prev.filter((r) => r.id !== registro.id))
      return
    }

    setHistorial((prev) => {
      const sinEste = prev.filter((r) => r.id !== registro.id)
      return [registro, ...sinEste]
    })
    setLineasActivas((prev) => prev.filter((r) => r.id !== registro.id))
  }

  function agregarLineaPersonalizadaLocal(nombre: string) {
    const limpio = nombre.trim()
    if (!limpio) return
    setLineasPersonalizadas((prev) =>
      prev.includes(limpio) ? prev : [...prev, limpio].sort((a, b) => a.localeCompare(b, "es")),
    )
  }

  async function sincronizarRegistrosDesdeApi() {
    const [registrosResult, personalizadasResult] = await Promise.allSettled([
      fetchRegistrosLinea(),
      fetchLineasPersonalizadas(),
    ])

    if (registrosResult.status === "rejected") {
      throw registrosResult.reason
    }

    const registros = registrosResult.value
    const personalizadas =
      personalizadasResult.status === "fulfilled" ? personalizadasResult.value : []

    setLineasActivas(registros.filter((r) => r.estado === "activo"))
    setHistorial(registros.filter((r) => r.estado === "cerrado"))
    setLineasPersonalizadas(personalizadas)
    return registros
  }

  async function refrescarLineasPersonalizadas() {
    try {
      const personalizadas = await fetchLineasPersonalizadas()
      setLineasPersonalizadas(personalizadas)
    } catch {
      // silencioso: el listado se actualiza en el próximo ciclo
    }
  }

  async function handleEliminarLineaPersonalizada(nombre: string) {
    if (!puedeEjecutarOperacion()) return
    try {
      await eliminarLineaPersonalizada(nombre)
      await refrescarLineasPersonalizadas()

      toast({
        title: "Línea eliminada del listado",
        description: `"${nombre}" ya no aparecerá en el selector de líneas.`,
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Error al eliminar línea",
        description: err instanceof Error ? err.message : "No se pudo eliminar la línea.",
        variant: "destructive",
      })
    } finally {
      finalizarOperacion()
    }
  }

  async function handleApertura(apertura: AperturaLinea) {
    if (!puedeEjecutarOperacion()) return
    try {
      const nuevo = await abrirRegistroLinea(apertura)
      integrarRegistro(nuevo)
      setVistaOperacion(nuevo.id)

      if (apertura.linea === "OTRA" && apertura.lineaOtra?.trim()) {
        agregarLineaPersonalizadaLocal(apertura.lineaOtra)
        void refrescarLineasPersonalizadas()
      }

      toast({
        title: "Línea abierta",
        description: `${getLineaLabel(apertura)} registrada en la base de datos.`,
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Error al abrir línea",
        description: err instanceof Error ? err.message : "No se pudo guardar el registro.",
        variant: "destructive",
      })
    } finally {
      finalizarOperacion()
    }
  }

  async function handleAgregarParada(
    registroId: string,
    parada: Omit<ParadaOperativaDetalle, "id">,
  ) {
    const registro = lineasActivas.find((r) => r.id === registroId)
    if (!registro || registro.estado !== "activo") return
    if (!puedeEjecutarOperacion()) return

    try {
      await agregarParada(registroId, parada)
      await sincronizarRegistrosDesdeApi()

      toast({
        title: "Parada registrada",
        description: `${getLineaLabel(registro.apertura)}: ${formatearMinutos(parada.tiempoMinutos)} — ${parada.motivo}`,
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Error al registrar parada",
        description: err instanceof Error ? err.message : "No se pudo guardar la parada.",
        variant: "destructive",
      })
      throw err
    } finally {
      finalizarOperacion()
    }
  }

  async function handleActualizarParada(
    registroId: string,
    paradaId: string,
    parada: Omit<ParadaOperativaDetalle, "id">,
  ) {
    const registro = lineasActivas.find((r) => r.id === registroId)
    if (!registro || registro.estado !== "activo") return
    if (!puedeEjecutarOperacion()) return

    try {
      await actualizarParada(registroId, paradaId, parada)
      await sincronizarRegistrosDesdeApi()

      toast({
        title: "Parada actualizada",
        description: `${getLineaLabel(registro.apertura)}: ${formatearMinutos(parada.tiempoMinutos)} — ${parada.motivo}`,
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Error al actualizar parada",
        description: err instanceof Error ? err.message : "No se pudo guardar los cambios.",
        variant: "destructive",
      })
      throw err
    } finally {
      finalizarOperacion()
    }
  }

  async function handleEliminarParada(registroId: string, paradaId: string) {
    const registro = lineasActivas.find((r) => r.id === registroId)
    if (!registro || registro.estado !== "activo") return
    if (!puedeEjecutarOperacion()) return

    try {
      await eliminarParada(registroId, paradaId)
      await sincronizarRegistrosDesdeApi()
    } catch (err) {
      toast({
        title: "Error al eliminar parada",
        description: err instanceof Error ? err.message : "No se pudo eliminar la parada.",
        variant: "destructive",
      })
    } finally {
      finalizarOperacion()
    }
  }

  async function handleActualizarApertura(registroId: string, apertura: AperturaLinea) {
    if (!puedeEjecutarOperacion()) return
    try {
      const actualizado = await actualizarAperturaLinea(registroId, apertura)
      integrarRegistro(actualizado)
      setEditandoApertura(false)

      if (apertura.linea === "OTRA" && apertura.lineaOtra?.trim()) {
        agregarLineaPersonalizadaLocal(apertura.lineaOtra)
        void refrescarLineasPersonalizadas()
      }

      toast({
        title: "Apertura actualizada",
        description: `${getLineaLabel(apertura)} guardada correctamente.`,
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Error al actualizar línea",
        description: err instanceof Error ? err.message : "No se pudo guardar los cambios.",
        variant: "destructive",
      })
    } finally {
      finalizarOperacion()
    }
  }

  async function handleEliminarLinea(registroId: string) {
    if (!puedeEjecutarOperacion()) return
    try {
      await eliminarRegistroLinea(registroId)
      const registros = await sincronizarRegistrosDesdeApi()
      setEditandoApertura(false)

      const activos = registros.filter((r) => r.estado === "activo")
      if (activos.length > 0) {
        setVistaOperacion(activos[activos.length - 1].id)
      } else {
        setVistaOperacion("nueva")
      }

      toast({
        title: "Línea eliminada",
        description: "El registro y sus paradas fueron eliminados.",
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Error al eliminar línea",
        description: err instanceof Error ? err.message : "No se pudo eliminar el registro.",
        variant: "destructive",
      })
    } finally {
      finalizarOperacion()
    }
  }

  async function handleCierre(registroId: string, cierre: CierreLinea) {
    const registro = lineasActivas.find((r) => r.id === registroId)
    if (!registro) return
    if (!puedeEjecutarOperacion()) return

    try {
      const cerrado = await cerrarRegistroLinea(registroId, cierre)
      const registros = await sincronizarRegistrosDesdeApi()

      const activos = registros.filter((r) => r.estado === "activo")
      if (activos.length > 0) {
        setVistaOperacion(activos[activos.length - 1].id)
      } else {
        setVistaOperacion("nueva")
      }

      toast({
        title: "Producción cerrada",
        description: `${getLineaLabel(cerrado.apertura)}: ${calcularCumplimiento(
          cerrado.apertura.unidadesProgramadas,
          cierre.unidadesRealesTotales,
        )}% de cumplimiento`,
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Error al cerrar producción",
        description: err instanceof Error ? err.message : "No se pudo cerrar el registro.",
        variant: "destructive",
      })
      throw err
    } finally {
      finalizarOperacion()
    }
  }

  const todosLosRegistros = [...historial, ...lineasActivas]

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando registros de paradas operativas...
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {guardando && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Guardando cambios...
        </div>
      )}

      <Tabs defaultValue="operacion" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="operacion" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Operación
            {lineasActivas.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {lineasActivas.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operacion" className="mt-8 space-y-8">
          <ActiveLinesSelector
            lineasActivas={lineasActivas}
            seleccionado={vistaOperacion}
            onSeleccionar={setVistaOperacion}
          />

          {vistaOperacion !== "nueva" && registroSeleccionado && (
            <PhaseStepper faseActual={faseActual} lineaAbierta lineaCerrada={false} />
          )}

          {vistaOperacion === "nueva" && (
            <>
              {lineasActivas.length === 0 && (
                <PhaseStepper faseActual={1} lineaAbierta={false} lineaCerrada={false} />
              )}
              <LineOpeningSection
                onSubmit={handleApertura}
                esLineaAdicional={lineasActivas.length > 0}
                lineasPersonalizadas={lineasPersonalizadas}
                onEliminarLineaPersonalizada={handleEliminarLineaPersonalizada}
                disabled={guardando}
              />
            </>
          )}

          {registroSeleccionado && (
            <>
              <ActiveSessionHeader
                registro={registroSeleccionado}
                disabled={guardando}
                onEdit={
                  registroSeleccionado.estado === "activo"
                    ? () => setEditandoApertura(true)
                    : undefined
                }
                onDelete={
                  registroSeleccionado.estado === "activo"
                    ? () => handleEliminarLinea(registroSeleccionado.id)
                    : undefined
                }
              />

              {editandoApertura && registroSeleccionado.estado === "activo" && (
                <LineOpeningSection
                  key={`edit-${registroSeleccionado.id}`}
                  modo="editar"
                  aperturaInicial={registroSeleccionado.apertura}
                  lineasPersonalizadas={lineasPersonalizadas}
                  onEliminarLineaPersonalizada={handleEliminarLineaPersonalizada}
                  disabled={guardando}
                  onSubmit={(apertura) =>
                    handleActualizarApertura(registroSeleccionado.id, apertura)
                  }
                  onCancel={() => setEditandoApertura(false)}
                />
              )}

              <StopEntrySection
                paradas={registroSeleccionado.paradas ?? []}
                disabled={registroSeleccionado.estado === "cerrado" || guardando}
                onAdd={(parada) => handleAgregarParada(registroSeleccionado.id, parada)}
                onUpdate={(paradaId, parada) =>
                  handleActualizarParada(registroSeleccionado.id, paradaId, parada)
                }
                onRemove={(paradaId) =>
                  handleEliminarParada(registroSeleccionado.id, paradaId)
                }
              />

              {registroSeleccionado.estado === "activo" && (
                <LineClosureSection
                  paradas={registroSeleccionado.paradas ?? []}
                  unidadesProgramadas={registroSeleccionado.apertura.unidadesProgramadas}
                  disabled={guardando}
                  onClose={(cierre) => handleCierre(registroSeleccionado.id, cierre)}
                />
              )}
            </>
          )}

          <ClosedLinesHistory historial={historial} />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-8">
          <SectionErrorBoundary title="Error en el dashboard de paradas">
            <ParadasDashboard
              registros={todosLosRegistros}
              lineasPersonalizadas={lineasPersonalizadas}
              onEliminarLineaPersonalizada={handleEliminarLineaPersonalizada}
            />
          </SectionErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  )
}
