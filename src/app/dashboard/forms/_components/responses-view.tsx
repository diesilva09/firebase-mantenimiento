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
import { MoreHorizontal, Search, RefreshCw, FileSpreadsheet, FileText, File, Download, Pencil, Trash2, AlertCircle } from "lucide-react"
import type { Submission, FormMetadata } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAllSubmissions, getFormsMetadata, updateSubmission, deleteSubmission } from '@/lib/submissions-service'
import { useEquipos } from '@/hooks/use-equipos'
import { EquipmentDetailModal, type EquipmentDetail } from "@/components/equipment-detail-modal"
import { exportToExcel, exportToPDF, exportToWord } from "@/lib/export-utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { MultiFileViewer } from "@/components/multi-file-viewer"
import { useLiveRefresh } from "@/hooks/use-live-refresh"

interface ResponsesViewProps {
  submissions?: Submission[]; // Hacer opcional para poder usar sin props
  forms?: FormMetadata[];     // Hacer opcional para poder usar sin props
}

export function ResponsesView({ submissions: initialSubmissions, forms: initialForms }: ResponsesViewProps) {
  const { toast } = useToast()
  const [submissions, setSubmissions] = React.useState(initialSubmissions || [])
  const [forms, setForms] = React.useState(initialForms || [])
  const [filter, setFilter] = React.useState("")
  const [selectedForm, setSelectedForm] = React.useState("all")
  const [selectedSubmission, setSelectedSubmission] = React.useState<Submission | null>(null)
  const [isDetailViewOpen, setIsDetailViewOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(!initialSubmissions)

  const [selectedEquipmentForModal, setSelectedEquipmentForModal] = React.useState<EquipmentDetail | null>(null)
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = React.useState(false)

  // Estados para editar y eliminar
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [editingSubmission, setEditingSubmission] = React.useState<Submission | null>(null)
  const [editFormData, setEditFormData] = React.useState<Record<string, any>>({})
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const { equipos } = useEquipos()

  const fileViewerConfig: Record<string, { label: string; variant: "blue" | "green" | "orange"; isImage: boolean }> = {
    "Fotos Antes": { label: "Fotos Antes", variant: "blue", isImage: true },
    "Fotos Después": { label: "Fotos Después", variant: "green", isImage: true },
    "Archivos Anexos": { label: "Archivos Anexos", variant: "orange", isImage: false },
  }

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

  const loadData = React.useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true)
      }

      const [submissionsData, formsData] = await Promise.all([
        getAllSubmissions(),
        initialForms ? Promise.resolve(initialForms) : getFormsMetadata(),
      ])

      setSubmissions(submissionsData)
      setForms(formsData)
    } catch (error) {
      console.error('Error loading submissions:', error)
    } finally {
      if (!options?.silent) {
        setLoading(false)
      }
    }
  }, [initialForms])

  React.useEffect(() => {
    if (initialSubmissions && initialForms) return
    void loadData()
  }, [initialForms, initialSubmissions, loadData])

  useLiveRefresh({
    callback: () => loadData({ silent: true }),
    scopes: ["responses", "maintenance-orders", "maintenance-requests"],
    intervalMs: 25000,
    immediate: false,
  })

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

  const handleExport = (submission: Submission, exportFormat: 'excel' | 'pdf' | 'word') => {
    const flatData = {
      'Formulario': submission.formTitle,
      'Fecha': format(new Date(submission.submittedAt), "dd/MM/yyyy HH:mm", { locale: es }),
      ...Object.entries(submission.data).reduce((acc, [key, value]) => {
        acc[key] = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
        return acc;
      }, {} as Record<string, string>)
    };

    const dataToExport = [flatData];
    const columns = Object.keys(flatData);
    const filename = `Respuesta_${submission.formTitle.replace(/\s+/g, '_')}_${new Date().getTime()}`;

    if (exportFormat === 'excel') {
      exportToExcel(dataToExport, filename);
    } else if (exportFormat === 'pdf') {
      exportToPDF(dataToExport, columns, `Respuesta: ${submission.formTitle}`, filename);
    } else if (exportFormat === 'word') {
      exportToWord(dataToExport, columns, `Respuesta: ${submission.formTitle}`, filename);
    }
  };

  const handleBulkExport = (exportFormat: 'excel' | 'pdf' | 'word') => {
    if (filteredSubmissions.length === 0) return;

    const dataToExport = filteredSubmissions.map(submission => {
      const row: Record<string, string> = {
        'Formulario': submission.formTitle,
        'Fecha': format(new Date(submission.submittedAt), "dd/MM/yyyy HH:mm", { locale: es }),
      };

      Object.entries(submission.data).forEach(([key, value]) => {
        row[key] = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
      });
      
      return row;
    });

    const allKeys = new Set<string>(['Formulario', 'Fecha']);
    dataToExport.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
    const columns = Array.from(allKeys);

    const formTitle = selectedForm === 'all' ? 'Todas las Respuestas' : forms.find(f => f.slug === selectedForm)?.title || 'Respuestas';
    const filename = `Reporte_${formTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;

    if (exportFormat === 'excel') {
      exportToExcel(dataToExport, filename);
    } else if (exportFormat === 'pdf') {
      exportToPDF(dataToExport, columns, `Reporte: ${formTitle}`, filename);
    } else if (exportFormat === 'word') {
      exportToWord(dataToExport, columns, `Reporte: ${formTitle}`, filename);
    }
  };

  // Funciones para editar
  const handleEdit = (submission: Submission) => {
    setEditingSubmission(submission)
    setEditFormData({ ...submission.data })
    setIsEditDialogOpen(true)
    setIsDetailViewOpen(false)
  }

  const handleSaveEdit = async () => {
    if (!editingSubmission) return

    setIsSaving(true)
    try {
      const success = await updateSubmission(editingSubmission.form, editingSubmission.id, editFormData)
      if (success) {
        // Actualizar la lista local
        setSubmissions(prev => prev.map(s =>
          s.id === editingSubmission.id
            ? { ...s, data: editFormData }
            : s
        ))
        setIsEditDialogOpen(false)
        setEditingSubmission(null)
        toast({
          title: "✅ Registro actualizado",
          description: "El registro se ha actualizado exitosamente.",
        })
      } else {
        toast({
          title: "❌ Error",
          description: "No se pudo actualizar el registro.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error guardando cambios:', error)
      toast({
        title: "❌ Error",
        description: "No se pudo guardar los cambios.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Funciones para eliminar
  const handleDelete = (submission: Submission) => {
    setEditingSubmission(submission)
    setIsDeleteDialogOpen(true)
    setIsDetailViewOpen(false)
  }

  const handleConfirmDelete = async () => {
    if (!editingSubmission) return

    setIsDeleting(true)
    try {
      const success = await deleteSubmission(editingSubmission.form, editingSubmission.id)
      if (success) {
        // Remover de la lista local
        setSubmissions(prev => prev.filter(s => s.id !== editingSubmission.id))
        setIsDeleteDialogOpen(false)
        setEditingSubmission(null)
        toast({
          title: "Registro eliminado",
          description: "El registro se ha eliminado exitosamente.",
          variant: "success",
        })
      } else {
        toast({
          title: "Error al eliminar el registro",
          description: "No se pudo eliminar el registro.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error eliminando:', error)
      toast({
        title: "Error al eliminar el registro",
        description: "No se pudo eliminar el registro.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Verificar si un formulario es editable (desactivado)
  const isEditableForm = (_form: string) => {
    return false
  }

  // Verificar si un formulario es eliminable
  const isDeletableForm = (form: string) => {
    return ['ordenes-mantenimiento', 'equipment-inspections', 'spares-requests'].includes(form)
  }

  // Extraer la fecha del registro según el tipo de formulario
  const getSubmissionDate = (submission: Submission): string => {
    const data = submission.data;
    // Buscar campos de fecha en orden de prioridad
    const dateFields = ['Fecha Ejecución', 'Fecha Inspección', 'Fecha Solicitud', 'Fecha Parada', 'Fecha'];
    for (const field of dateFields) {
      if (data[field] && data[field] !== '-') {
        return String(data[field]);
      }
    }
    return '-';
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Exportar Lista</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBulkExport('excel')}>
                      <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkExport('pdf')}>
                      <FileText className="mr-2 h-4 w-4 text-red-600" /> PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkExport('word')}>
                      <File className="mr-2 h-4 w-4 text-blue-600" /> Word
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                        <div className="text-sm text-muted-foreground sm:hidden">{getSubmissionDate(submission)}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{getSubmissionDate(submission)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm truncate max-w-sm">
                        {Object.entries(submission.data)
                          .filter(([_, value]) => value !== null && value !== undefined && String(value).trim() !== '' && String(value) !== 'null')
                          .slice(0, 2)
                          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ')}...
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
                            {isEditableForm(submission.form) && (
                              <DropdownMenuItem onClick={() => handleEdit(submission)}>
                                <Pencil className="mr-2 h-4 w-4 text-blue-600" /> Editar
                              </DropdownMenuItem>
                            )}
                            {isEditableForm(submission.form) && (
                              <DropdownMenuItem onClick={() => handleDelete(submission)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4 text-red-600" /> Eliminar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuLabel>Exportar</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleExport(submission, 'excel')}>
                              <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport(submission, 'pdf')}>
                              <FileText className="mr-2 h-4 w-4 text-red-600" /> PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport(submission, 'word')}>
                              <File className="mr-2 h-4 w-4 text-blue-600" /> Word
                            </DropdownMenuItem>
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
          <DialogContent className="sm:max-w-2xl lg:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detalle de Respuesta</DialogTitle>
              <DialogDescription>{selectedSubmission.formTitle}</DialogDescription>
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
                <div key={key} className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-12">
                  <span className="text-muted-foreground capitalize font-medium text-sm sm:col-span-1 lg:col-span-4">
                    {key.replace(/([A-Z])/g, ' $1')}:
                  </span>
                  <div className="text-sm min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] sm:col-span-2 lg:col-span-8">
                    {Array.isArray(value) ? (
                      <div className="space-y-2">
                        {value.map((item, index) => (
                          <Card key={index} className="p-2 bg-muted/50">
                            {Object.entries(item).map(([itemKey, itemValue]) => (
                               <div key={itemKey} className="flex justify-between text-xs gap-2">
                                 <span className="text-muted-foreground capitalize shrink-0">{itemKey.replace(/([A-Z])/g, ' $1')}:</span>
                                 <span className="text-right min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{String(itemValue)}</span>
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
                        const fileViewer = fileViewerConfig[key]

                        if (fileViewer) {
                          return (
                            <MultiFileViewer
                              urls={stringValue}
                              label={fileViewer.label}
                              variant={fileViewer.variant}
                              isImage={fileViewer.isImage}
                            />
                          )
                        }

                        if (equipoMatch) {
                          return (
                            <button
                              onClick={() => handleEquipoClick(equipoMatch)}
                              className="font-semibold inline-block min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-blue-600 hover:underline text-left"
                            >
                              {formatEquipoLabel(stringValue)}
                            </button>
                          )
                        }

                        return (
                          <span className="font-semibold inline-block min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
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
            <DialogFooter className="gap-2">
              {selectedSubmission && isDeletableForm(selectedSubmission.form) && (
                <Button variant="destructive" onClick={() => handleDelete(selectedSubmission)} className="gap-2">
                  <Trash2 className="h-4 w-4" /> Eliminar
                </Button>
              )}
              <Button onClick={() => setIsDetailViewOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Diálogo de Editar */}
      {editingSubmission && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar {editingSubmission.formTitle}</DialogTitle>
              <DialogDescription>Modifica los campos necesarios y guarda los cambios.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {Object.entries(editFormData).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">{key}</label>
                  {key.toLowerCase().includes('fecha') ? (
                    <Input
                      type="date"
                      value={String(value || '').split('T')[0]}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  ) : key.toLowerCase().includes('hora') ? (
                    <Input
                      type="time"
                      value={String(value || '')}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  ) : key.toLowerCase().includes('cantidad') ? (
                    <Input
                      type="number"
                      value={String(value || '')}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      value={String(value || '')}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Diálogo de Eliminar */}
      {editingSubmission && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Confirmar Eliminación
              </DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar este registro de <strong>{editingSubmission.formTitle}</strong>?
                <br /><br />
                Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </Button>
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
