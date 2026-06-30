"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

// Tipo compatible con StoredEquipment de useEquipos y UiStoredEquipment
export interface EquipmentDetail {
  id: string
  codigo: string
  version?: string | null
  fechaImplementacion?: string | null
  nombre: string
  marca?: string | null
  modelo?: string | null
  fabricante?: string | null
  fechaAdquisicion?: string | null
  imageDataUrl?: string | null
  area?: string | null
  linea?: string | null
  capacidad?: string | null
  amperaje?: string | null
  potencia?: string | null
  voltaje?: string | null
  rpm?: string | null
  magnitudMedida?: string | null
  estado?: "Operativo" | "En mantenimiento" | "Fuera de servicio (chatarrizacion)" | "(backup) desuso" | null
  attachmentsUrl?: string | null
}

interface EquipmentDetailModalProps {
  equipment: EquipmentDetail | null
  isOpen: boolean
  onClose: () => void
  title?: string // Opcional, por defecto usa el nombre del equipo
  showHojaDeVidaButton?: boolean
  isLoading?: boolean // Nueva prop para indicador de carga
}

export function EquipmentDetailModal({
  equipment,
  isOpen,
  onClose,
  title,
  showHojaDeVidaButton = false,
  isLoading = false, // Valor por defecto
}: EquipmentDetailModalProps) {
  const router = useRouter()
  const [previewOpen, setPreviewOpen] = React.useState(false)

  // Si está cargando, mostrar skeleton loader
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <div className="h-7 w-64 bg-gray-200 rounded animate-pulse"></div>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            {/* Skeleton para la imagen */}
            <div className="md:col-span-1 flex flex-col items-center justify-center space-y-4">
              <div className="h-40 w-40 rounded-md border bg-gray-200 animate-pulse"></div>
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>

            {/* Skeleton para la información */}
            <div className="md:col-span-2 space-y-4">
              {/* Código y ubicación */}
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
              
              {/* Campos de información */}
              <div className="space-y-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  </div>
                ))}
              </div>
              
              {/* Estado skeleton */}
              <div className="flex items-center space-x-2">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
              
              {/* Especificaciones técnicas skeleton */}
              <div className="pt-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3 mb-3"></div>
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Skeleton para botones */}
          <div className="flex justify-end mt-6 pt-4 border-t gap-3">
            {showHojaDeVidaButton && (
              <div className="h-9 w-32 bg-gray-200 rounded animate-pulse"></div>
            )}
            <div className="h-9 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Si no hay equipo y no está cargando
  if (!equipment) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-full max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              Cargando Informacion
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-10 space-y-3">
            <p className="text-muted-foreground">No se encontró información del equipo.</p>
            <p className="text-sm text-gray-500">Verifique que el equipo exista en el sistema.</p>
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const displayTitle = title || equipment.nombre

  const handleNavigate = () => {
    if (equipment) {
      router.push(`/dashboard/equipos/${encodeURIComponent(equipment.codigo)}?view=hoja-vida`)
      onClose() // Cierra el modal después de navegar
    }
  }

  const handleNavigateToAttachments = () => {
    if (equipment) {
      router.push(`/dashboard/equipos/${encodeURIComponent(equipment.codigo)}?view=anexos`)
      onClose()
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{displayTitle}</span>
              {equipment.estado === "En mantenimiento" && (
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                  En mantenimiento
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="md:col-span-1 flex flex-col items-center space-y-4">
              <div
                className="h-48 w-48 overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:opacity-90 transition-all duration-200 hover:border-primary/30"
                onClick={() => {
                  if (equipment.imageDataUrl) setPreviewOpen(true)
                }}
              >
                {equipment.imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={equipment.imageDataUrl}
                    alt={equipment.nombre}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center p-4 text-center">
                    <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center mb-2">
                      <span className="text-2xl text-gray-400">📷</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Sin imagen disponible</span>
                    <span className="text-xs text-gray-400 mt-1">Click para cargar imagen</span>
                  </div>
                )}
              </div>
              <div className="text-center">
                <span className="text-xs text-muted-foreground px-3 py-1 bg-gray-50 rounded-full">
                  {equipment.codigo}
                  {equipment.area ? ` • ${equipment.area}` : ""}
                  {equipment.linea ? ` • ${equipment.linea}` : ""}
                </span>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="font-medium min-w-28">Código:</span>
                    <span className="text-gray-700">{equipment.codigo}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium min-w-28">Versión:</span>
                    <span className="text-gray-700">{equipment.version || "-"}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium min-w-28">Fecha implementación:</span>
                    <span className="text-gray-700">
                      {equipment.fechaImplementacion
                        ? new Date(equipment.fechaImplementacion).toLocaleDateString('es-ES')
                        : "-"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium min-w-28">Fecha adquisición:</span>
                    <span className="text-gray-700">
                      {equipment.fechaAdquisicion
                        ? new Date(equipment.fechaAdquisicion).toLocaleDateString('es-ES')
                        : "-"}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="font-medium min-w-28">Estado:</span>
                    <span>
                      {(() => {
                        const estado = equipment.estado || "Operativo"
                        let classes = "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium "
                        if (estado === "Operativo")
                          classes += "bg-green-100 text-green-800 border border-green-200"
                        else if (estado === "En mantenimiento")
                          classes += "bg-yellow-100 text-yellow-800 border border-yellow-200"
                        else 
                          classes += "bg-red-100 text-red-800 border border-red-200"
                        return <span className={classes}>{estado}</span>
                      })()}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium min-w-28">Marca:</span>
                    <span className="text-gray-700">{equipment.marca || "-"}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium min-w-28">Modelo:</span>
                    <span className="text-gray-700">{equipment.modelo || "-"}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium min-w-28">Fabricante:</span>
                    <span className="text-gray-700">{equipment.fabricante || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Área y línea */}
              {(equipment.area || equipment.linea) && (
                <div className="pt-2 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {equipment.area && (
                      <div className="flex items-start">
                        <span className="font-medium min-w-28">Área:</span>
                        <span className="text-gray-700">{equipment.area}</span>
                      </div>
                    )}
                    {equipment.linea && (
                      <div className="flex items-start">
                        <span className="font-medium min-w-28">Línea:</span>
                        <span className="text-gray-700">{equipment.linea}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Especificaciones técnicas */}
              <div className="pt-4 border-t">
                <h4 className="font-medium text-gray-900 mb-3 pb-2 border-b">Especificaciones técnicas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipment.capacidad && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Capacidad</div>
                      <div className="font-medium">{equipment.capacidad}</div>
                    </div>
                  )}
                  {equipment.amperaje && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Amperaje</div>
                      <div className="font-medium">{equipment.amperaje}</div>
                    </div>
                  )}
                  {equipment.potencia && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Potencia</div>
                      <div className="font-medium">{equipment.potencia}</div>
                    </div>
                  )}
                  {equipment.voltaje && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Voltaje</div>
                      <div className="font-medium">{equipment.voltaje}</div>
                    </div>
                  )}
                  {equipment.rpm && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">RPM</div>
                      <div className="font-medium">{equipment.rpm}</div>
                    </div>
                  )}
                  {equipment.magnitudMedida && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Magnitud medida</div>
                      <div className="font-medium">{equipment.magnitudMedida}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ficha técnica */}
              {equipment.attachmentsUrl && (
                <div className="pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleNavigateToAttachments}
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    <span>Ver anexos del equipo</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t gap-3">
            {showHojaDeVidaButton && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleNavigate}
                className="gap-2"
              >
                <span></span>
                Ver Hoja de Vida
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para vista previa ampliada de la imagen */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Vista previa de imagen</span>
              <span className="text-sm font-normal text-gray-500">• {equipment.nombre}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center bg-gray-50 rounded-lg p-4">
            {equipment.imageDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={equipment.imageDataUrl}
                alt={equipment.nombre}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-md"
              />
            )}
          </div>
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-500">
              Código: {equipment.codigo}
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setPreviewOpen(false)}
            >
              Cerrar vista previa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
