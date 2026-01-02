"use client"

import * as React from "react"
import { useEquipos } from "@/hooks/use-equipos"
import type { Task } from "@/lib/types"
import { EquipmentDetailModal } from "@/components/equipment-detail-modal"

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
    <EquipmentDetailModal
      equipment={equipment as any}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title={equipment ? `Equipo: ${equipment.nombre}` : (task ? `Equipo ${task.code}` : "Equipo")}
      showHojaDeVidaButton={true}
      isLoading={loading && isOpen}
    />
  )
}
