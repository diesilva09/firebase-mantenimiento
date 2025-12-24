"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  estado?: "Operativo" | "En mantenimiento" | "Fuera de servicio" | null
  attachmentsUrl?: string | null
}

interface EquipmentDetailModalProps {
  equipment: EquipmentDetail | null
  isOpen: boolean
  onClose: () => void
  title?: string // Opcional, por defecto usa el nombre del equipo
}

export function EquipmentDetailModal({
  equipment,
  isOpen,
  onClose,
  title,
}: EquipmentDetailModalProps) {
  const [previewOpen, setPreviewOpen] = React.useState(false)

  if (!equipment) return null

  const displayTitle = title || equipment.nombre

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{displayTitle}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="md:col-span-1 flex items-center justify-center">
              <div
                className="h-40 w-40 overflow-hidden rounded-md border bg-muted flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => {
                  if (equipment.imageDataUrl) setPreviewOpen(true)
                }}
              >
                {equipment.imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={equipment.imageDataUrl}
                    alt={equipment.nombre}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">Sin imagen</span>
                )}
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <div>
                <span className="text-xs text-muted-foreground">
                  {equipment.codigo}
                  {equipment.area ? ` • ${equipment.area}` : ""}
                  {equipment.linea ? ` • ${equipment.linea}` : ""}
                </span>
              </div>

              <div>
                <span className="font-medium">Código:</span> {equipment.codigo}
              </div>

              <div>
                <span className="font-medium">Versión:</span> {equipment.version || "-"}
              </div>

              <div>
                <span className="font-medium">Fecha de implementación:</span>{" "}
                {equipment.fechaImplementacion
                  ? equipment.fechaImplementacion.slice(0, 10)
                  : "-"}
              </div>

              <div>
                <span className="font-medium">Fecha de adquisición:</span>{" "}
                {equipment.fechaAdquisicion
                  ? equipment.fechaAdquisicion.slice(0, 10)
                  : "-"}
              </div>

              <div>
                <span className="font-medium">Estado:</span>{" "}
                {(() => {
                  const estado = equipment.estado || "Operativo"
                  let classes =
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ml-1 "
                  if (estado === "Operativo")
                    classes += "bg-green-100 text-green-800"
                  else if (estado === "En mantenimiento")
                    classes += "bg-yellow-100 text-yellow-800"
                  else classes += "bg-red-100 text-red-800"
                  return <span className={classes}>{estado}</span>
                })()}
              </div>

              <div>
                <span className="font-medium">Marca:</span> {equipment.marca || "-"}
              </div>

              <div>
                <span className="font-medium">Modelo:</span> {equipment.modelo || "-"}
              </div>

              <div>
                <span className="font-medium">Fabricante:</span>{" "}
                {equipment.fabricante || "-"}
              </div>

              {equipment.area && (
                <div>
                  <span className="font-medium">Área:</span> {equipment.area}
                </div>
              )}

              {equipment.linea && (
                <div>
                  <span className="font-medium">Línea:</span> {equipment.linea}
                </div>
              )}

              <div className="mt-2 font-medium">Especificaciones técnicas</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div>Capacidad: {equipment.capacidad || "-"}</div>
                <div>Amperaje: {equipment.amperaje || "-"}</div>
                <div>Potencia: {equipment.potencia || "-"}</div>
                <div>Voltaje: {equipment.voltaje || "-"}</div>
                <div>RPM: {equipment.rpm || "-"}</div>
                <div>Magnitud medida: {equipment.magnitudMedida || "-"}</div>
              </div>

              {equipment.attachmentsUrl && (
                <div className="mt-3">
                  <a
                    href={equipment.attachmentsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-700 hover:underline"
                  >
                    Ver ficha técnica (Anexos)
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para vista previa ampliada de la imagen */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vista previa de imagen - {equipment.nombre}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center">
            {equipment.imageDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={equipment.imageDataUrl}
                alt={equipment.nombre}
                className="max-h-[85vh] w-auto object-contain rounded-md"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

