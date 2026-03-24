"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Image from "next/image"
import { Upload } from "lucide-react"

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
import { TechnicianSelectField } from "@/app/dashboard/forms/_components/technician-select-field"
import type { Task, User } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

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
    imageBefore: z.any()
      .optional()
      .refine((file) => !file || file.size <= MAX_FILE_SIZE, `El tamaño máximo es 4MB.`)
      .refine(
        (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
        "Solo se aceptan formatos .jpg, .jpeg, .png y .webp."
      ),
    imageAfter: z.any()
      .optional()
      .refine((file) => !file || file.size <= MAX_FILE_SIZE, `El tamaño máximo es 4MB.`)
      .refine(
        (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
        "Solo se aceptan formatos .jpg, .jpeg, .png y .webp."
      ),
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
  ) => void
}

export function CompleteTaskDialog({ isOpen, setIsOpen, task, users, onComplete }: CompleteTaskDialogProps) {
  const { toast } = useToast()
  const [previewBefore, setPreviewBefore] = useState<string | null>(null);
  const [previewAfter, setPreviewAfter] = useState<string | null>(null);

  const form = useForm<CompleteFormValues>({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      workDone: "",
      // Sin técnico por defecto para que se vea el placeholder "Ejecutado por..."
      executedById: "",
      customExecutedBy: "",
      tipoMantenimiento: "",
      repuestos: "",
      observaciones: "",
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: "imageBefore" | "imageAfter") => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue(fieldName, file);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (fieldName === 'imageBefore') {
          setPreviewBefore(reader.result as string);
        } else {
          setPreviewAfter(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const resetDialog = () => {
    form.reset({
      workDone: "",
      executedById: "",
      customExecutedBy: "",
      tipoMantenimiento: "",
      repuestos: "",
      observaciones: "",
      imageBefore: undefined,
      imageAfter: undefined,
    });
    setPreviewBefore(null);
    setPreviewAfter(null);
  }

  function onSubmit(data: CompleteFormValues) {
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
        executedByUser = {
          id: selectedUser.id,
          name: selectedUser.name,
          avatarUrl: selectedUser.avatarUrl || `https://picsum.photos/seed/${encodeURIComponent(selectedUser.name)}/40/40`,
        };
      } else {
        const techNameMap: Record<string, string> = {
          "luis-bohorquez": "Luis Bohorquez",
          "duvan-guevara": "Duvan Guevara",
          "juan-david-caro": "Juan David Caro",
          "sergio-rubiano": "Sergio Rubiano",
          "javier-morales": "Javier Morales",
        };
        const name = techNameMap[data.executedById];
        if (!name) return;
        executedByUser = {
          id: data.executedById,
          name,
          avatarUrl: `https://picsum.photos/seed/${encodeURIComponent(name)}/40/40`,
        };
      }
    }

    onComplete(
      task.id,
      data.workDone,
      executedByUser,
      previewBefore ?? undefined,
      previewAfter ?? undefined,
      data.tipoMantenimiento,
      data.repuestos ?? "",
      data.observaciones ?? "",
    )
    toast({
      title: "Tarea Completada",
      description: `La tarea ${task.code} ha sido marcada como completada.`,
    })
    setIsOpen(false)
    resetDialog()
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
                        <SelectItem value="luis-bohorquez">Luis Bohorquez</SelectItem>
                        <SelectItem value="duvan-guevara">Duvan Guevara</SelectItem>
                        <SelectItem value="juan-david-caro">Juan David Caro</SelectItem>
                        <SelectItem value="sergio-rubiano">Sergio Rubiano</SelectItem>
                        <SelectItem value="javier-morales">Javier Morales</SelectItem>
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

            {/* No embedded locative form - keep dialog consistent with other schedules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="imageBefore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      Imagen (Antes)
                    </FormLabel>
                    <FormControl>
                      <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'imageBefore')} />
                    </FormControl>
                    {previewBefore && (
                      <div className="mt-2 h-40 w-40 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
                        <Image
                          src={previewBefore}
                          alt="Vista previa Antes"
                          width={160}
                          height={160}
                          className="object-cover"
                        />
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imageAfter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      Imagen (Después)
                    </FormLabel>
                    <FormControl>
                      <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'imageAfter')} />
                    </FormControl>
                    {previewAfter && (
                      <div className="mt-2 h-40 w-40 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
                        <Image
                          src={previewAfter}
                          alt="Vista previa Después"
                          width={160}
                          height={160}
                          className="object-cover"
                        />
                      </div>
                    )}
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
