"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { Task, User, Schedule, Priority } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

const taskSchema = z
  .object({
    code: z.string().min(1, "El código es requerido."),
    area: z.string().min(1, "El área es requerida."),
    description: z.string().min(1, "La descripción es requerida."),
    schedule: z.enum(['Partes Altas', 'Equipo de Medición', 'Mantenimiento Locativo', 'Maquinaria']),
    priority: z.enum(['Alta', 'Media', 'Baja']),
    assignedTo: z.string().min(1, "Debe asignar un responsable."),
    customAssignedTo: z.string().optional(),
    nextExecution: z.date({
      required_error: "La fecha de ejecución es requerida.",
    }),
    hasAlert: z.boolean().default(false),
  })
  .refine(
    (data) => (data.assignedTo === 'otro' ? Boolean(data.customAssignedTo?.trim()) : true),
    {
      path: ['customAssignedTo'],
      message: 'Ingresa el nombre del responsable.',
    }
  )

type TaskFormValues = z.infer<typeof taskSchema>

interface EditTaskDialogProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  task: Task | null
  users: User[]
  onEditTask: (task: Task) => void
}

type EquipmentLookup = { codigo: string; nombre: string; area?: string | null }
type ZonaLookup = { id: string; codigo: string | null; nombre: string; area: string | null; tipo: string }

export function EditTaskDialog({ isOpen, setIsOpen, task, users, onEditTask }: EditTaskDialogProps) {
  const { toast } = useToast()
  const [equipos, setEquipos] = useState<EquipmentLookup[]>([])
  const [zonas, setZonas] = useState<ZonaLookup[]>([])
  const [codeQuery, setCodeQuery] = useState("")
  const [areaQuery, setAreaQuery] = useState("")
  const [showCodeSuggestions, setShowCodeSuggestions] = useState(false)
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false)

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      code: "",
      area: "",
      description: "",
      schedule: "Maquinaria",
      priority: "Media",
      assignedTo: "",
      customAssignedTo: "",
      nextExecution: new Date(),
      hasAlert: false,
    },
  })

  useEffect(() => {
    const fetchEquipos = async () => {
      try {
        const response = await fetch('/api/equipos')
        const data = await response.json()
        const equiposData = data.data || []

        const mapped: EquipmentLookup[] = equiposData
          .filter((e: any) => e && typeof e.codigo === "string" && typeof e.nombre === "string")
          .map((e: any) => ({
            codigo: e.codigo,
            nombre: e.nombre,
            area: e.area,
          }))

        setEquipos(mapped)
      } catch (e) {
        console.warn("No se pudo cargar la lista de equipos desde la API", e)
      }
    }

    fetchEquipos()
  }, [])

  // Cargar zonas para validación de FK y evitar error 23503
  useEffect(() => {
    const fetchZonas = async () => {
      try {
        const res = await fetch("/api/zonas");
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        const data = Array.isArray(json?.data) ? json.data : [];
        const mapped: ZonaLookup[] = data.map((z: any) => ({
          id: String(z.id),
          codigo: z.codigo ?? null,
          nombre: z.nombre ?? "",
          area: z.area ?? null,
          tipo: z.tipo ?? "",
        }));
        setZonas(mapped);
      } catch (e) {
        console.warn("No se pudo cargar la lista de zonas", e);
      }
    };

    fetchZonas();
  }, []);

  useEffect(() => {
    if (isOpen && task) {
      form.reset({
        code: task.code,
        area: task.area,
        description: task.description,
        schedule: task.schedule,
        priority: task.priority,
        assignedTo: task.assignedTo.id,
        customAssignedTo: task.assignedTo.id === 'otro' ? task.assignedTo.name : "",
        nextExecution: new Date(task.nextExecution),
        hasAlert: task.hasAlert || false,
      })
      setCodeQuery(task.code)
      setAreaQuery(task.area)
    }
  }, [isOpen, task, form])

  const filteredByCode = useMemo(() => {
    const q = codeQuery.trim().toLowerCase()
    if (!q) return []
    return equipos
      .filter(
        (e) =>
          e.codigo.toLowerCase().includes(q) ||
          e.nombre.toLowerCase().includes(q),
      )
      .slice(0, 10)
  }, [codeQuery, equipos])

  const filteredByArea = useMemo(() => {
    const q = areaQuery.trim().toLowerCase()
    if (!q) return []
    return equipos
      .filter(
        (e) =>
          (e.area ?? "").toLowerCase().includes(q) ||
          e.nombre.toLowerCase().includes(q) ||
          e.codigo.toLowerCase().includes(q),
      )
      .slice(0, 10)
  }, [areaQuery, equipos])

  const handleSubmit = useCallback(
    async (data: TaskFormValues) => {
      if (!task) return

      try {
        const rawCode = data.code?.trim() || "";
        
        // Verificar existencia para evitar error de FK (codigo_equipo)
        const matchedEquipo = equipos.find((e) => e.codigo === rawCode);
        const matchedZona = zonas.find((z) => (z.codigo || z.nombre) === rawCode);

        // Validar cronograma según el tipo de zona
        if (matchedZona) {
          if (matchedZona.tipo === "PARTES_ALTAS" && data.schedule !== "Partes Altas") {
            toast({
              title: "Cronograma incorrecto",
              description: "Esta zona pertenece a Partes Altas. Debe seleccionar el cronograma 'Partes Altas'.",
              variant: "destructive",
            })
            return
          }
          if (matchedZona.tipo === "LOCATIVO" && data.schedule !== "Mantenimiento Locativo") {
            toast({
              title: "Cronograma incorrecto",
              description: "Esta zona pertenece a Mantenimiento Locativo. Debe seleccionar el cronograma 'Mantenimiento Locativo'.",
              variant: "destructive",
            })
            return
          }
        }

        const tareaData = {
          id: task.id,
          codigo_equipo: matchedEquipo ? matchedEquipo.codigo : null,
          codigo_zona: !matchedEquipo && matchedZona ? (matchedZona.codigo || matchedZona.nombre) : null,
          area: data.area,
          titulo: data.description,
          descripcion: data.description,
          tipo_tarea: 'mantenimiento',
          cronograma: data.schedule,
          prioridad: data.priority,
          fecha_programada: data.nextExecution.toISOString(),
          responsable: data.assignedTo === 'otro' ? data.customAssignedTo : data.assignedTo,
          tiene_alerta: data.hasAlert,
        }

        const response = await fetch('/api/tareas', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tareaData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al actualizar en la BD')
        }

        let assignedToUser = users.find((u) => u.id === data.assignedTo)
        if (data.assignedTo === 'otro' && data.customAssignedTo) {
          const name = data.customAssignedTo.trim()
          assignedToUser = {
            id: `custom-${Date.now()}`,
            name,
            avatarUrl: `https://picsum.photos/seed/${encodeURIComponent(name)}/40/40`,
          }
        }

        const finalAssignedTo = assignedToUser ?? {
          id: data.assignedTo,
          name: data.customAssignedTo || data.assignedTo,
          avatarUrl: '',
        }

        const updatedTask: Task = {
          ...task,
          code: data.code,
          area: data.area,
          description: data.description,
          schedule: data.schedule,
          priority: data.priority,
          assignedTo: finalAssignedTo,
          nextExecution: data.nextExecution.toISOString(),
          hasAlert: data.hasAlert,
        }

        onEditTask(updatedTask)

        setIsOpen(false)
      } catch (error) {
        console.error('Error actualizando tarea:', error)
      }
    },
    [task, users, onEditTask, setIsOpen, equipos, zonas, toast],
  )

  if (!task) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] sm:max-w-[525px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Editar Tarea: {task.code}</DialogTitle>
          <DialogDescription>
            Modifique los detalles de la tarea de mantenimiento.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 py-4 max-h-[80vh] overflow-y-auto px-1"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Escribe el código o nombre del equipo"
                        value={codeQuery}
                        onChange={(e) => {
                          const v = e.target.value
                          setCodeQuery(v)
                          field.onChange(v)
                          setShowCodeSuggestions(true)
                        }}
                        onFocus={() => {
                          if (codeQuery) setShowCodeSuggestions(true)
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowCodeSuggestions(false), 150)
                        }}
                      />
                    </FormControl>
                    {showCodeSuggestions && filteredByCode.length > 0 && (
                      <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover text-xs shadow-md">
                        {filteredByCode.map((e) => (
                          <button
                            type="button"
                            key={e.codigo}
                            className="flex w-full flex-col items-start px-2 py-1.5 text-left hover:bg-accent"
                            onMouseDown={(ev) => {
                              ev.preventDefault()
                              const codeLabel = e.codigo
                              const areaLabel = e.area ? `${e.area} - ${e.nombre}` : e.nombre
                              setCodeQuery(codeLabel)
                              field.onChange(codeLabel)
                              form.setValue("area", areaLabel)
                              setAreaQuery(areaLabel)
                              setShowCodeSuggestions(false)
                            }}
                          >
                            <span className="font-medium">{e.codigo}</span>
                            <span className="text-[11px] text-muted-foreground">{e.area ? `${e.area} • ${e.nombre}` : e.nombre}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel>Área/Equipo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Escribe el área o nombre del equipo"
                        value={areaQuery}
                        onChange={(e) => {
                          const v = e.target.value
                          setAreaQuery(v)
                          field.onChange(v)
                          setShowAreaSuggestions(true)
                        }}
                        onFocus={() => {
                          if (areaQuery) setShowAreaSuggestions(true)
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowAreaSuggestions(false), 150)
                        }}
                      />
                    </FormControl>
                    {showAreaSuggestions && filteredByArea.length > 0 && (
                      <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover text-xs shadow-md">
                        {filteredByArea.map((e) => (
                          <button
                            type="button"
                            key={e.codigo}
                            className="flex w-full flex-col items-start px-2 py-1.5 text-left hover:bg-accent"
                            onMouseDown={(ev) => {
                              ev.preventDefault()
                              const areaLabel = e.area ? `${e.area} - ${e.nombre}` : e.nombre
                              setAreaQuery(areaLabel)
                              field.onChange(areaLabel)
                              setCodeQuery(e.codigo)
                              form.setValue("code", e.codigo)
                              setShowAreaSuggestions(false)
                            }}
                          >
                            <span className="font-medium">{e.area ?? "Sin área"}</span>
                            <span className="text-[11px] text-muted-foreground">{e.codigo} • {e.nombre}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input placeholder="Mantenimiento preventivo trimestral" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="schedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cronograma</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un cronograma" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(['Partes Altas', 'Equipo de Medición', 'Mantenimiento Locativo', 'Maquinaria'] as Schedule[]).map(
                          (s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridad</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una prioridad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(['Alta', 'Media', 'Baja'] as Priority[]).map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsable</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Asignar a..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="luis-bohorquez">Luis Bohorquez</SelectItem>
                        <SelectItem value="duvan-guevara">Duvan Guevara</SelectItem>
                        <SelectItem value="juan-david-caro">Juan David Caro</SelectItem>
                        <SelectItem value="sergio-rubiano">Sergio Rubiano</SelectItem>
                        <SelectItem value="javier-morales">Javier Morales</SelectItem>
                        <SelectItem value="otro">Otro técnico</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch("assignedTo") === 'otro' && (
                <FormField
                  control={form.control}
                  name="customAssignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del responsable</FormLabel>
                      <FormControl>
                        <Input placeholder="Escriba el nombre" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="nextExecution"
                render={({ field }) => (
                  <FormItem className="flex flex-col pt-2">
                    <FormLabel>Próx. Ejecución</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP HH:mm", { locale: es })
                            ) : (
                              <span>Seleccione una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            if (!date) return
                            const newDate = new Date(date)
                            if (field.value) {
                              newDate.setHours(field.value.getHours(), field.value.getMinutes())
                            }
                            field.onChange(newDate)
                          }}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                        <div className="p-3 border-t border-border">
                          <div className="flex items-center space-x-2">
                            <span>Hora:</span>
                            <Input
                              type="time"
                              value={field.value ? format(field.value, "HH:mm") : "00:00"}
                              onChange={(e) => {
                                if (field.value) {
                                  const [hours, minutes] = e.target.value.split(':').map(Number);
                                  const newDate = new Date(field.value);
                                  newDate.setHours(hours, minutes);
                                  field.onChange(newDate);
                                }
                              }}
                              className="w-24"
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="hasAlert"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Alerta de Recordatorio</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Actualizar Tarea</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}