"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoreHorizontal, Search, RefreshCw } from "lucide-react"
import type { Submission, FormMetadata } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAllSubmissions, getFormsMetadata } from '@/lib/submissions-service'
import { useEquipos } from '@/hooks/use-equipos'
import { EquipmentDetailModal, type EquipmentDetail } from "@/components/equipment-detail-modal"

interface ResponsesViewProps {
  submissions?: Submission[]; // Hacer opcional para poder usar sin props
  forms?: FormMetadata[];     // Hacer opcional para poder usar sin props
}

export function ResponsesView({ submissions: initialSubmissions, forms: initialForms }: ResponsesViewProps) {
  const [submissions, setSubmissions] = React.useState(initialSubmissions || [])
  const [forms, setForms] = React.useState(initialForms || [])
  const [filter, setFilter] = React.useState("")
  const [selectedForm, setSelectedForm] = React.useState("all")
  const [selectedSubmission, setSelectedSubmission] = React.useState<Submission | null>(null)
  const [isDetailViewOpen, setIsDetailViewOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(!initialSubmissions)

  const [selectedEquipmentForModal, setSelectedEquipmentForModal] = React.useState<EquipmentDetail | null>(null)
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = React.useState(false)

  const { equipos } = useEquipos()

  const formatEquipoLabel = React.useCallback(
    (raw: string) => {
      const codigo = raw.trim()
      if (!codigo) return raw

      const eq = equipos.find((e) => e.codigo === codigo)
      if (!eq) return raw

      const area = eq.area || ''
      const linea = (eq as any).linea || ''
      const nombre = eq.nombre || ''

      const parts = [
        codigo,
        area,
        linea,
        nombre,
      ].filter(Boolean)

      return parts.join(' - ')
    },
    [equipos],
  )

  React.useEffect(() => {
    const loadData = async () => {
      if (initialSubmissions && initialForms) return
        
      try {
        setLoading(true)
        const [submissionsData, formsData] = await Promise.all([
          getAllSubmissions(),
          getFormsMetadata()
        ])
        setSubmissions(submissionsData)
        setForms(formsData)
      } catch (error) {
        console.error('Error loading submissions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [initialSubmissions, initialForms])

  const filteredSubmissions = submissions.filter(
    (submission) => {
      const matchesForm = selectedForm === 'all' || submission.form === selectedForm;
      const matchesSearch =
        submission.formTitle.toLowerCase().includes(filter.toLowerCase()) ||
        Object.values(submission.data).some(val => 
          String(val).toLowerCase().includes(filter.toLowerCase())
        );
      return matchesForm && matchesSearch;
    }
  )

  const handleViewDetails = (submission: Submission) => {
    setSelectedSubmission(submission)
    setIsDetailViewOpen(true)
  }

  const handleEquipoClick = (equipo: EquipmentDetail) => {
    setSelectedEquipmentForModal(equipo)
    setIsEquipmentModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <div className="text-lg">Cargando respuestas...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
            <CardTitle>Respuestas de Formularios</CardTitle>
            <CardDescription>Busca y visualiza todas las respuestas guardadas.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por título, equipo, etc..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="pl-8 w-full"
                    />
                </div>
                <Select value={selectedForm} onValueChange={setSelectedForm}>
                  <SelectTrigger className="w-full md:w-[280px]">
                    <SelectValue placeholder="Filtrar por formulario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Formularios</SelectItem>
                    {forms.map(form => (
                      <SelectItem key={form.slug} value={form.slug}>
                        {form.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Formulario</TableHead>
                    <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                    <TableHead className="hidden md:table-cell">Resumen</TableHead>
                    <TableHead>
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.length > 0 ? filteredSubmissions.map((submission) => (
                    <TableRow key={submission.id} onClick={() => handleViewDetails(submission)} className="cursor-pointer">
                      <TableCell className="font-medium">
                        <div>{submission.formTitle}</div>
                        <div className="text-sm text-muted-foreground sm:hidden">{formatDate(submission.submittedAt)}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{formatDate(submission.submittedAt)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm truncate max-w-sm">
                        {Object.entries(submission.data).slice(0, 2).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ')}...
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => handleViewDetails(submission)}>Ver Detalles</DropdownMenuItem>
                            <DropdownMenuItem>Exportar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No hay resultados.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
        </CardContent>
      </Card>

      {selectedSubmission && (
        <Dialog open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalle de Respuesta</DialogTitle>
              <DialogDescription>{selectedSubmission.formTitle} - {formatDate(selectedSubmission.submittedAt, "PPpp")}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {Object.entries(selectedSubmission.data)
                .filter(([_, value]) => {
                  if (value === null || value === undefined) return false
                  const asString = String(value).trim()
                  if (!asString) return false
                  if (asString.toLowerCase() === 'null') return false
                  return true
                })
                .map(([key, value]) => (
                <div key={key} className="grid grid-cols-3 gap-4 items-start">
                  <span className="text-muted-foreground capitalize font-medium text-sm col-span-1">{key.replace(/([A-Z])/g, ' $1')}:</span>
                  <div className="col-span-2 text-sm max-w-sm whitespace-pre-wrap break-all">
                    {Array.isArray(value) ? (
                      <div className="space-y-2">
                        {value.map((item, index) => (
                          <Card key={index} className="p-2 bg-muted/50">
                            {Object.entries(item).map(([itemKey, itemValue]) => (
                               <div key={itemKey} className="flex justify-between text-xs gap-2">
                                 <span className="text-muted-foreground capitalize shrink-0">{itemKey.replace(/([A-Z])/g, ' $1')}:</span>
                                 <span className="whitespace-pre-wrap break-all text-right max-w-xs">{String(itemValue)}</span>
                               </div>
                            ))}
                          </Card>
                        ))}
                      </div>
                    ) : (
                      (() => {
                        const stringValue = String(value)
                        const trimmed = stringValue.trim()
                        const equipoMatch = equipos.find(e => e.codigo === trimmed)

                        if (equipoMatch) {
                          return (
                            <button
                              onClick={() => handleEquipoClick(equipoMatch)}
                              className="font-semibold whitespace-pre-wrap break-all inline-block max-w-xs text-blue-600 hover:underline text-left"
                            >
                              {formatEquipoLabel(stringValue)}
                            </button>
                          )
                        }

                        return (
                          <span className="font-semibold whitespace-pre-wrap break-all inline-block max-w-xs">
                            {key.toLowerCase() === 'equipo'
                              ? formatEquipoLabel(stringValue)
                              : stringValue}
                          </span>
                        )
                      })()
                    )}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => setIsDetailViewOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <EquipmentDetailModal
        equipment={selectedEquipmentForModal}
        isOpen={isEquipmentModalOpen}
        onClose={() => setIsEquipmentModalOpen(false)}
        showHojaDeVidaButton={true}
      />
    </>
  )
}
