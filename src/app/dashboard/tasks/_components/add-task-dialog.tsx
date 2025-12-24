"use client"

import { useEffect, useMemo, useState } from "react"
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
import type { Task, User, Schedule, Priority, Notification } from "@/lib/types"
import { useNotifications } from "@/hooks/use-notifications"
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

interface AddTaskDialogProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  onAddTask: (task: Omit<Task, 'id' | 'status'>) => void
  users: User[]
}

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
    },
  })

  type EquipmentLookup = { codigo: string; nombre: string; area?: string | null; linea?: string | null }
  type ZonaLookup = { id: string; codigo: string | null; nombre: string; area: string | null; tipo: string }

  const [equipos, setEquipos] = useState<EquipmentLookup[]>([])
  const [zonas, setZonas] = useState<ZonaLookup[]>([])
  const [codeQuery, setCodeQuery] = useState("")
  const [areaQuery, setAreaQuery] = useState("")
  const [showCodeSuggestions, setShowCodeSuggestions] = useState(false)
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false)

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
    // Extraer código y área si vienen del autocomplete
    const rawCode = data.code?.trim() || "";
    const area = data.area;

    // Verificar si el código corresponde a un equipo existente
    const matchedEquipo = equipos.find((e) => e.codigo === rawCode);

    // Verificar si el código corresponde a una zona conocida
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

    // Si es un equipo conocido, usamos su código; si no, mandamos null para no romper la FK
    const codigoEquipoForDB = matchedEquipo ? matchedEquipo.codigo : null;

    // Si no es equipo pero sí es una zona conocida, guardamos el código de la zona aparte
    const codigoZonaForDB = !matchedEquipo && matchedZona ? (matchedZona.codigo || matchedZona.nombre) : null;

    // Preparar datos para la base de datos
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
      responsable: data.assignedTo === 'otro' ? data.customAssignedTo : data.assignedTo,
      tiene_alerta: data.hasAlert
    };

    console.log('Enviando tarea a la BD:', tareaData);

    // Guardar en la base de datos
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

    const nuevaTarea = await response.json();

    // Crear notificación interna para la nueva tarea
    try {
      const baseNotif: Omit<Notification, "id" | "createdAt"> = {
        title: `Nueva tarea en ${data.area || 'Área sin nombre'}`,
        message: `Equipo: ${data.code || 'Sin código'}\nDescripción: ${data.description}`,
        type: "task_alert",
        severity:
          data.priority === "Alta"
            ? "critical"
            : data.priority === "Media"
            ? "warning"
            : "info",
        read: false,
        refId: nuevaTarea.id ?? undefined,
        status: data.nextExecution > new Date() ? "Futura" : "Pendiente",
      }

      // Guardar notificación en la BD y usar el id real devuelto
      let finalNotif: Notification | null = null
      try {
        const resNotif = await fetch('/api/notificaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titulo: baseNotif.title,
            mensaje: baseNotif.message,
            tipo: baseNotif.type,
            severidad: baseNotif.severity,
            estado_tarea: baseNotif.status,
            prioridad: data.priority,
            ref_task_id: nuevaTarea.id ?? null,
          }),
        })

        if (resNotif.ok) {
          const jsonNotif = await resNotif.json()
          const saved = jsonNotif.data
          finalNotif = {
            id: String(saved.id),
            title: baseNotif.title,
            message: baseNotif.message,
            type: baseNotif.type,
            severity: baseNotif.severity,
            createdAt: new Date(saved.creado_en).toISOString(),
            read: false,
            refId: String(saved.ref_task_id ?? baseNotif.refId ?? ""),
            status: baseNotif.status,
          }
        }
      } catch (e) {
        console.warn('No se pudo guardar la notificación en BD', e)
      }

      // Fallback en caso de que falle la BD
      const notif: Notification =
        finalNotif ?? {
          id: `task-created-${nuevaTarea.id ?? Date.now()}`,
          title: baseNotif.title,
          message: baseNotif.message,
          type: baseNotif.type,
          severity: baseNotif.severity,
          createdAt: new Date().toISOString(),
          read: false,
          refId: baseNotif.refId,
          status: baseNotif.status,
        }

      // Actualizar contexto en memoria
      addNotification(notif)

      // Notificación del navegador (si el usuario la permitió)
      if (
        permission === "granted" &&
        typeof window !== "undefined" &&
        "Notification" in window
      ) {
        new Notification(notif.title, {
          body: notif.message,
        })
      }
    } catch (e) {
      console.warn("No se pudo crear la notificación de nueva tarea", e)
    }

    // Preparar un usuario asignado para el frontend (si no se encuentra en "users", usar fallback)
    let assignedToUser = users.find(u => u.id === data.assignedTo)
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

    onAddTask({
      code: data.code ?? '',
      area: data.area ?? '',
      description: data.description ?? '',
      schedule: data.schedule,
      priority: data.priority,
      assignedTo: finalAssignedTo,
      nextExecution: data.nextExecution.toISOString(),
      hasAlert: data.hasAlert,
    })

    setIsOpen(false)
    form.reset()
    setCodeQuery("")
    setAreaQuery("")

  } catch (error) {
    console.error('Error guardando tarea:', error);
    // Puedes agregar un toast de error aquí si quieres
  }
}

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                        }}
                        onFocus={() => {
                          if (codeQuery) setShowCodeSuggestions(true)
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowCodeSuggestions(false), 150)
                        }}
                      />
                    </FormControl>
                    {showCodeSuggestions && (filteredByCode.length > 0 || filteredZonasByCode.length > 0) && (
                      <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover text-xs shadow-md">
                        {filteredByCode.length > 0 && (
                          <>
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Equipos</div>
                            {filteredByCode.map((e) => (
                              <button
                                type="button"
                                key={e.codigo}
                                className="flex w-full flex-col items-start px-2 py-1.5 text-left hover:bg-accent"
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
                                }}
                              >
                                <span className="font-medium">{e.codigo}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {e.area ?? "Sin área"}
                                  {e.linea ? ` • ${e.linea}` : ""}
                                  {` • ${e.nombre}`}
                                </span>
                              </button>
                            ))}
                          </>
                        )}

                        {filteredZonasByCode.length > 0 && (
                          <>
                            <div className="mt-1 px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase border-t bg-background">Zonas</div>
                            {filteredZonasByCode.map((z) => (
                              <button
                                type="button"
                                key={z.id}
                                className="flex w-full flex-col items-start px-2 py-1.5 text-left hover:bg-accent"
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
                            ))}
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
                    <FormLabel>Área/Equipo/zona</FormLabel>
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
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Mantenimiento preventivo trimestral"
                      className="min-h-[40px] resize-y w-full sm:w-1/2"
                      {...field}
                    />
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
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
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
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
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
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit">Guardar Tarea</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
