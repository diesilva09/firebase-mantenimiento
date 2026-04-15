"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import type React from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import type { Task, User, Schedule, Priority, Notification } from "@/lib/types"
import { useNotificationsContext as useNotifications } from "@/context/notifications-context"
import { scheduleTaskReminders } from "../../../../services/task-reminders"
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
    reminderType: z.enum(['predefined', 'custom']).optional(),
    predefinedReminders: z.array(z.boolean()).optional(),
    customReminderDate: z.date().optional(),
    frecuencia: z.enum(['ninguna', 'diaria', 'semanal', 'mensual', 'trimestral', 'personalizada']).default('ninguna'),
    intervalo: z
      .coerce.number()
      .int()
      .positive("Debe ser un número mayor que cero")
      .optional(),
    anticipacionDias: z
      .coerce.number()
      .int()
      .min(0, "Debe ser un número mayor o igual a cero")
      .max(365, "No puede ser mayor a 365 días")
      .optional(),
  })
  .refine(
    (data) => (
      data.assignedTo === 'otro' || data.assignedTo === 'personal-externo'
        ? Boolean(data.customAssignedTo?.trim())
        : true
    ),
    {
      path: ['customAssignedTo'],
      message: 'Ingresa el nombre del responsable.',
    }
  )
  .refine(
    (data) => {
      // Si hasAlert es true y reminderType es 'custom', customReminderDate debe estar definido
      if (data.hasAlert && data.reminderType === 'custom') {
        return data.customReminderDate instanceof Date && !isNaN(data.customReminderDate.getTime());
      }
      return true;
    },
    {
      path: ['customReminderDate'],
      message: 'La fecha del recordatorio personalizado es requerida.',
    }
  )

type TaskFormValues = z.infer<typeof taskSchema>

interface AddTaskDialogProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  onAddTask: (task: Task) => void
  users: User[]
}

type EquipmentLookup = { codigo: string; nombre: string; area?: string | null; linea?: string | null }
type ZonaLookup = { id: string; codigo: string | null; nombre: string; area: string | null; tipo: string }

export function AddTaskDialog({ isOpen, setIsOpen, onAddTask, users }: AddTaskDialogProps) {
  const { addNotification, permission } = useNotifications()
  const { toast } = useToast()
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
      hasAlert: false,
      reminderType: undefined,
      predefinedReminders: [true, true, true], // Por defecto, todos los recordatorios predefinidos están activados
      customReminderDate: undefined,
      frecuencia: 'ninguna',
      intervalo: undefined,
      anticipacionDias: 30,
    },
  })

  const [equipos, setEquipos] = useState<EquipmentLookup[]>([])
  const [zonas, setZonas] = useState<ZonaLookup[]>([])
  const [codeQuery, setCodeQuery] = useState("")
  const [areaQuery, setAreaQuery] = useState("")
  const [showCodeSuggestions, setShowCodeSuggestions] = useState(false)
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1)
  const suggestionsContainerRef = useRef<HTMLDivElement | null>(null)

  // Estado para autosugerencias de descripción
  const [descriptionSuggestion, setDescriptionSuggestion] = useState("")
  const descriptionDebounceRef = useRef<number | null>(null)

  const fetchDescriptionSuggestion = useCallback(async (value: string) => {
    const query = value.trim()
    if (!query || query.length < 3) {
      setDescriptionSuggestion("")
      return
    }

    try {
      const res = await fetch(`/api/tareas/sugerencias?query=${encodeURIComponent(query)}`)
      if (!res.ok) {
        setDescriptionSuggestion("")
        return
      }
      const json = await res.json().catch(() => ({ data: [] }))
      const list: string[] = Array.isArray(json?.data) ? json.data : []
      const match = list.find((item) =>
        item.toLowerCase().startsWith(query.toLowerCase()),
      )
      if (match && match.length > query.length) {
        setDescriptionSuggestion(match)
      } else {
        setDescriptionSuggestion("")
      }
    } catch {
      setDescriptionSuggestion("")
    }
  }, [])

  // Limpiar sugerencias cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setDescriptionSuggestion("")
      if (descriptionDebounceRef.current !== null) {
        window.clearTimeout(descriptionDebounceRef.current)
        descriptionDebounceRef.current = null
      }
    }
  }, [isOpen])

  const handleDescriptionChange = useCallback(
    (value: string) => {
      if (descriptionDebounceRef.current !== null) {
        window.clearTimeout(descriptionDebounceRef.current)
      }
      descriptionDebounceRef.current = window.setTimeout(() => {
        fetchDescriptionSuggestion(value)
      }, 250)
    },
    [fetchDescriptionSuggestion],
  )

  const handleDescriptionKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, currentValue: string) => {
      if (e.key === 'Tab' && !e.shiftKey && descriptionSuggestion) {
        const base = currentValue ?? ''
        if (
          base &&
          descriptionSuggestion.toLowerCase().startsWith(base.toLowerCase()) &&
          descriptionSuggestion.length > base.length
        ) {
          e.preventDefault()
          form.setValue('description', descriptionSuggestion)
          setDescriptionSuggestion('')
        }
      }
    },
    [descriptionSuggestion, form],
  )

  const applyDescriptionSuggestion = useCallback(() => {
    const currentValue = form.getValues('description') ?? ''
    if (
      !descriptionSuggestion ||
      !currentValue ||
      !descriptionSuggestion.toLowerCase().startsWith(currentValue.toLowerCase()) ||
      descriptionSuggestion.length <= currentValue.length
    ) {
      return
    }
    form.setValue('description', descriptionSuggestion)
    setDescriptionSuggestion('')
  }, [descriptionSuggestion, form])

  useEffect(() => {
    const fetchEquipos = async () => {
      try {
        const response = await fetch('/api/equipos');
        const data = await response.json();
        const equiposData = data.data || [];
        
        const mapped: EquipmentLookup[] = equiposData
          .filter((e: any) => e && typeof e.codigo === "string" && typeof e.nombre === "string")
          .map((e: any) => ({ 
            codigo: e.codigo, 
            nombre: e.nombre, 
            area: e.area ?? null,
            linea: e.linea ?? null,
          }));
        
        setEquipos(mapped);
      } catch (e) {
        console.warn("No se pudo cargar la lista de equipos desde la API", e);
        
        // Fallback a localStorage
        try {
          const raw = typeof window !== "undefined" ? localStorage.getItem("equipos") : null;
          if (!raw) return;
          const parsed = JSON.parse(raw) as any[];
          const mapped: EquipmentLookup[] = parsed
            .filter((e) => e && typeof e.codigo === "string" && typeof e.nombre === "string")
            .map((e) => ({ 
              codigo: e.codigo, 
              nombre: e.nombre, 
              area: e.area ?? null,
              linea: e.linea ?? null,
            }));
          setEquipos(mapped);
        } catch (localError) {
          console.warn("Fallback a localStorage también falló", localError);
        }
      }
    };

    fetchEquipos();
  }, []);

  // Cargar zonas para sugerencias de área/zona
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

  const filteredByCode = useMemo(() => {
    const q = codeQuery.trim().toLowerCase()
    if (!q) return []
    return equipos.filter(
      (e) =>
        e.codigo.toLowerCase().includes(q) ||
        e.nombre.toLowerCase().includes(q),
    ).slice(0, 10)
  }, [codeQuery, equipos])

  const filteredByArea = useMemo(() => {
    const q = areaQuery.trim().toLowerCase()
    if (!q) return []
    return equipos.filter(
      (e) =>
        (e.area ?? "").toLowerCase().includes(q) ||
        e.nombre.toLowerCase().includes(q) ||
        e.codigo.toLowerCase().includes(q),
    ).slice(0, 10)
  }, [areaQuery, equipos])

  const filteredZonas = useMemo(() => {
    const q = areaQuery.trim().toLowerCase();
    if (!q) return [];
    return zonas
      .filter((z) =>
        (z.area ?? "").toLowerCase().includes(q) ||
        z.nombre.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [areaQuery, zonas]);

  const filteredZonasByCode = useMemo(() => {
    const q = codeQuery.trim().toLowerCase();
    if (!q) return [];
    return zonas
      .filter((z) =>
        (z.area ?? "").toLowerCase().includes(q) ||
        z.nombre.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [codeQuery, zonas]);

  async function onSubmit(data: TaskFormValues) {
    try {
      const rawCode = data.code?.trim() || "";
      const area = data.area;

      const matchedEquipo = equipos.find((e) => e.codigo === rawCode);
      const matchedZona = zonas.find((z) => (z.codigo || z.nombre) === rawCode);

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

      const codigoEquipoForDB = matchedEquipo ? matchedEquipo.codigo : null;
      const codigoZonaForDB = !matchedEquipo && matchedZona ? (matchedZona.codigo || matchedZona.nombre) : null;

      // Obtener el nombre completo del responsable para la BD / notificación
      const responsableId = data.assignedTo;
      let responsableName = '';
      if (responsableId === 'personal-externo') {
        const baseName = data.customAssignedTo?.trim() || '';
        responsableName = baseName ? `Personal Externo - ${baseName}` : 'Personal Externo';
      } else if (responsableId === 'otro') {
        responsableName = data.customAssignedTo?.trim() || '';
      } else {
        const user = users.find(u => u.id === responsableId);
        responsableName = user ? user.name : responsableId;
      }

      const tareaData = {
        codigo_equipo: codigoEquipoForDB,
        codigo_zona: codigoZonaForDB,
        area: area,
        titulo: data.description,
        descripcion: data.description,
        tipo_tarea: 'mantenimiento',
        cronograma: data.schedule,
        prioridad: data.priority,
        fecha_programada: data.nextExecution.toISOString(),
        responsable: responsableName,
        tiene_alerta: data.hasAlert,
        frecuencia: data.frecuencia,
        intervalo: data.frecuencia === 'ninguna' ? null : (data.intervalo ?? 1),
        anticipacion_dias: data.frecuencia === 'ninguna' ? null : (data.anticipacionDias ?? 30),
      };

      console.log('Enviando tarea a la BD:', tareaData);

      const response = await fetch('/api/tareas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tareaData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar en la BD');
      }

      const dbTask = await response.json();

      if (data.hasAlert) {
        const taskForReminder: Task = {
          id: String(dbTask.id),
          description: data.description,
          area: data.area,
          code: data.code,
          schedule: data.schedule,
          priority: data.priority,
          assignedTo: users.find(u => u.id === data.assignedTo) || { id: 'unknown', name: 'Unknown', avatarUrl: '' },
          nextExecution: data.nextExecution.toISOString(),
          hasAlert: data.hasAlert,
          status: 'Pendiente'
        };
        await scheduleTaskReminders(
          taskForReminder,
          data.nextExecution,
          {
            reminderType: data.reminderType,
            predefinedReminders: data.predefinedReminders,
            customReminderDate: data.customReminderDate
          }
        );
      }

      let assignedToUser = users.find(u => u.id === data.assignedTo)
      if (data.assignedTo === 'otro' && data.customAssignedTo) {
        const name = data.customAssignedTo.trim()
        assignedToUser = {
          id: `custom-${Date.now()}`,
          name,
          avatarUrl: `https://picsum.photos/seed/${encodeURIComponent(name)}/40/40`,
        }
      } else if (data.assignedTo === 'personal-externo' && data.customAssignedTo) {
        const baseName = data.customAssignedTo.trim()
        const name = `Personal Externo - ${baseName}`
        assignedToUser = {
          id: 'personal-externo',
          name,
          avatarUrl: `https://picsum.photos/seed/${encodeURIComponent(name)}/40/40`,
        }
      }

      const finalAssignedTo = assignedToUser ?? {
        id: data.assignedTo,
        name: data.customAssignedTo || data.assignedTo,
        avatarUrl: '',
      }

      const newTaskForParent: Task = {
        id: String(dbTask.id),
        code: data.code ?? '',
        area: data.area ?? '',
        description: data.description ?? '',
        schedule: data.schedule,
        priority: data.priority,
        assignedTo: finalAssignedTo,
        nextExecution: data.nextExecution.toISOString(),
        hasAlert: data.hasAlert,
        status: 'Pendiente',
        anticipacion_dias: data.frecuencia === 'ninguna' ? null : (data.anticipacionDias ?? 30),
      }

      onAddTask(newTaskForParent)

      setIsOpen(false)
      form.reset()
      setCodeQuery("")
      setAreaQuery("")
    } catch (error) {
      console.error('Error guardando tarea:', error);
      toast({
        title: "Error al crear la tarea",
        description: error instanceof Error ? error.message : "Ocurrió un error al crear la tarea",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] max-w-lg sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Agregar Nueva Labor</DialogTitle>
          <DialogDescription>
            Complete los detalles de la nueva tarea de mantenimiento.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 px-1">
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
                          setActiveSuggestionIndex(-1)
                        }}
                        onFocus={() => {
                          if (codeQuery) setShowCodeSuggestions(true)
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setShowCodeSuggestions(false)
                            setActiveSuggestionIndex(-1)
                          }, 150)
                        }}
                        onKeyDown={(e) => {
                          const totalSuggestions = filteredByCode.length + filteredZonasByCode.length
                          if (!showCodeSuggestions || totalSuggestions === 0) return

                          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            e.preventDefault()
                            const delta = e.key === 'ArrowDown' ? 1 : -1
                            const newIndex = ((activeSuggestionIndex + delta) % totalSuggestions + totalSuggestions) % totalSuggestions
                            setActiveSuggestionIndex(newIndex)

                            const container = suggestionsContainerRef.current
                            if (container) {
                              const el = container.querySelector<HTMLButtonElement>(`button[data-suggestion-index="${newIndex}"]`)
                              el?.scrollIntoView({ block: 'nearest' })
                            }
                          }

                          if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
                            e.preventDefault()
                            const idx = activeSuggestionIndex
                            if (idx < filteredByCode.length) {
                              const eItem = filteredByCode[idx]
                              const codeLabel = eItem.codigo
                              const areaText = eItem.area ?? "Sin área"
                              const lineaText = eItem.linea ?? "Sin línea"
                              const areaLabel = `${areaText} - ${lineaText} - ${eItem.nombre}`
                              setCodeQuery(codeLabel)
                              field.onChange(codeLabel)
                              form.setValue("area", areaLabel)
                              setAreaQuery(areaLabel)
                            } else {
                              const zIndex = idx - filteredByCode.length
                              const zItem = filteredZonasByCode[zIndex]
                              if (zItem) {
                                const codeLabel = zItem.codigo || zItem.nombre
                                const areaLabel = zItem.area ? `${zItem.area} - ${zItem.nombre}` : zItem.nombre
                                setCodeQuery(codeLabel)
                                field.onChange(codeLabel)
                                form.setValue("area", areaLabel)
                                setAreaQuery(areaLabel)

                                if (zItem.tipo === "PARTES_ALTAS") {
                                  form.setValue("schedule", "Partes Altas")
                                } else if (zItem.tipo === "LOCATIVO") {
                                  form.setValue("schedule", "Mantenimiento Locativo")
                                }
                              }
                            }

                            setShowCodeSuggestions(false)
                            setActiveSuggestionIndex(-1)
                          }
                        }}
                      />
                    </FormControl>
                    {showCodeSuggestions && (filteredByCode.length > 0 || filteredZonasByCode.length > 0) && (
                      <div
                        ref={suggestionsContainerRef}
                        className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover text-xs shadow-md"
                      >
                        {filteredByCode.length > 0 && (
                          <>
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Equipos</div>
                            {filteredByCode.map((e, idx) => {
                              const globalIndex = idx
                              const isActive = globalIndex === activeSuggestionIndex
                              return (
                                <button
                                  type="button"
                                  key={e.codigo}
                                  data-suggestion-index={globalIndex}
                                  className={cn(
                                    "flex w-full flex-col items-start px-2 py-1.5 text-left hover:bg-accent",
                                    isActive && "bg-accent"
                                  )}
                                  onMouseDown={(ev) => {
                                    ev.preventDefault()
                                    const codeLabel = e.codigo
                                    const areaText = e.area ?? "Sin área"
                                    const lineaText = e.linea ?? "Sin línea"
                                    const areaLabel = `${areaText} - ${lineaText} - ${e.nombre}`
                                    setCodeQuery(codeLabel)
                                    field.onChange(codeLabel)
                                    form.setValue("area", areaLabel)
                                    setAreaQuery(areaLabel)
                                    setShowCodeSuggestions(false)
                                    setActiveSuggestionIndex(-1)
                                  }}
                                >
                                  <span className="font-medium">{e.codigo}</span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {e.area ?? "Sin área"}
                                    {e.linea ? ` • ${e.linea}` : ""}
                                    {` • ${e.nombre}`}
                                  </span>
                                </button>
                              )
                            })}
                          </>
                        )}

                        {filteredZonasByCode.length > 0 && (
                          <>
                            <div className="mt-1 px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase border-t bg-background">Zonas</div>
                            {filteredZonasByCode.map((z, idx) => {
                              const globalIndex = filteredByCode.length + idx
                              const isActive = globalIndex === activeSuggestionIndex
                              return (
                                <button
                                  type="button"
                                  key={z.id}
                                  data-suggestion-index={globalIndex}
                                  className={cn(
                                    "flex w-full flex-col items-start px-2 py-1.5 text-left hover:bg-accent",
                                    isActive && "bg-accent"
                                  )}
                                  onMouseDown={(ev) => {
                                    ev.preventDefault();
                                    const codeLabel = z.codigo || z.nombre; // usar código real de la zona si existe
                                    const areaLabel = z.area ? `${z.area} - ${z.nombre}` : z.nombre;
                                    setCodeQuery(codeLabel);
                                    field.onChange(codeLabel);
                                    form.setValue("area", areaLabel);
                                    setAreaQuery(areaLabel);
                                    setShowCodeSuggestions(false);

                                    if (z.tipo === "PARTES_ALTAS") {
                                      form.setValue("schedule", "Partes Altas")
                                    } else if (z.tipo === "LOCATIVO") {
                                      form.setValue("schedule", "Mantenimiento Locativo")
                                    }
                                  }}
                                >
                                  <span className="font-medium">{z.area ?? "Sin área"}</span>
                                  <span className="text-[11px] text-muted-foreground">Zona • {z.nombre}</span>
                                </button>
                              )
                            })}
                          </>
                        )}
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
                    <FormLabel>Área/Linea/Equipo/Zona</FormLabel>
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
                    {showAreaSuggestions && (filteredByArea.length > 0 || filteredZonas.length > 0) && (
                      <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover text-xs shadow-md">
                        {filteredByArea.length > 0 && (
                          <>
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Equipos</div>
                            {filteredByArea.map((e) => (
                              <button
                                type="button"
                                key={e.codigo}
                                className="flex w-full flex-col items-start px-2 py-1.5 text-left hover:bg-accent"
                                onMouseDown={(ev) => {
                                  ev.preventDefault();
                                  const areaText = e.area ?? "Sin área";
                                  const lineaText = e.linea ?? "Sin línea";
                                  const areaLabel = `${areaText} - ${lineaText} - ${e.nombre}`;
                                  setAreaQuery(areaLabel);
                                  field.onChange(areaLabel);
                                  setCodeQuery(e.codigo);
                                  form.setValue("code", e.codigo);
                                  setShowAreaSuggestions(false);
                                }}
                              >
                                <span className="font-medium">{e.area ?? "Sin área"}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {e.linea ? `${e.linea} • ` : ""}
                                  {e.codigo} • {e.nombre}
                                </span>
                              </button>
                            ))}
                          </>
                        )}

                        {filteredZonas.length > 0 && (
                          <>
                            <div className="mt-1 px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase border-t bg-background">Zonas</div>
                            {filteredZonas.map((z) => (
                              <button
                                type="button"
                                key={z.id}
                                className="flex w-full flex-col items-start px-2 py-1.5 text-left hover:bg-accent"
                                onMouseDown={(ev) => {
                                  ev.preventDefault();
                                  const label = z.area ? `${z.area} - ${z.nombre}` : z.nombre;
                                  setAreaQuery(label);
                                  field.onChange(label);
                                  // También actualizamos el campo Código con el código de la zona (si existe)
                                  const zoneCode = z.codigo || z.nombre;
                                  setCodeQuery(zoneCode);
                                  form.setValue("code", zoneCode);
                                  setShowAreaSuggestions(false);

                                  if (z.tipo === "PARTES_ALTAS") {
                                    form.setValue("schedule", "Partes Altas")
                                  } else if (z.tipo === "LOCATIVO") {
                                    form.setValue("schedule", "Mantenimiento Locativo")
                                  }
                                }}
                              >
                                <span className="font-medium">{z.area ?? "Sin área"}</span>
                                <span className="text-[11px] text-muted-foreground">Zona • {z.nombre}</span>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="frecuencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frecuencia</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin repetición" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ninguna">Sin repetición</SelectItem>
                        <SelectItem value="diaria">Diaria</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensual">Mensual</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="personalizada">Personalizada (cada X días)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch('frecuencia') !== 'ninguna' && (
                <>
                  <FormField
                    control={form.control}
                    name="intervalo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intervalo</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            placeholder=""
                            value={field.value ?? ''}
                            onChange={(e) => {
                              // Guardar el valor tal cual (incluyendo cadena vacía) para permitir borrar todos los dígitos
                              field.onChange(e.target.value)
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                <FormField
  control={form.control}
  name="anticipacionDias"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Generar tarea días antes</FormLabel>
      <FormControl>
        <Input
          type="number"
          min={0}
          max={365}
          placeholder="30"
          value={field.value ?? ''}
          onChange={(e) => {
            const value = e.target.value
            // Permitir cadena vacía para borrar todo
            if (value === '') {
              field.onChange(undefined)
            } else {
              const numValue = Number(value)
              if (!isNaN(numValue)) {
                field.onChange(numValue)
              }
            }
          }}
        />
      </FormControl>
      <FormDescription>
        Cuántos días antes de la fecha de ejecución quieres que la tarea aparezca en el cronograma.
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
                </>
              )}
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => {
                const currentValue = field.value ?? ''
                const showSuggestion =
                  descriptionSuggestion &&
                  currentValue &&
                  descriptionSuggestion.toLowerCase().startsWith(currentValue.toLowerCase()) &&
                  descriptionSuggestion.length > currentValue.length

                const remaining = showSuggestion
                  ? descriptionSuggestion.slice(currentValue.length)
                  : ''

                return (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <div className="w-full space-y-1">
                        <div className="relative w-full">
                          {/* Ghost text overlay */}
                          {showSuggestion && (
                            <div className="pointer-events-none absolute inset-0 whitespace-pre-wrap break-words text-sm text-muted-foreground/60 p-2">
                              <span className="invisible">{currentValue}</span>
                              <span>{remaining}</span>
                            </div>
                          )}
                          <Textarea
                            placeholder="Mantenimiento preventivo trimestral"
                            className="min-h-[40px] resize-y w-full"
                            value={currentValue}
                            onChange={(e) => {
                              field.onChange(e)
                              handleDescriptionChange(e.target.value)
                            }}
                            onKeyDown={(e) => handleDescriptionKeyDown(e, currentValue)}
                          />
                        </div>
                        {showSuggestion && (
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={applyDescriptionSuggestion}
                            >
                              Aplicar sugerencia
                            </Button>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
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
                        {(['Partes Altas', 'Equipo de Medición', 'Mantenimiento Locativo', 'Maquinaria'] as Schedule[]).map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
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
                        {(['Alta', 'Media', 'Baja'] as Priority[]).map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
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
                        <SelectItem value="luis bohorquez">Luis Bohorquez</SelectItem>
                        <SelectItem value="duvan guevara">Duvan Guevara</SelectItem>
                        <SelectItem value="juan david caro">Juan David Caro</SelectItem>
                        <SelectItem value="sergio rubiano">Sergio Rubiano</SelectItem>
                        <SelectItem value="javier morales">Javier Morales</SelectItem>
                        <SelectItem value="Andres">Andres </SelectItem>
                        <SelectItem value="Robayo">Robayo</SelectItem>
                        <SelectItem value="personal-externo">Personal Externo</SelectItem>
                        <SelectItem value="otro">Otro técnico</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage/>
                  </FormItem>
                )}
              />
              {(form.watch("assignedTo") === 'otro' || form.watch("assignedTo") === 'personal-externo') && (
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
                              !field.value && "text-muted-foreground"
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

            {/* Opciones de configuración del recordatorio - visible solo cuando hasAlert es true */}
            {form.watch("hasAlert") && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                <h4 className="font-medium">Configuración de Recordatorio</h4>

                {/* Opciones predefinidas */}
                <FormField
                  control={form.control}
                  name="reminderType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Recordatorio</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un tipo de recordatorio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="predefined">Predefinido (1 día, 3 días, 1 semana antes)</SelectItem>
                          <SelectItem value="custom">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Opciones predefinidas */}
                {form.watch("reminderType") === "predefined" && (
                  <FormField
                    control={form.control}
                    name="predefinedReminders"
                    render={() => (
                      <FormItem>
                        <FormLabel>Recordatorios Predefinidos</FormLabel>
                        <div className="flex flex-col space-y-2">
                          <FormField
                            control={form.control}
                            name="predefinedReminders.0"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>1 semana antes</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="predefinedReminders.1"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>3 días antes</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="predefinedReminders.2"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>1 día antes</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Opción personalizada */}
                {form.watch("reminderType") === "custom" && (
                  <FormField
                    control={form.control}
                    name="customReminderDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha y Hora del Recordatorio</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  <>
                                    {format(field.value, "PPP", { locale: es })} - {format(field.value, "HH:mm")}
                                  </>
                                ) : (
                                  <span>Seleccione fecha y hora</span>
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
                              disabled={(date) =>
                                date.getTime() < new Date().setHours(0, 0, 0, 0) || date > new Date(new Date().setMonth(new Date().getMonth() + 6))
                              }
                              initialFocus
                            />
                            <div className="p-3 border-t border-border">
                              <div className="flex items-center space-x-2">
                                <span>Hora:</span>
                                <Input
                                  type="time"
                                  value={field.value ? format(field.value, "HH:mm") : "09:00"}
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
                )}
              </div>
            )}
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Guardando...' : 'Guardar Tarea'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}