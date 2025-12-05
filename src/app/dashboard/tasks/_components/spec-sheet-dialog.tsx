"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import type { Task } from "@/lib/types"

interface SpecSheetDialogProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  task: Task
}

export function SpecSheetDialog({ isOpen, setIsOpen, task }: SpecSheetDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ficha Técnica: {task.area}</DialogTitle>
          <DialogDescription>
            Especificaciones técnicas del equipo.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border my-4">
            <Table>
                <TableBody>
                    {task.equipmentSpecs && Object.entries(task.equipmentSpecs).map(([key, value]) => (
                        <TableRow key={key}>
                            <TableCell className="font-medium text-muted-foreground">{key}</TableCell>
                            <TableCell>{value}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => setIsOpen(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
