"use client"

import * as React from "react"
import { MoreHorizontal, Wrench, Edit, Trash2, Loader2 } from "lucide-react"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Task, TaskStatus, Schedule, User } from "@/lib/types"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"




interface TaskTableViewProps {
  tasks: Task[];
  users: User[];
  isAdmin: boolean;
  onOpenComplete: (task: Task) => void;
  onOpenEdit: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenSpecs: (task: Task) => void;
  onTaskClick: (task: Task) => void;
  loadingSpecsId?: string | null;
  seenCompletedIds: string[];
  onCompletedSeen: (taskIds: string[]) => void;
}

const statusBadgeStyles: Record<TaskStatus, string> = {
  Completada: "bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-200",
  Pendiente: "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-200",
  Futura: "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-200",
}

const priorityVariant: Record<Task['priority'], "default" | "secondary" | "destructive"> = {
    Alta: "destructive",
    Media: "secondary",
    Baja: "default",
}

function TaskTable({ 
  tasks, 
  isAdmin,
  onOpenComplete, 
  onOpenEdit, 
  onDeleteTask, 
  onOpenSpecs, 
  onTaskClick,
  loadingSpecsId
}: { 
  tasks: Task[], 
  isAdmin: boolean,
  onOpenComplete: (task: Task) => void, 
  onOpenEdit: (task: Task) => void,
  onDeleteTask: (taskId: string) => void,
  onOpenSpecs: (task: Task) => void, 
  onTaskClick: (task: Task) => void,
  loadingSpecsId?: string | null
}) {
  const getExecutedDisplay = (task: Task): { label: string; name?: string } => {
    const executedName = task.executedBy?.name || ""
    if (!executedName) return { label: "-" }
    if (executedName.startsWith("Personal Externo - ")) {
      const externalName = executedName.replace("Personal Externo - ", "").trim()
      return { label: "Personal Externo", name: externalName }
    }
    return { label: executedName }
  }

  if (tasks.length === 0) {
    return (
        <div className="text-center text-muted-foreground py-12">
            <Wrench className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium">No hay labores</h3>
            <p className="mt-1 text-sm text-gray-500">No hay tareas en esta categoría.</p>
        </div>
    )
  }
  return (
    <div className="border rounded-md w-full overflow-x-auto">
        <Table className="w-full">
            <TableHeader>
                <TableRow>
                <TableHead className="w-[100px]">Código</TableHead>
                <TableHead className="w-full sm:w-1/2">Descripción</TableHead>
                <TableHead className="hidden md:table-cell">Estado</TableHead>
                <TableHead className="hidden lg:table-cell">Responsable</TableHead>
                <TableHead className="hidden lg:table-cell">Ejecutado por</TableHead>
                <TableHead className="hidden md:table-cell">Fecha ejecución</TableHead>
                <TableHead className="hidden md:table-cell">Próx. Ejecución</TableHead>
                <TableHead>
                    <span className="sr-only">Acciones</span>
                </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tasks.map(task => (
                <TableRow key={task.id} onClick={() => onTaskClick(task)} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        className="text-primary hover:underline flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSpecs(task);
                        }}
                        disabled={loadingSpecsId === task.id}
                      >
                        {task.code}
                        {loadingSpecsId === task.id && <Loader2 className="h-3 w-3 animate-spin" />}
                      </button>
                    </TableCell>
                    <TableCell className="align-top w-full sm:w-1/2">
                    <button
                      type="button"
                      className="text-left font-medium break-words whitespace-pre-line max-w-[260px] hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSpecs(task);
                      }}
                      disabled={loadingSpecsId === task.id}
                    >
                      {task.description}
                    </button>
                    <div className="text-sm text-muted-foreground">{task.area}</div>
                    {task.frecuencia && task.frecuencia !== 'ninguna' && (
                      <div className="mt-1">
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase tracking-wide bg-[#ff8500] text-white shadow-[0_0_12px_#ff8500] "
                        >
                          Frecuenciada
                        </Badge>
                      </div>
                    )}

                    {/* Resumen compacto solo para pantallas pequeñas */}
                    <div className="mt-1 space-y-1 text-xs text-muted-foreground md:hidden">
                      {(() => {
                        const exec = getExecutedDisplay(task)
                        return (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">Estado:</span>
                              <Badge variant="outline" className={statusBadgeStyles[task.status]}>
                                {task.status === 'Futura' ? 'Próxima' : task.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              <span>
                                <span className="font-medium">Responsable:</span> {task.assignedTo.name}
                              </span>
                              <span>
                                <span className="font-medium">Ejecutado por:</span>{' '}
                                {exec.label === '-' ? '-' : exec.name ? `${exec.label} (${exec.name})` : exec.label}
                              </span>
                            </div>
                          </>
                        )
                      })()}
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          <span className="font-medium">Fecha ejec.:</span>{" "}
                          {task.completionDate ? format(new Date(task.completionDate), "PPP", { locale: es }) : '-'}
                        </span>
                        <span>
                          <span className="font-medium">Próx. ejec.:</span>{" "}
                          {format(new Date(task.nextExecution), "PPP", { locale: es })}
                        </span>
                      </div>
                    </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className={statusBadgeStyles[task.status]}>
                      {task.status === 'Futura' ? 'Próxima' : task.status}
                    </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span>{task.assignedTo.name}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {(() => {
                        const exec = getExecutedDisplay(task)
                        if (exec.label === '-') {
                          return <span className="text-muted-foreground">-</span>
                        }
                        return (
                          <div className="flex flex-col">
                            <span>{exec.label}</span>
                            {exec.name && (
                              <span className="text-xs text-muted-foreground">{exec.name}</span>
                            )}
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {task.completionDate ? (
                        format(new Date(task.completionDate), "PPP", { locale: es })
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{format(new Date(task.nextExecution), "PPP", { locale: es })}</TableCell>
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
                        <DropdownMenuItem onSelect={() => onTaskClick(task)}>
                            Ver Detalles
                        </DropdownMenuItem>
                        {isAdmin && task.status !== 'Completada' && (
                          <DropdownMenuItem onSelect={() => onOpenEdit(task)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar Tarea
                          </DropdownMenuItem>
                        )}
                        {task.status !== 'Completada' && (
                          <DropdownMenuItem onSelect={() => onOpenComplete(task)}>
                            Completar Tarea
                          </DropdownMenuItem>
                        )}
                        {task.equipmentSpecs && (
                          <DropdownMenuItem onSelect={() => onOpenSpecs(task)}>
                            {loadingSpecsId === task.id ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" /> Cargando...
                              </span>
                            ) : (
                              "Ver Ficha Técnica"
                            )}
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive" 
                              onSelect={() => onDeleteTask(task.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  );
}

const schedules: Schedule[] = ['Partes Altas', 'Equipo de Medición', 'Mantenimiento Locativo', 'Maquinaria'];

const scheduleDescriptions: Record<Schedule, string> = {
  'Partes Altas': 'Labores de mantenimiento en zonas elevadas como techos y fachadas.',
  'Equipo de Medición': 'Calibración y verificación de equipos de medición y control.',
  'Mantenimiento Locativo': 'Tareas relacionadas con la infraestructura y las instalaciones.',
  'Maquinaria': 'Mantenimiento preventivo y correctivo de la maquinaria de producción.'
}

function ScheduleTaskList({ schedule, tasks, onCompletedSeen, seenCompletedIds, ...props }: { schedule: Schedule, tasks: Task[], onCompletedSeen: (taskIds: string[]) => void, seenCompletedIds: string[] } & Omit<TaskTableViewProps, 'tasks' | 'onCompletedSeen' | 'seenCompletedIds'>) {
    const tasksByStatus = React.useMemo(() => {
        const grouped: Record<TaskStatus, Task[]> = {
            'Pendiente': [],
            'Futura': [],
            'Completada': [],
        };
        tasks.forEach(task => {
            if (grouped[task.status]) {
                grouped[task.status].push(task);
            }
        });
        return grouped;
    }, [tasks]);

    // Contadores visibles por estado. Permite poner el badge en 0 al abrir la sección.
    const [visibleCounts, setVisibleCounts] = React.useState<Record<TaskStatus, number>>({
      'Pendiente': 0,
      'Futura': 0,
      'Completada': 0,
    });

    // Sincroniza los contadores con las tareas cada vez que cambian.
    React.useEffect(() => {
      const completadasNoVistas = tasksByStatus['Completada'].filter(
        (t) => !seenCompletedIds.includes(t.id)
      );

      setVisibleCounts({
        'Pendiente': tasksByStatus['Pendiente'].length,
        'Futura': tasksByStatus['Futura'].length,
        'Completada': completadasNoVistas.length,
      });
    }, [tasksByStatus, seenCompletedIds]);

    const statusOrder: TaskStatus[] = ['Pendiente', 'Futura', 'Completada'];
    const statusLabels: Record<TaskStatus, string> = {
        'Pendiente': 'Pendientes',
        'Futura': 'Próximas',
        'Completada': 'Completadas',
    };

    const hasTasks = tasks.length > 0;

    return (
         <Card>
            <CardHeader className="px-4 sm:px-7">
                <CardTitle>{schedule}</CardTitle>
                <CardDescription>{scheduleDescriptions[schedule]}</CardDescription>
            </CardHeader>
            <CardContent>
                {hasTasks ? (
                     <Accordion type="multiple" defaultValue={['Pendiente']} className="w-full">
                        {statusOrder.map(status => {
                            const statusTasks = tasksByStatus[status];
                            if (statusTasks.length === 0) return null;
                            const count = visibleCounts[status] ?? statusTasks.length;
                            return (
                                <AccordionItem value={status} key={status}>
                                    <AccordionTrigger
                                      className="text-base font-medium"
                                      onClick={() => {
                                        // Al abrir esta sección, limpiar el contador para ese estado
                                        setVisibleCounts((prev) => ({
                                          ...prev,
                                          [status]: 0,
                                        }));

                                        // Si es la sección de completadas, marcar estas tareas como vistas
                                        if (status === 'Completada' && statusTasks.length > 0) {
                                          const ids = statusTasks.map((t) => t.id);
                                          onCompletedSeen(ids);
                                        }
                                      }}
                                    >
                                        <div className="flex items-center gap-2">
                                            {statusLabels[status]}
                                            <Badge variant="secondary">{count}</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <TaskTable tasks={statusTasks} {...props} />
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                    </Accordion>
                ) : (
                    <div className="text-center text-muted-foreground py-12">
                        <Wrench className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium">No hay labores</h3>
                        <p className="mt-1 text-sm text-gray-500">No hay tareas para este cronograma.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function TaskTableView({ tasks, seenCompletedIds, onCompletedSeen, ...props }: TaskTableViewProps) {
  const tasksBySchedule = React.useMemo(() => {
    const grouped: Record<Schedule, Task[]> = {
      'Partes Altas': [],
      'Equipo de Medición': [],
      'Mantenimiento Locativo': [],
      'Maquinaria': [],
    };
    tasks.forEach(task => {
      if (grouped[task.schedule]) {
        grouped[task.schedule].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  // Contadores visibles por cronograma (tabs). Se ponen en 0 al abrir la pestaña.
  const [visibleScheduleCounts, setVisibleScheduleCounts] = React.useState<Record<Schedule, number>>({
    'Partes Altas': 0,
    'Equipo de Medición': 0,
    'Mantenimiento Locativo': 0,
    'Maquinaria': 0,
  });

  React.useEffect(() => {
    // Para cada cronograma, contamos solo las tareas que NO están completadas y vistas
    const counts: Record<Schedule, number> = {
      'Partes Altas': 0,
      'Equipo de Medición': 0,
      'Mantenimiento Locativo': 0,
      'Maquinaria': 0,
    };

    (Object.keys(tasksBySchedule) as Schedule[]).forEach((schedule) => {
      const tasksForSchedule = tasksBySchedule[schedule] || [];
      counts[schedule] = tasksForSchedule.filter((t) => {
        if (t.status === 'Completada') {
          return !seenCompletedIds.includes(t.id);
        }
        return true;
      }).length;
    });

    setVisibleScheduleCounts(counts);
  }, [tasksBySchedule, seenCompletedIds]);

  return (
        <Tabs defaultValue="Maquinaria" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-1 sm:gap-0">
            {schedules.map(schedule => (
                <TabsTrigger
                  key={schedule}
                  value={schedule}
                  className="w-full"
                  onClick={() => {
                    // Al abrir este cronograma, limpiar su contador visual
                    setVisibleScheduleCounts((prev) => ({
                      ...prev,
                      [schedule]: 0,
                    }));
                  }}
                >
                    {schedule}
                    <Badge variant="secondary" className="ml-2">{visibleScheduleCounts[schedule] ?? tasksBySchedule[schedule].length}</Badge>
                </TabsTrigger>
            ))}
          </TabsList>
          
          {schedules.map(schedule => (
            <TabsContent key={schedule} value={schedule} className="mt-6 space-y-6">
              <ScheduleTaskList 
                schedule={schedule}
                tasks={tasksBySchedule[schedule]} 
                seenCompletedIds={seenCompletedIds}
                onCompletedSeen={onCompletedSeen}
                {...props}
              />
            </TabsContent>
          ))}
        </Tabs>
  )
}