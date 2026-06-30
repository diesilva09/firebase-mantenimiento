"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Search, RefreshCw, Eye, ClipboardList, Trash2, FilePlus2, Download, FileSpreadsheet, FileText, File } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/firebase/auth/use-user"
import { useUserRole } from "@/context/user-role-context"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { MultiFileViewer } from "@/components/multi-file-viewer"
import { useLiveRefresh } from "@/hooks/use-live-refresh"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { exportToExcel, exportToPDF, exportToWord } from "@/lib/export-utils"

type MaintenanceRequestStatus = "pendiente" | "completado"

interface MaintenanceRequest {
  id: number
  nombre_solicitante: string
  area_equipo: string
  fecha_solicitud: string
  departamento_solicitante: string
  otro_departamento: string | null
  descripcion_solicitud: string
  adjuntos: string | null
  estado: MaintenanceRequestStatus
  orden_id: number | null
  created_at: string
}

interface LinkedMaintenanceOrder {
  id: number
  numero_orden: string | null
  codigo_equipo: string | null
  equipo_nombre?: string | null
  zona: string | null
  referencia_otro: string | null
  tipo_destino: "equipo" | "locativo" | "otro"
  tipo_mantenimiento: string
  fecha_solicitud: string
  responsable: string | null
  descripcion_falla: string
  repuestos_utilizados: string | null
  prioridad: string | null
  estado: string | null
  hora_inicio: string | null
  hora_fin: string | null
  observaciones: string | null
  imagen_antes_url: string | null
  imagen_despues_url: string | null
  anexo_url: string | null
}

function sortRequests(items: MaintenanceRequest[]) {
  return [...items].sort((a, b) => {
    if (a.estado !== b.estado) {
      return a.estado === "pendiente" ? -1 : 1
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

function formatDisplayDate(value: string | null | undefined) {
  if (!value) return "-"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return format(parsed, "dd/MM/yyyy", { locale: es })
}

export function MaintenanceRequestsView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user } = useUser()
  const { userRole, roleLoading } = useUserRole()
  const [requests, setRequests] = React.useState<MaintenanceRequest[]>([])
  const [filter, setFilter] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [selectedRequest, setSelectedRequest] = React.useState<MaintenanceRequest | null>(null)
  const selectedRequestId = searchParams.get("selectedRequestId")
  const [deletingRequestId, setDeletingRequestId] = React.useState<number | null>(null)
  const [destinationDialogOpen, setDestinationDialogOpen] = React.useState(false)
  const [requestToRoute, setRequestToRoute] = React.useState<MaintenanceRequest | null>(null)
  const [linkedOrder, setLinkedOrder] = React.useState<LinkedMaintenanceOrder | null>(null)
  const [loadingLinkedOrder, setLoadingLinkedOrder] = React.useState(false)

  const loadRequests = React.useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true)
      }

      const response = await fetch("/api/solicitudes-mantenimiento", {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("No se pudieron cargar las solicitudes.")
      }

      const result = await response.json()
      setRequests(sortRequests(result.data || []))
    } catch (error) {
      console.error("Error loading maintenance requests:", error)
      setRequests([])
    } finally {
      if (!options?.silent) {
        setLoading(false)
      }
    }
  }, [])

  React.useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  useLiveRefresh({
    callback: () => loadRequests({ silent: true }),
    scopes: ["maintenance-requests"],
    intervalMs: 20000,
    immediate: false,
  })

  React.useEffect(() => {
    if (!selectedRequestId || requests.length === 0) return

    const requestId = Number(selectedRequestId)
    if (!requestId || Number.isNaN(requestId)) return

    const request = requests.find((item) => item.id === requestId)
    if (!request) return

    setSelectedRequest(request)

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      params.delete("selectedRequestId")
      const newUrl = params.toString() ? `/dashboard/forms?${params.toString()}` : "/dashboard/forms"
      window.history.replaceState(null, "", newUrl)
    }
  }, [selectedRequestId, requests])

  React.useEffect(() => {
    if (!selectedRequest) return

    const updatedRequest = requests.find((item) => item.id === selectedRequest.id) ?? null

    if (!updatedRequest) {
      setSelectedRequest(null)
      return
    }

    if (updatedRequest !== selectedRequest) {
      setSelectedRequest(updatedRequest)
    }
  }, [requests, selectedRequest])

  React.useEffect(() => {
    const orderId = selectedRequest?.orden_id

    if (!selectedRequest || !orderId) {
      setLinkedOrder(null)
      setLoadingLinkedOrder(false)
      return
    }

    let cancelled = false

    const loadLinkedOrder = async () => {
      try {
        setLoadingLinkedOrder(true)
        const response = await fetch(`/api/ordenes-mantenimiento?id=${orderId}`, {
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error("No se pudo cargar la orden relacionada.")
        }

        const result = await response.json()
        const order = Array.isArray(result.data) ? result.data[0] ?? null : null

        if (!cancelled) {
          setLinkedOrder(order)
        }
      } catch (error) {
        console.error("Error loading linked maintenance order:", error)
        if (!cancelled) {
          setLinkedOrder(null)
        }
      } finally {
        if (!cancelled) {
          setLoadingLinkedOrder(false)
        }
      }
    }

    loadLinkedOrder()

    return () => {
      cancelled = true
    }
  }, [selectedRequest])

  useLiveRefresh({
    callback: async () => {
      if (!selectedRequest?.orden_id) return

      try {
        const response = await fetch(`/api/ordenes-mantenimiento?id=${selectedRequest.orden_id}`, {
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error("No se pudo cargar la orden relacionada.")
        }

        const result = await response.json()
        const order = Array.isArray(result.data) ? result.data[0] ?? null : null
        setLinkedOrder(order)
      } catch (error) {
        console.error("Error refreshing linked maintenance order:", error)
      }
    },
    scopes: ["maintenance-requests", "maintenance-orders"],
    intervalMs: 20000,
    enabled: Boolean(selectedRequest?.orden_id),
    immediate: false,
  })

  const filteredRequests = requests.filter((request) => {
    const search = filter.toLowerCase()
    const departamento = request.departamento_solicitante === "Otro"
      ? request.otro_departamento || "Otro"
      : request.departamento_solicitante

    return (
      request.nombre_solicitante.toLowerCase().includes(search) ||
      request.area_equipo.toLowerCase().includes(search) ||
      departamento.toLowerCase().includes(search) ||
      request.descripcion_solicitud.toLowerCase().includes(search) ||
      request.estado.toLowerCase().includes(search)
    )
  })

  const getDepartamentoLabel = (request: MaintenanceRequest) => {
    if (request.departamento_solicitante === "Otro") {
      return request.otro_departamento || "Otro"
    }

    return request.departamento_solicitante
  }

  const countAttachments = (adjuntos: string | null) => {
    if (!adjuntos) return 0
    return adjuntos
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean).length
  }

  const getStatusLabel = (status: MaintenanceRequestStatus) =>
    status === "completado" ? "Completado" : "Pendiente"

  const getStatusBadgeClass = (status: MaintenanceRequestStatus) =>
    status === "completado"
      ? "border-green-200 bg-green-100 text-green-700 hover:bg-green-100"
      : "border-red-200 bg-red-100 text-red-700 hover:bg-red-100"

  const getOrderReference = (order: LinkedMaintenanceOrder) => {
    if (order.tipo_destino === "equipo") {
      return order.codigo_equipo || order.equipo_nombre || "-"
    }

    if (order.tipo_destino === "locativo") {
      return order.zona || "-"
    }

    return order.referencia_otro || "-"
  }

  const handleBulkExport = async (exportFormat: "excel" | "pdf" | "word") => {
    if (filteredRequests.length === 0) {
      toast({
        title: "Sin datos para exportar",
        description: "No hay solicitudes para exportar con el filtro actual.",
        variant: "warning",
      })
      return
    }

    const dataToExport = filteredRequests.map((request) => ({
      Solicitante: request.nombre_solicitante,
      "Area / equipo": request.area_equipo,
      "Fecha solicitud": request.fecha_solicitud
        ? format(new Date(request.fecha_solicitud), "dd/MM/yyyy", { locale: es })
        : "-",
      Departamento: getDepartamentoLabel(request),
      Descripcion: request.descripcion_solicitud,
      Estado: getStatusLabel(request.estado),
      Adjuntos: countAttachments(request.adjuntos),
      "Fecha registro": request.created_at
        ? format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: es })
        : "-",
    }))

    const columns = Object.keys(dataToExport[0] || {})
    const fileName = `Solicitudes_Mantenimiento_${new Date().toISOString().split("T")[0]}`

    if (exportFormat === "excel") {
      await exportToExcel(dataToExport, fileName)
      return
    }

    if (exportFormat === "pdf") {
      await exportToPDF(dataToExport, columns, "Solicitudes de Mantenimiento", fileName)
      return
    }

    await exportToWord(dataToExport, columns, "Solicitudes de Mantenimiento", fileName)
  }

  async function deleteRequest(requestId: number) {
    try {
      setDeletingRequestId(requestId)

      const response = await fetch(`/api/solicitudes-mantenimiento?id=${requestId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorEmail: user?.email || null,
          actorUid: user?.uid || null,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok || result.success === false) {
        throw new Error(result.error || "No se pudo eliminar la solicitud.")
      }

      setRequests((prev) => prev.filter((r) => r.id !== requestId))
      setSelectedRequest((prev) => (prev?.id === requestId ? null : prev))

      toast({
        title: "Solicitud eliminada",
        description: "Se eliminó la solicitud correctamente.",
        variant: "success",
      })
    } catch (e: any) {
      console.error("Error deleting maintenance request:", e)
      toast({
        title: "Error al eliminar",
        description: e?.message || "No se pudo eliminar la solicitud.",
        variant: "destructive",
      })
    } finally {
      setDeletingRequestId(null)
    }
  }

  function openDestinationSelector(request: MaintenanceRequest) {
    setRequestToRoute(request)
    setDestinationDialogOpen(true)
  }

  function routeToOrderForm(target: "equipo" | "locativo" | "otro") {
    if (!requestToRoute) return

    const params = new URLSearchParams({
      target,
      sourceRequestId: String(requestToRoute.id),
    })

    router.push(`/dashboard/forms/orden-mantenimiento?${params.toString()}`)
    setDestinationDialogOpen(false)
    setRequestToRoute(null)
    setSelectedRequest(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <div className="text-lg">Cargando solicitudes...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de Mantenimiento</CardTitle>
          <CardDescription>
            Consulta las solicitudes registradas desde el formulario de mantenimiento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por solicitante, area, departamento o descripcion..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-8"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Exportar Lista</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void handleBulkExport("excel")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleBulkExport("pdf")}>
                  <FileText className="mr-2 h-4 w-4 text-red-600" /> PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleBulkExport("word")}>
                  <File className="mr-2 h-4 w-4 text-blue-600" /> Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => void loadRequests()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitante</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">Departamento</TableHead>
                  <TableHead className="hidden xl:table-cell">Area y/o equipo</TableHead>
                  <TableHead>Adjuntos</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        <div>{request.nombre_solicitante}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 md:hidden">
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(request.fecha_solicitud), "dd/MM/yyyy", { locale: es })}
                          </span>
                          <Badge className={getStatusBadgeClass(request.estado)}>
                            {getStatusLabel(request.estado)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {format(new Date(request.fecha_solicitud), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge className={getStatusBadgeClass(request.estado)}>
                          {getStatusLabel(request.estado)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="secondary">{getDepartamentoLabel(request)}</Badge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell max-w-xs truncate">
                        {request.area_equipo}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{countAttachments(request.adjuntos)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedRequest(request)}
                          aria-label="Ver solicitud"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-28 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ClipboardList className="h-5 w-5" />
                        <span>No hay solicitudes registradas.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalle de la Solicitud</DialogTitle>
              <DialogDescription>
                Solicitud registrada el{" "}
                {format(new Date(selectedRequest.fecha_solicitud), "PPP", { locale: es })}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Nombre de quien solicita</p>
                <p className="text-sm break-words [overflow-wrap:anywhere]">{selectedRequest.nombre_solicitante}</p>
              </div>

              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Estado</p>
                <Badge className={getStatusBadgeClass(selectedRequest.estado)}>
                  {getStatusLabel(selectedRequest.estado)}
                </Badge>
              </div>

              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Departamento solicitante</p>
                <p className="text-sm break-words [overflow-wrap:anywhere]">{getDepartamentoLabel(selectedRequest)}</p>
              </div>

              <div className="min-w-0 space-y-1 sm:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Area y/o equipo</p>
                <p className="text-sm break-words [overflow-wrap:anywhere]">{selectedRequest.area_equipo}</p>
              </div>

              <div className="min-w-0 space-y-1 sm:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Descripcion breve de la solicitud</p>
                <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {selectedRequest.descripcion_solicitud}
                </p>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <MultiFileViewer
                  urls={selectedRequest.adjuntos}
                  label="Adjuntos"
                  variant="orange"
                  isImage={false}
                />
              </div>

              {selectedRequest.orden_id && (
                <div className="space-y-3 sm:col-span-2 rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">Orden realizada</p>
                    <p className="text-xs text-muted-foreground">
                      Informacion de la orden generada a partir de esta solicitud.
                    </p>
                  </div>

                  {loadingLinkedOrder ? (
                    <p className="text-sm text-muted-foreground">Cargando detalles de la orden...</p>
                  ) : linkedOrder ? (
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Destino</p>
                        <p className="text-sm capitalize">{linkedOrder.tipo_destino}</p>
                      </div>

                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Referencia</p>
                        <p className="text-sm break-words [overflow-wrap:anywhere]">{getOrderReference(linkedOrder)}</p>
                      </div>

                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Tipo de mantenimiento</p>
                        <p className="text-sm break-words [overflow-wrap:anywhere]">{linkedOrder.tipo_mantenimiento}</p>
                      </div>

                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Estado de la orden</p>
                        <p className="text-sm capitalize">{linkedOrder.estado || "-"}</p>
                      </div>

                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Responsable</p>
                        <p className="text-sm break-words [overflow-wrap:anywhere]">{linkedOrder.responsable || "-"}</p>
                      </div>

                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Fecha de ejecucion</p>
                        <p className="text-sm break-words [overflow-wrap:anywhere]">{formatDisplayDate(linkedOrder.fecha_solicitud)}</p>
                      </div>

                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Hora inicio</p>
                        <p className="text-sm">{linkedOrder.hora_inicio || "-"}</p>
                      </div>

                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Hora fin</p>
                        <p className="text-sm">{linkedOrder.hora_fin || "-"}</p>
                      </div>

                      <div className="min-w-0 space-y-1 sm:col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Descripcion del trabajo realizado</p>
                        <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          {linkedOrder.descripcion_falla}
                        </p>
                      </div>

                      <div className="min-w-0 space-y-1 sm:col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Repuestos utilizados</p>
                        <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          {linkedOrder.repuestos_utilizados || "-"}
                        </p>
                      </div>

                      <div className="min-w-0 space-y-1 sm:col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Observaciones / recomendaciones</p>
                        <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          {linkedOrder.observaciones || "-"}
                        </p>
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <MultiFileViewer
                          urls={linkedOrder.imagen_antes_url}
                          label="Fotos Antes"
                          variant="blue"
                          isImage
                        />
                        <MultiFileViewer
                          urls={linkedOrder.imagen_despues_url}
                          label="Fotos Después"
                          variant="green"
                          isImage
                        />
                        <MultiFileViewer
                          urls={linkedOrder.anexo_url}
                          label="Archivos Anexos"
                          variant="orange"
                          isImage={false}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No se pudo cargar la orden vinculada.</p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              {!roleLoading && userRole?.role === "JEFE" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={deletingRequestId === selectedRequest.id}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingRequestId === selectedRequest.id ? "Eliminando..." : "Eliminar"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminar solicitud</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¿Eliminar esta solicitud? Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteRequest(selectedRequest.id)}>
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {!roleLoading && (userRole?.role === "JEFE" || userRole?.role === "TECNICO") && selectedRequest.estado === "pendiente" && (
                <Button
                  onClick={() => openDestinationSelector(selectedRequest)}
                  disabled={!user?.uid}
                  className="gap-2"
                >
                  <FilePlus2 className="h-4 w-4" />
                  Crear orden
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={destinationDialogOpen}
        onOpenChange={(open) => {
          setDestinationDialogOpen(open)
          if (!open) setRequestToRoute(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecciona el tipo de orden</DialogTitle>
            <DialogDescription>
              Elige si esta solicitud se convertirá en una orden para equipo, locativo u otro.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Button onClick={() => routeToOrderForm("equipo")} className="justify-start">
              Equipo
            </Button>
            <Button onClick={() => routeToOrderForm("locativo")} className="justify-start" variant="outline">
              Locativo
            </Button>
            <Button onClick={() => routeToOrderForm("otro")} className="justify-start" variant="secondary">
              Otro
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
