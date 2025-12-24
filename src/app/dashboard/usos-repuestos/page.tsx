"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EquipmentDetailModal } from "@/components/equipment-detail-modal"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useEquipos } from "@/hooks/use-equipos"
import { Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useNotifications } from "@/hooks/use-notifications"
import type { Notification } from "@/lib/types"


interface UsoRepuestoItem {
  id: number
  createdAt: string
  estado: string
  repuestoId: number
  repuestoCodigo: string
  repuestoNombre: string | null
  repuestoDescripcion: string | null
  categoria: string | null
  subcategoria: string | null
  cantidad: number
  maquinaCodigo: string
  maquinaLabel: string
  responsable: string
  descripcionUso: string | null
  completadoPor: string | null
  completadoAt: string | null
}

export default function UsosRepuestosPage() {
  const { toast } = useToast()
  const { addNotification, permission } = useNotifications()

  const [tab, setTab] = useState<"pendiente" | "completado">("pendiente")
  const [usos, setUsos] = useState<UsoRepuestoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [categoriaFilter, setCategoriaFilter] = useState<string>("")
  const [subcategoriaFilter, setSubcategoriaFilter] = useState<string>("")
  const [maquinaFilter, setMaquinaFilter] = useState<string>("")

  const [isAdmin, setIsAdmin] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUso, setSelectedUso] = useState<UsoRepuestoItem | null>(null)
  const { equipos } = useEquipos()
  const [machineDialogOpen, setMachineDialogOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<any | null>(null)
  const [descripcionTmp, setDescripcionTmp] = useState("")
  const [expandedUsoId, setExpandedUsoId] = useState<number | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [usoIdToDelete, setUsoIdToDelete] = useState<number | null>(null)

  // Determinar si el usuario es jefe/admin leyendo la bandera guardada en login
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const flag = localStorage.getItem("isAdmin") === "true"
      setIsAdmin(flag)
    } catch {
      setIsAdmin(false)
    }
  }, [])

  useEffect(() => {
    async function loadUsos() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ estado: tab })
        if (categoriaFilter) params.append("categoria", categoriaFilter)
        if (subcategoriaFilter) params.append("subcategoria", subcategoriaFilter)
        if (maquinaFilter.trim()) params.append("maquina", maquinaFilter.trim())

        const res = await fetch(`/api/uso-repuesto?${params.toString()}`)
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.error || "No se pudieron cargar los usos de repuestos")
        }
        setUsos(Array.isArray(json.data) ? json.data : [])
      } catch (err: any) {
        console.error("Error cargando usos de repuestos", err)
        setError(err?.message || "Error cargando usos de repuestos")
      } finally {
        setLoading(false)
      }
    }

    loadUsos()
  }, [tab, categoriaFilter, subcategoriaFilter, maquinaFilter])

  function openCompletarDialog(u: UsoRepuestoItem) {
    setSelectedUso(u)
    setDescripcionTmp(u.descripcionUso ?? "")
    setDialogOpen(true)
  }

    function openMachineDialog(codigo: string) {
    const eq = equipos.find((e: any) => e.codigo === codigo)
    if (!eq) {
      toast({
        title: "Equipo no encontrado",
        description: "No se encontró un equipo con ese código.",
        variant: "destructive",
      })
      return
    }
    setSelectedMachine(eq)
    setMachineDialogOpen(true)
  }

  function closeMachineDialog() {
    setMachineDialogOpen(false)
    setSelectedMachine(null)
  }

  function closeCompletarDialog() {
    setDialogOpen(false)
    setSelectedUso(null)
    setDescripcionTmp("")
  }

  async function handleCompletarDescripcion() {
    if (!selectedUso) return

    const descripcionLimpia = descripcionTmp.trim()
    if (!descripcionLimpia) {
      toast({
        title: "Descripción requerida",
        description: "Escribe una descripción del uso para marcarlo como completado.",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetch("/api/uso-repuesto", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUso.id,
          descripcionUso: descripcionLimpia,
          completadoPor: "operario",
        }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || "No se pudo completar el uso de repuesto.")
      }

      // Si estamos en pestaña de pendientes, sacar el registro de la lista
      if (tab === "pendiente") {
        setUsos((prev) => prev.filter((u) => u.id !== selectedUso.id))
      } else {
        // Si en el futuro se permite editar completados, actualizamos la descripción local
        setUsos((prev) =>
          prev.map((u) =>
            u.id === selectedUso.id
              ? { ...u, descripcionUso: descripcionLimpia, estado: "completado" }
              : u
          )
        )
      }

      toast({
        title: "Uso marcado como completado",
        description: "Se registró la descripción del uso y el registro pasó a completados.",
      })

      // Crear notificación para la campana
      try {
        const baseNotif = {
          title: `Uso de repuesto completado`,
          message:
            `Repuesto: ${selectedUso.repuestoCodigo}${selectedUso.repuestoNombre ? ` - ${selectedUso.repuestoNombre}` : ""}` +
            `\nMáquina: ${selectedUso.maquinaLabel || selectedUso.maquinaCodigo}` +
            `\nResponsable: ${selectedUso.responsable}`,
          type: "task_alert" as const,
          severity: "info" as const,
          refId: String(selectedUso.id),
          status: "Completada" as const,
        }

        let finalNotif: Notification | null = null

        // Guardar notificación en la BD y usar el id real devuelto
        try {
          const resNotif = await fetch("/api/notificaciones", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              titulo: baseNotif.title,
              mensaje: baseNotif.message,
              tipo: baseNotif.type,
              severidad: baseNotif.severity,
              estado_tarea: baseNotif.status,
              prioridad: null,
              ref_task_id: selectedUso.id ?? null,
            }),
          })

          if (resNotif.ok) {
            const jsonNotif = await resNotif.json()
            const saved = jsonNotif.data
            finalNotif = {
              id: String(saved.id),
              title: baseNotif.title,
              message: baseNotif.message,
              type: baseNotif.type,
              severity: baseNotif.severity,
              createdAt: new Date(saved.creado_en).toISOString(),
              read: false,
              refId: String(saved.ref_task_id ?? baseNotif.refId ?? ""),
              status: baseNotif.status,
            }
          }
        } catch (e) {
          console.warn("No se pudo guardar la notificación de uso completado en BD", e)
        }

        const notif: Notification =
          finalNotif ?? {
            id: `uso-completado-${selectedUso.id}-${Date.now()}`,
            title: baseNotif.title,
            message: baseNotif.message,
            type: baseNotif.type,
            severity: baseNotif.severity,
            createdAt: new Date().toISOString(),
            read: false,
            refId: baseNotif.refId,
            status: baseNotif.status,
          }

        // Actualizar contexto en memoria
        addNotification(notif)

        // Notificación del navegador (si el usuario la permitió)
        if (
          permission === "granted" &&
          typeof window !== "undefined" &&
          "Notification" in window
        ) {
          new Notification(notif.title, {
            body: notif.message,
          })
        }
      } catch (e) {
        console.warn("No se pudo crear la notificación de uso completado", e)
      }

      closeCompletarDialog()
    } catch (err: any) {
      console.error("Error completando uso de repuesto", err)
      toast({
        title: "Error al completar uso",
        description: err?.message || "No se pudo completar el uso de repuesto.",
        variant: "destructive",
      })
    }
  }

  function openDeleteUsoDialog(id: number) {
    if (!isAdmin) return
    setUsoIdToDelete(id)
    setDeleteDialogOpen(true)
  }

  async function confirmDeleteUso() {
    if (!isAdmin || usoIdToDelete == null) return

    try {
      const res = await fetch(`/api/uso-repuesto?id=${usoIdToDelete}`, { method: "DELETE" })
      const json = await res.json().catch(() => ({}))

      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || "No se pudo eliminar el uso de repuesto.")
      }

      setUsos((prev) => prev.filter((u) => u.id !== usoIdToDelete))

      toast({
        title: "Uso eliminado",
        description: "El registro de uso completado se eliminó correctamente.",
      })
    } catch (err: any) {
      console.error("Error eliminando uso de repuesto", err)
      toast({
        title: "Error al eliminar uso",
        description: err?.message || "No se pudo eliminar el uso de repuesto.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setUsoIdToDelete(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usos de repuestos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta y gestiona las solicitudes de uso de repuestos, separadas en pendientes y completadas.
          </p>
        </div>
        <div className="self-start sm:self-auto">
          <Link href="/dashboard/inventario">
            <Button variant="outline" className="text-xs">
              Volver a inventario
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs simples */}
      <div className="mt-6 flex gap-2 border-b pb-2 text-sm">
        <button
          type="button"
          onClick={() => setTab("pendiente")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            tab === "pendiente" ? "bg-red-600 text-white" : "bg-muted text-muted-foreground"
          }`}
        >
          Pendientes
        </button>
        <button
          type="button"
          onClick={() => setTab("completado")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            tab === "completado" ? "bg-red-600 text-white" : "bg-muted text-muted-foreground"
          }`}
        >
          Completados
        </button>
      </div>

      {/* Filtros por categoría, subcategoría y máquina */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs items-end">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-muted-foreground">Categoría</span>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs min-w-[140px]"
            value={categoriaFilter}
            onChange={(e) => {
              setCategoriaFilter(e.target.value)
              setSubcategoriaFilter("")
            }}
          >
            <option value="">Todas</option>
            <option value="Mecanico">Mecánico</option>
            <option value="Electrico">Eléctrico</option>
            <option value="Neumatico">Neumático</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-medium text-muted-foreground">Subcategoría</span>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs min-w-[160px]"
            value={subcategoriaFilter}
            onChange={(e) => setSubcategoriaFilter(e.target.value)}
            disabled={!categoriaFilter}
          >
            <option value="">Todas</option>
            {categoriaFilter === "Mecanico" && (
              <>
                <option value="Rodamientos">Rodamientos</option>
                <option value="Correas">Correas</option>
                <option value="Engranes">Engranes</option>
                <option value="Estructuras">Estructuras</option>
              </>
            )}
            {categoriaFilter === "Neumatico" && (
              <>
                <option value="Válvulas">Válvulas</option>
                <option value="Cilindros">Cilindros</option>
                <option value="Racores">Racores</option>
                <option value="Mangueras">Mangueras</option>
              </>
            )}
            {categoriaFilter === "Electrico" && (
              <>
                <option value="Sensores">Sensores</option>
                <option value="Motores">Motores</option>
                <option value="Contactores">Contactores</option>
                <option value="Interruptores">Interruptores</option>
                <option value="Cableado">Cableado</option>
              </>
            )}
          </select>
        </div>

        <div className="flex flex-col gap-1 min-w-[200px]">
          <span className="font-medium text-muted-foreground">Buscar por máquina</span>
          <Input
            value={maquinaFilter}
            onChange={(e) => setMaquinaFilter(e.target.value)}
            placeholder="Código, área, línea o equipo"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="mt-4 rounded-md border bg-card">
        <div className="border-b px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>
            {tab === "pendiente"
              ? "Usos pendientes de descripción de operario o jefe."
              : "Usos ya completados con descripción registrada."}
          </span>
        </div>

        <div className="px-4 py-3 text-sm">
          {loading && <p className="text-xs text-muted-foreground">Cargando usos...</p>}
          {error && !loading && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full border text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="border px-2 py-1 text-left">Fecha</th>
                    <th className="border px-2 py-1 text-left">Repuesto</th>
                    <th className="border px-2 py-1 text-left">Máquina</th>
                    <th className="border px-2 py-1 text-left">Responsable</th>
                    <th className="border px-2 py-1 text-right">Cantidad</th>
                    <th className="border px-2 py-1 text-center">Ver</th>
                    {tab === "pendiente" && (
                      <th className="border px-2 py-1 text-center">Acciones</th>
                    )}
                    {tab === "completado" && isAdmin && (
                      <th className="border px-2 py-1 text-center">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {usos.length === 0 ? (
                    <tr>
                      <td
                        className="border px-2 py-2 text-center text-[11px]"
                        colSpan={tab === "pendiente" ? 7 : isAdmin ? 7 : 6}
                      >
                        No hay usos {tab === "pendiente" ? "pendientes" : "completados"} para mostrar.
                      </td>
                    </tr>
                  ) : (
                    usos.map((u) => (
                      <React.Fragment key={u.id}>
                        <tr className="align-top">
                          <td className="border px-2 py-1">
                            {new Date(u.createdAt).toLocaleString()}
                          </td>
                          <td className="border px-2 py-1">
                            <div className="font-medium text-xs">
                              {u.repuestoCodigo}
                              {u.repuestoNombre ? ` - ${u.repuestoNombre}` : ""}
                            </div>
                            <div className="text-[11px] text-muted-foreground whitespace-pre-wrap break-all max-h-4 overflow-hidden">
                              {u.repuestoDescripcion ?? "Sin descripción"}
                            </div>
                          </td>
                                                  <td className="border px-2 py-1">
                            <button
                              type="button"
                              className="text-[11px] text-blue-700 hover:underline underline-offset-2 text-left"
                              onClick={() => openMachineDialog(u.maquinaCodigo)}
                              title={u.maquinaLabel || u.maquinaCodigo}
                            >
                              {u.maquinaLabel || u.maquinaCodigo}
                            </button>
                          </td>
                          <td className="border px-2 py-1 text-xs">{u.responsable}</td>
                          <td className="border px-2 py-1 text-right text-xs">{u.cantidad}</td>
                          <td className="border px-2 py-1 text-center">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() =>
                                setExpandedUsoId((prev) => (prev === u.id ? null : u.id))
                              }
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </td>
                          {tab === "pendiente" && (
                            <td className="border px-2 py-1 text-center">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => openCompletarDialog(u)}
                              >
                                Completar descripción
                              </Button>
                            </td>
                          )}
                          {tab === "completado" && isAdmin && (
                            <td className="border px-2 py-1 text-center">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[11px] text-red-600 border-red-300"
                                onClick={() => openDeleteUsoDialog(u.id)}
                              >
                                Eliminar
                              </Button>
                            </td>
                          )}
                        </tr>
                        {expandedUsoId === u.id && (
                          <tr>
                            <td
                              className="border px-2 py-2 text-[11px] text-muted-foreground bg-muted/40 whitespace-pre-wrap break-all"
                              colSpan={tab === "pendiente" ? 7 : isAdmin ? 7 : 6}
                            >
                              <div className="space-y-1">
                                <div>
                                  <span className="font-semibold">Descripción repuesto: </span>
                                  {u.repuestoDescripcion || "Sin descripción"}
                                </div>
                                <div>
                                  <span className="font-semibold">Descripción uso: </span>
                                  {u.descripcionUso || "Sin descripción registrada"}
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                  <span>
                                    <span className="font-semibold">Categoría: </span>
                                    {u.categoria || "-"}
                                  </span>
                                  <span>
                                    <span className="font-semibold">Subcategoría: </span>
                                    {u.subcategoria || "-"}
                                  </span>
                                  {u.completadoAt && (
                                    <span>
                                      <span className="font-semibold">Completado: </span>
                                      {new Date(u.completadoAt).toLocaleString()}
                                    </span>
                                  )}
                                  {u.completadoPor && (
                                    <span>
                                      <span className="font-semibold">Completado por: </span>
                                      {u.completadoPor}
                                    </span>
                                  )}
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
          )}
        </div>
      </div>

      {/* Dialog para completar descripción */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open ? closeCompletarDialog() : setDialogOpen(true)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Completar descripción de uso</DialogTitle>
          </DialogHeader>

          {selectedUso && (
            <div className="space-y-3 text-xs">
              <div>
                <span className="font-medium text-muted-foreground">Repuesto</span>
                <div className="mt-1 rounded-md border bg-muted/40 px-2 py-1">
                  <div className="font-medium">
                    {selectedUso.repuestoCodigo}
                    {selectedUso.repuestoNombre ? ` - ${selectedUso.repuestoNombre}` : ""}
                  </div>
                  <div className="text-[11px] text-muted-foreground whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
                    {selectedUso.repuestoDescripcion ?? "Sin descripción"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="font-medium text-muted-foreground">Cantidad</span>
                  <div className="mt-1 rounded-md border bg-muted/40 px-2 py-1 text-right">
                    {selectedUso.cantidad}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Responsable</span>
                  <div className="mt-1 rounded-md border bg-muted/40 px-2 py-1">
                    {selectedUso.responsable}

                  </div>
                  
                </div>

              </div>
                    
    
              <div>
                <span className="font-medium text-muted-foreground">Máquina</span>
                <div className="mt-1 rounded-md border bg-muted/40 px-2 py-1 text-[11px]">
                  {selectedUso.maquinaLabel}
                </div>
                
              </div>

              <div>
                <span className="font-medium">Descripción del uso</span>
                <Textarea
                  rows={4}
                  className="mt-1 text-xs"
                  value={descripcionTmp}
                  onChange={(e) => setDescripcionTmp(e.target.value)}
                  placeholder="Escribe cómo se utilizó el repuesto en esta intervención."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeCompletarDialog}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCompletarDescripcion}>
              Guardar descripción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para información de la máquina */}
      <EquipmentDetailModal
        equipment={selectedMachine as any}
        isOpen={machineDialogOpen && !!selectedMachine}
        onClose={closeMachineDialog}
        title={selectedMachine ? `Equipo: ${selectedMachine.nombre || selectedMachine.codigo}` : undefined}
      />

      {/* Dialog para confirmar eliminación de uso completado */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialogOpen(false)
          setUsoIdToDelete(null)
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar uso completado</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            ¿Eliminar este registro de uso completado? Esta acción no se puede deshacer.
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDeleteDialogOpen(false)
                setUsoIdToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteUso}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
