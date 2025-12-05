"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useEquipos } from "@/hooks/use-equipos"
import type { Task } from "@/lib/types"

interface EquipmentInfoDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  task: Task | null
}

export function EquipmentInfoDialog({ isOpen, setIsOpen, task }: EquipmentInfoDialogProps) {
  const { equipos, loading } = useEquipos()

  const equipment = task
    ? equipos.find((e) => e.codigo === task.code)
    : null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {equipment ? `Equipo: ${equipment.nombre}` : task ? `Equipo ${task.code}` : "Equipo"}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="py-4 text-sm text-muted-foreground">
            Cargando información del equipo...
          </div>
        )}

        {!loading && !equipment && (
          <div className="py-4 text-sm text-muted-foreground">
            No se encontró información para el equipo con código {task?.code}.
          </div>
        )}

        {!loading && equipment && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="md:col-span-1 flex items-center justify-center">
              <div className="h-40 w-40 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
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

            <div className="md:col-span-2 space-y-1">
              <div>
                <span className="font-medium">Código:</span> {equipment.codigo}
              </div>
              <div>
                <span className="font-medium">Nombre:</span> {equipment.nombre}
              </div>
              <div>
                <span className="font-medium">Área:</span> {equipment.area}
              </div>
              {equipment.linea && (
                <div>
                  <span className="font-medium">Línea:</span> {equipment.linea}
                </div>
              )}
              <div>
                <span className="font-medium">Marca:</span> {equipment.marca || "-"}
              </div>
              <div>
                <span className="font-medium">Modelo:</span> {equipment.modelo || "-"}
              </div>
              <div>
                <span className="font-medium">Fabricante:</span> {equipment.fabricante || "-"}
              </div>
              <div>
                <span className="font-medium">Fecha de implementación:</span>{" "}
                {equipment.fechaImplementacion || "-"}
              </div>
              <div>
                <span className="font-medium">Fecha de adquisición:</span>{" "}
                {equipment.fechaAdquisicion || "-"}
              </div>

              <div className="mt-3 font-medium">Especificaciones técnicas</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div>Capacidad: {equipment.capacidad || "-"}</div>
                <div>Amperaje: {equipment.amperaje || "-"}</div>
                <div>Potencia: {equipment.potencia || "-"}</div>
                <div>Voltaje: {equipment.voltaje || "-"}</div>
                <div>RPM: {equipment.rpm || "-"}</div>
                <div>Magnitud medida: {equipment.magnitudMedida || "-"}</div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
