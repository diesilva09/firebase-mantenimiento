"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { Task } from "@/lib/types"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Image from "next/image"
import { Edit } from "lucide-react"

interface TaskDetailsDialogProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  task: Task
  isAdmin?: boolean
  onOpenComplete: (task: Task) => void
  onOpenEdit: (task: Task) => void
  onOpenSpecs: (task: Task) => void
}

const statusBadgeStyles: Record<Task['status'], string> = {
    Completada: "bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-200",
    Pendiente: "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-200",
    Futura: "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200",
}

const priorityBadgeStyles: Record<Task['priority'], string> = {
    Alta: "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-200",
    Media: "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-200",
    Baja: "bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-200",
}

export function TaskDetailsDialog({ 
  isOpen, 
  setIsOpen, 
  task, 
  isAdmin = false,
  onOpenComplete, 
  onOpenEdit, 
  onOpenSpecs 
}: TaskDetailsDialogProps) {
  const [enlargedImage, setEnlargedImage] = useState<{ src: string; label: string } | null>(null)
  const executedName = task.executedBy?.name || ""
  const isExternal = executedName.startsWith("Personal Externo - ")
  const externalDisplayName = isExternal ? executedName.replace("Personal Externo - ", "").trim() : executedName
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de Tarea: {task.code}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap break-all text-sm text-muted-foreground">
            {task.description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 text-sm px-1">
            <div className="flex justify-between">
                <span className="text-muted-foreground">Área/Equipo:</span>
                <span className="font-medium">{task.area}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant="outline" className={statusBadgeStyles[task.status]}>
                  {task.status === 'Futura' ? 'Próxima' : task.status}
                </Badge>
            </div>
            <div className="flex justify-between">
                <span className="text-muted-foreground">Prioridad:</span>
                <Badge variant="outline" className={priorityBadgeStyles[task.priority]}>
                  {task.priority}
                </Badge>
            </div>
            <div className="flex justify-between">
                <span className="text-muted-foreground">Responsable:</span>
                <span className="font-medium">{task.assignedTo.name}</span>
            </div>
            {task.executedBy && (
              <div className="flex justify-between">
                   <span className="text-muted-foreground">Ejecutado por:</span>
                   <span className="font-medium">
                     {isExternal ? (
                       <>Personal Externo ({externalDisplayName})</>
                     ) : (
                       executedName
                     )}
                   </span>
               </div>
           )}
            <div className="flex justify-between">
                <span className="text-muted-foreground">Próx. Ejecución:</span>
                <span className="font-medium">{format(new Date(task.nextExecution), "PPP", { locale: es })}</span>
            </div>
             {task.status === 'Completada' && task.completionDate && (
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha Completada:</span>
                    <span className="font-medium">{format(new Date(task.completionDate), "PPP", { locale: es })}</span>
                </div>
            )}
            {task.status === 'Completada' && task.workDone && (
              <div className="space-y-1">
                <span className="text-muted-foreground">Trabajo Realizado:</span>
                <p className="font-medium bg-muted/50 p-2 rounded-md whitespace-pre-wrap break-all">
                  {task.workDone}
                </p>
              </div>
            )}
            {task.status === 'Completada' && (task as any).maintenanceType && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo Mantenimiento:</span>
                <span className="font-medium">{(task as any).maintenanceType}</span>
              </div>
            )}
            {task.status === 'Completada' && (task as any).sparesUsed && (
              <div className="space-y-1">
                <span className="text-muted-foreground">Repuestos Usados:</span>
                <p className="font-medium bg-muted/50 p-2 rounded-md whitespace-pre-wrap break-all">
                  {(task as any).sparesUsed}
                </p>
              </div>
            )}
            {task.status === 'Completada' && (task as any).observations && (
              <div className="space-y-1">
                <span className="text-muted-foreground">Observaciones:</span>
                <p className="font-medium bg-muted/50 p-2 rounded-md whitespace-pre-wrap break-all">
                  {(task as any).observations}
                </p>
              </div>
            )}

            {(task.imageUrlBefore || task.imageUrlAfter) && (
              <div className="space-y-2">
                 <span className="text-muted-foreground">Evidencia Fotográfica:</span>
                 <div className="grid grid-cols-2 gap-4">
                   {task.imageUrlBefore && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-center">Antes</h4>
                      <button
                        type="button"
                        className="mx-auto block focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
                        onClick={() => setEnlargedImage({ src: task.imageUrlBefore!, label: "Antes" })}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={task.imageUrlBefore}
                          alt="Antes"
                          className="h-40 w-40 rounded-md object-cover border bg-muted"
                        />
                      </button>
                    </div>
                  )}
                  {task.imageUrlAfter && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-center">Después</h4>
                      <button
                        type="button"
                        className="mx-auto block focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
                        onClick={() => setEnlargedImage({ src: task.imageUrlAfter!, label: "Después" })}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={task.imageUrlAfter}
                          alt="Después"
                          className="h-40 w-40 rounded-md object-cover border bg-muted"
                        />
                      </button>
                    </div>
                  )}
                 </div>
              </div>
            )}

        </div>
        {enlargedImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="relative max-w-3xl max-h-[90vh] bg-background rounded-md p-3 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Imagen {enlargedImage.label}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEnlargedImage(null)}
                >
                  Cerrar
                </Button>
              </div>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={enlargedImage.src}
                  alt={enlargedImage.label}
                  className="max-h-[70vh] max-w-full rounded-md object-contain border bg-muted"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-start gap-2">
          {task.status !== 'Completada' && (
            <Button type="button" onClick={() => { setIsOpen(false); onOpenComplete(task); }}>
              Completar Tarea
            </Button>
          )}
          {isAdmin && task.status !== 'Completada' && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => { setIsOpen(false); onOpenEdit(task); }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          {task.equipmentSpecs && (
            <Button type="button" variant="secondary" onClick={() => { setIsOpen(false); onOpenSpecs(task); }}>
              Ficha Técnica
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}