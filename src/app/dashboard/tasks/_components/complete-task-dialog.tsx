"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Link, AlertCircle, FolderOpen, ExternalLink, Image as ImageIcon, FileText, Folder } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Task, User } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useFormPersistence } from "@/hooks/use-form-persistence"
import { MultiFileUploader } from "@/components/multi-file-uploader"

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const completeSchema = z
  .object({
    workDone: z.string().min(10, "Debe detallar el trabajo realizado (mín. 10 caracteres)."),
    executedById: z.string().min(1, "Debe seleccionar quién realizó la tarea."),
    customExecutedBy: z.string().optional(),
    tipoMantenimiento: z.string().min(1, "Selecciona el tipo de mantenimiento."),
    repuestos: z.string().optional().default(""),
    observaciones: z.string().optional().default(""),
    executionDate: z.date({ required_error: "Selecciona la fecha de ejecución." }),
    imageBeforeUrl: z.string().optional().default(""),
    imageAfterUrl: z.string().optional().default(""),
    anexoUrl: z.string().optional().default(""),
  })
  .refine(
    (data) => (
      data.executedById === "otro" || data.executedById === "personal-externo"
        ? Boolean(data.customExecutedBy?.trim())
        : true
    ),
    {
      path: ["customExecutedBy"],
      message: "Ingresa el nombre del ejecutor.",
    }
  )

type CompleteFormValues = z.infer<typeof completeSchema>

interface CompleteTaskDialogProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  task: Task
  users: User[]
  onComplete: (
    taskId: string,
    workDone: string,
    executedBy: User,
    imageBeforeUrl?: string,
    imageAfterUrl?: string,
    tipoMantenimiento?: string,
    repuestos?: string,
    observaciones?: string,
    executionDateIso?: string,
    modoManual?: boolean,
    anexoUrl?: string,
  ) => Promise<boolean>
}

interface EquipoInfo {
  imagenesFolderUrl?: string | null
  attachmentsUrl?: string | null
  codigo?: string
}

export function CompleteTaskDialog({ isOpen, setIsOpen, task, users, onComplete }: CompleteTaskDialogProps) {
  const { toast } = useToast()
  const [equipoInfo, setEquipoInfo] = useState<EquipoInfo | null>(null);
  const [loadingEquipo, setLoadingEquipo] = useState(false);

  // Cargar información del equipo cuando se abre el diálogo
  useEffect(() => {
    if (isOpen && task.code) {
      const loadEquipoInfo = async () => {
        setLoadingEquipo(true);
        try {
          // Sugerencia: En el futuro usar /api/equipos?codigo=${task.code}
          const res = await fetch('/api/equipos'); 
          if (res.ok) {
            const json = await res.json();
            const equipos: EquipoInfo[] = json.data || [];
            const equipo = equipos.find((e) => e.codigo === task.code);
            if (equipo) {
              setEquipoInfo({
                imagenesFolderUrl: equipo.imagenesFolderUrl,
                attachmentsUrl: equipo.attachmentsUrl,
              });
            }
          }
        } catch (error) {
          console.warn('Error cargando info del equipo:', error);
        } finally {
          setLoadingEquipo(false);
        }
      };
      loadEquipoInfo();
    }
  }, [isOpen, task.code]);

  const form = useForm<CompleteFormValues>({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      workDone: "",
      executedById: "",
      customExecutedBy: "",
      tipoMantenimiento: "",
      repuestos: "",
      observaciones: "",
      executionDate: new Date(),
      imageBeforeUrl: "",
      imageAfterUrl: "",
      anexoUrl: "",
    },
  })

  // Persistencia del formulario
  const { clearPersistedData } = useFormPersistence<CompleteFormValues>(
    "complete-task-form",
    form.control,
    form.setValue,
    form.watch
  )
  
  const resetDialog = () => {
    form.reset({
      workDone: "",
      executedById: "",
      customExecutedBy: "",
      tipoMantenimiento: "",
      repuestos: "",
      observaciones: "",
      executionDate: new Date(),
      imageBeforeUrl: "",
      imageAfterUrl: "",
      anexoUrl: "",
    });
    setEquipoInfo(null);
    clearPersistedData(); // Limpiar datos persistidos
  }

  async function onSubmit(data: CompleteFormValues) {
    let executedByUser: User;

    if ((data.executedById === "otro" || data.executedById === "personal-externo") && data.customExecutedBy) {
      const baseName = data.customExecutedBy.trim();
      const name = data.executedById === "personal-externo"
        ? `Personal Externo - ${baseName}`
        : baseName;
      executedByUser = {
        id: `custom-${Date.now()}`,
        name,
        avatarUrl: `https://picsum.photos/seed/${encodeURIComponent(name)}/40/40`,
      };
    } else {
      const selectedUser = users.find(u => u.id === data.executedById);
      if (selectedUser) {
        executedByUser = selectedUser;
      } else {
        executedByUser = {
          id: "unknown",
          name: "Desconocido",
        };
      }
    }

    const executionIso = data.executionDate.toISOString();

    // Siempre usamos modo manual - las URLs de Drive ingresadas por el usuario
    const imageBeforeToSend = data.imageBeforeUrl || undefined;
    const imageAfterToSend = data.imageAfterUrl || undefined;

    const success = await onComplete(
      task.id,
      data.workDone,
      executedByUser,
      imageBeforeToSend,
      imageAfterToSend,
      data.tipoMantenimiento,
      data.repuestos ?? "",
      data.observaciones ?? "",
      executionIso,
      true, // Siempre modo manual
      data.anexoUrl || undefined,
    )
    if (success) {
      toast({
        title: "Tarea Completada",
        description: `La tarea ${task.code} ha sido marcada como completada.`,
      })
      setIsOpen(false)
      resetDialog()
    } else {
      toast({
        title: "No se pudo completar la tarea",
        description: "Ocurrió un error al guardar los datos. Revisa el texto ingresado e inténtalo nuevamente.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
           resetDialog();
        }
    }}>
      <DialogContent className="w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Completar Tarea: {task.code}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap break-all text-xs sm:text-sm">
            {task.description}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1">
            <FormField
              control={form.control}
              name="executionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de ejecución</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? new Date(field.value).toISOString().slice(0, 10) : ""}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : new Date();
                        field.onChange(date);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="executedById"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ejecutado por</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Ejecutado por..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                        <SelectItem value="otro">Otro técnico</SelectItem>
                        <SelectItem value="personal-externo">Personal Externo</SelectItem>
                       </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(form.watch("executedById") === "otro" || form.watch("executedById") === "personal-externo") && (
              <FormField
                control={form.control}
                name="customExecutedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del ejecutor</FormLabel>
                    <FormControl>
                      <Input placeholder="Escriba el nombre" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Campos adicionales para hoja de vida */}
            <FormField
              control={form.control}
              name="tipoMantenimiento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de mantenimiento</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione tipo de mantenimiento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Correctivo">Correctivo</SelectItem>
                        <SelectItem value="Preventivo">Preventivo</SelectItem>
                        <SelectItem value="Rutinario">Rutinario</SelectItem>
      
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="repuestos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repuestos usados</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Liste los repuestos utilizados (si aplica)"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Anote observaciones generales o hallazgos relevantes"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="workDone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trabajo Realizado</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describa en detalle el trabajo que se realizó..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sección de Imágenes */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                <FolderOpen className="h-4 w-4 text-primary" />
                Evidencia Fotográfica
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Imagen Antes */}
                <FormField
                  control={form.control}
                  name="imageBeforeUrl"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-semibold text-slate-700">Fotos del Antes</FormLabel>
                      <FormControl>
                        <MultiFileUploader
                          value={field.value || ""}
                          onChange={field.onChange}
                          accept="image/*"
                          label="Fotos Antes"
                          isImageOnly={true}
                          maxFiles={5}
                          showCamera={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Imagen Después */}
                <FormField
                  control={form.control}
                  name="imageAfterUrl"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-semibold text-slate-700">Fotos del Después</FormLabel>
                      <FormControl>
                        <MultiFileUploader
                          value={field.value || ""}
                          onChange={field.onChange}
                          accept="image/*"
                          label="Fotos Después"
                          isImageOnly={true}
                          maxFiles={5}
                          showCamera={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Sección de Anexos */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                <FileText className="h-4 w-4 text-primary" />
                Archivos Adjuntos (Anexos)
              </h3>

              <FormField
                control={form.control}
                name="anexoUrl"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormControl>
                      <MultiFileUploader
                        value={field.value || ""}
                        onChange={field.onChange}
                        accept="*/*"
                        label="Archivos Anexos"
                        isImageOnly={false}
                        maxFiles={5}
                        showCamera={false}
                        maxSizeMB={null}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Guardando...' : 'Confirmar y Completar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
