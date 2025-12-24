"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, List, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useRouter, useSearchParams } from "next/navigation";
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddTaskDialog } from './add-task-dialog';
import { EditTaskDialog } from './edit-task-dialog' // ✅ Agregar esta importación
import { TaskCalendarView } from './task-calendar-view';
import { TaskTableView } from './task-table-view';
import { TaskDetailsDialog } from './task-details-dialog';
import { CompleteTaskDialog } from './complete-task-dialog';
import { EquipmentInfoDialog } from './equipment-info-dialog';
import type { Task, User, Schedule, Notification } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { 
  mapDatabaseTaskToFrontend, 
  fetchTasksFromDB, 
  completeTaskInDB, 
  deleteTaskInDB
} from '@/lib/task-utils';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import { useNotifications } from '@/hooks/use-notifications';
import { useDashboardSearch, SearchSuggestion } from '@/context/dashboard-search-context';

type ViewMode = 'calendar' | 'table';

const schedules: Schedule[] = ['Partes Altas', 'Equipo de Medición', 'Mantenimiento Locativo', 'Maquinaria'];

interface TasksPageClientProps {
  initialTasks: Task[];
  users: User[];
}

export default function TasksPageClient({ initialTasks, users }: TasksPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedTaskId = searchParams.get("selectedTaskId");

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule>('Maquinaria');
  
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false); // ✅ Agregar este estado
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const { toast } = useToast();
  const { markTasksCompletedAsRead, addNotification, permission } = useNotifications();

  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [seenCompletedIds, setSeenCompletedIds] = useState<string[]>([]);
  const [allTasksForSearch, setAllTasksForSearch] = useState<Task[]>([]);

  // Búsqueda global desde el header
  const { query, setSuggestions } = useDashboardSearch();
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      setCheckingAdmin(true);
      const email = user?.email?.toLowerCase().trim();
      setUserEmail(email || null);

      try {
        if (user) {
          // Validar rol desde backend para mayor seguridad
          const response = await fetch('/api/auth/role', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.email,
              uid: user.uid,
            }),
          });

          if (response.ok) {
            const roleData = await response.json();
            if (mounted) setIsAdmin(roleData.isAdmin);
          } else {
            // Fallback a verificación local si la API falla
            if (email) {
              const adminEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
                .split(',')
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean);

              const isEnvAdmin = adminEnv.includes(email);
              if (mounted) setIsAdmin(isEnvAdmin);
            } else {
              if (mounted) setIsAdmin(false);
            }
          }
        } else {
          if (mounted) setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error verificando rol de usuario:', error);
        // Fallback seguro
        if (email) {
          const adminEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);

          const isEnvAdmin = adminEnv.includes(email);
          if (mounted) setIsAdmin(isEnvAdmin);
        } else {
          if (mounted) setIsAdmin(false);
        }
      } finally {
        if (mounted) setCheckingAdmin(false);
      }
    }

    if (user) {
      checkAdmin();
    } else {
      setCheckingAdmin(false);
      setIsAdmin(false);
      setUserEmail(null);
    }
    
    return () => {
      mounted = false;
    };
  }, [user]);

  console.log('USER EMAIL EN TASKS:', userEmail, 'isAdmin:', isAdmin);

  // Cargar TODAS las tareas para el buscador global (sin filtrar por cronograma)
  useEffect(() => {
    if (!userEmail) return;
    const loadAllTasks = async () => {
      try {
        // Pasamos undefined como schedule para obtener todas las tareas
        const dbTasks = await fetchTasksFromDB(undefined, userEmail);
        const mappedTasks = dbTasks.map(dbTask => 
          mapDatabaseTaskToFrontend(dbTask, users)
        );
        setAllTasksForSearch(mappedTasks);
      } catch (error) {
        console.error('Error loading all tasks for search:', error);
      }
    };
    loadAllTasks();
  }, [userEmail, users]);

  // Registrar sugerencias globales para tareas (código + descripción)
  useEffect(() => {
    const source = allTasksForSearch.length > 0 ? allTasksForSearch : tasks;
    const items: SearchSuggestion[] = source.map((t) => ({
      id: t.id,
      label: `${t.code} - ${t.description}`,
      type: 'task',
      route: `/dashboard/tasks?selectedTaskId=${t.id}`,
    }));
    setSuggestions((prev) => {
      const others = prev.filter((s) => s.type !== "task");
      return [...others, ...items];
    });
  }, [tasks, allTasksForSearch, setSuggestions]);

  // Manejar selección de tarea desde el buscador global (Navegación y apertura automática)
  useEffect(() => {
    if (!selectedTaskId) return;
    // Esperar a que carguen todas las tareas para buscar la seleccionada
    if (allTasksForSearch.length === 0) return;

    const task = allTasksForSearch.find((t) => t.id === selectedTaskId);
    if (task) {
      // 1. Cambiar al cronograma correcto si es necesario (ej. Partes Altas)
      if (selectedSchedule !== task.schedule) {
        setSelectedSchedule(task.schedule);
      }
      // 2. Abrir el modal de detalles
      handleOpenDetails(task);

      // 3. Limpiar la URL para que no se vuelva a abrir al recargar
      const params = new URLSearchParams(window.location.search);
      params.delete('selectedTaskId');
      const newUrl = params.toString() ? `/dashboard/tasks?${params.toString()}` : '/dashboard/tasks';
      window.history.replaceState(null, '', newUrl);
    }
  }, [selectedTaskId, allTasksForSearch, selectedSchedule]);

  // Función para cargar tareas desde la BD
  const loadTasks = async (schedule?: string) => {
    setIsLoading(true);
    try {
      const dbTasks = await fetchTasksFromDB(schedule, userEmail);
      const mappedTasks = dbTasks.map(dbTask => 
        mapDatabaseTaskToFrontend(dbTask, users)
      );
      setTasks(mappedTasks);

      // Marcar como leídas las notificaciones de tareas que ya estén completadas
      const completedIds = mappedTasks
        .filter(t => t.status === 'Completada')
        .map(t => t.id);
      markTasksCompletedAsRead(completedIds);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las tareas",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar tareas al cambiar de pestaña, solo cuando ya tenemos userEmail
  useEffect(() => {
    if (!userEmail) return;
    loadTasks(selectedSchedule);
  }, [selectedSchedule, userEmail]);

  // Cargar IDs de tareas completadas ya vistas para este usuario
  useEffect(() => {
    if (!userEmail) return;

    const fetchSeen = async () => {
      try {
        const res = await fetch(`/api/tareas/vistas?userEmail=${encodeURIComponent(userEmail)}`);
        if (!res.ok) return;
        const result = await res.json();
        const ids: (number | string)[] = result.data || [];
        setSeenCompletedIds(ids.map((id) => id.toString()));
      } catch (e) {
        console.error('Error fetching seen completed tasks:', e);
      }
    };

    fetchSeen();
  }, [userEmail]);

  const handleOpenDetails = (task: Task) => {
    setSelectedTask(task);
    setIsDetailsOpen(true);
  };
  
  const handleOpenComplete = (task: Task) => {
    setSelectedTask(task);
    setIsCompleteOpen(true);
  };

  // ✅ Agregar esta función
  const handleOpenEdit = (task: Task) => {
    setSelectedTask(task);
    setIsEditTaskOpen(true);
  };

  // ✅ Agregar esta función
  const handleDeleteTask = async (taskId: string) => {
    try {
      const success = await deleteTaskInDB(taskId);

      if (success) {
        // Actualizar el estado local
        setTasks(prev => prev.filter(task => task.id !== taskId));
        setDeleteTarget(null);
        
        toast({
          title: "Tarea eliminada",
          description: "La tarea se ha eliminado correctamente.",
        });
      } else {
        throw new Error('Error al eliminar en la BD');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la tarea",
        variant: "destructive"
      });
    }
  };
  
  const handleOpenSpecs = (task: Task) => {
    // Abrir siempre el modal de ficha técnica, aunque no haya equipmentSpecs.
    // Si no hay datos, el diálogo simplemente mostrará una tabla vacía.
    setSelectedTask(task);
    setIsSpecsOpen(true);
  };

  const handleAddTask = async (newTask: Omit<Task, 'id' | 'status'>) => {
    try {
      // Recargar las tareas después de agregar una nueva
      await loadTasks(selectedSchedule);
      toast({
        title: "Tarea agregada",
        description: "La tarea se ha guardado correctamente",
      });
    } catch (error) {
      console.error('Error refreshing tasks after add:', error);
    }
  };

  // Al editar una tarea, recargar siempre desde la BD para reflejar todos los cambios
  const handleEditTask = async (updatedTask: Task) => {
    await loadTasks(selectedSchedule);

    toast({
      title: "Tarea actualizada",
      description: `La tarea ${updatedTask.code} se ha actualizado correctamente.`,
    });

    setIsEditTaskOpen(false);
    setSelectedTask(null);
  };

  // Marcar tareas completadas como "vistas" para este usuario
  const handleCompletedSeen = async (taskIds: string[]) => {
    try {
      // Si no tenemos email del usuario, no hacemos nada
      if (!userEmail) return;

      await fetch('/api/tareas/vistas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          taskIds,
        }),
      });

      // Actualizar estado local para que los contadores dejen de contar estas tareas
      setSeenCompletedIds((prev) => {
        const set = new Set(prev);
        taskIds.forEach((id) => set.add(id.toString()));
        return Array.from(set);
      });
    } catch (error) {
      console.error('Error marcando tareas como vistas:', error);
    }
  };
  
  const handleCompleteTask = async (
    taskId: string,
    workDone: string,
    executedBy: User,
    imageUrlBefore?: string,
    imageUrlAfter?: string,
    tipoMantenimiento?: string,
    repuestos?: string,
    observaciones?: string,
  ) => {
    try {
      const success = await completeTaskInDB(
        taskId, 
        workDone, 
        executedBy.name,
        imageUrlBefore,
        imageUrlAfter
      );

      if (success) {
        const completionIso = new Date().toISOString();


        // Actualizar el estado local
        setTasks(prev => prev.map(task => 
          task.id === taskId 
            ? { 
                ...task, 
                status: 'Completada', 
                workDone, 
                executedBy,
                completionDate: completionIso,
                imageUrlBefore,
                imageUrlAfter
              }
            : task
        ));

        // Marcar inmediatamente como leída la notificación de esta tarea completada
        markTasksCompletedAsRead([taskId]);

                // Crear notificación por tarea completada
        try {
          const baseTask = selectedTask || tasks.find(t => t.id === taskId) || null

         const notif: Notification = {
  id: `task-completed-${taskId}-${Date.now()}`,
  title: `Tarea completada en ${baseTask?.area ?? 'Área sin nombre'}`,
  message: `Equipo: ${baseTask?.code ?? ''}\nEjecutado por: ${executedBy.name}`,
  type: "task_alert",
  severity: "info",
  createdAt: new Date().toISOString(),
  read: false,
  refId: taskId,
  status: "Completada",
}

          addNotification(notif)

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
          console.warn("No se pudo crear la notificación de tarea completada", e)
        }
        
      

            // Registrar evento en equipos_historial (BD) solo para tareas de equipos
        try {
          const baseTask = selectedTask || tasks.find(t => t.id === taskId) || null;
          const isEquipoSchedule =
            baseTask && (baseTask.schedule === 'Maquinaria' || baseTask.schedule === 'Equipo de Medición');
          
          const numericTaskId = parseInt(taskId, 10);

          if (baseTask && isEquipoSchedule && baseTask.code && !isNaN(numericTaskId)) {
            await fetch('/api/equipos/historial', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                codigoEquipo: baseTask.code,            // referencia a equipos(codigo)
                tareaId: numericTaskId,                 // referencia a tareas_cronograma(id)
                fechaEvento: completionIso,             // fecha_evento
                labor: workDone,                        // trabajo realizado
                tipoMantenimiento: tipoMantenimiento,   // tipo_mantenimiento
                repuestosUsados: repuestos,             // repuestos_usados
                observaciones: observaciones,           // observaciones
                ejecutadoPor: executedBy.name,          // ejecutado_por
                creadoPor: userEmail || null,           // creado_por (email del usuario actual)
              }),
            });
          }
        } catch (e) {
          console.warn('No se pudo registrar la tarea en equipos_historial', e);
        }

           
        // Registrar evento en zonas_historial (BD) para tareas asociadas a zonas
        try {
          const baseTaskForZona = selectedTask || tasks.find(t => t.id === taskId) || null;
          const numericTaskId = parseInt(taskId, 10);

          if (baseTaskForZona && baseTaskForZona.code && !isNaN(numericTaskId)) {
            await fetch('/api/zonas/historial', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                codigoZona: baseTaskForZona.code,      // referencia a zonas(codigo)
                tareaId: numericTaskId,                // referencia a tareas_cronograma(id)
                fechaEvento: completionIso,            // fecha_evento
                labor: workDone,                       // trabajo realizado
                tipoMantenimiento: tipoMantenimiento,  // tipo_mantenimiento
                repuestosUsados: repuestos,            // repuestos_usados
                observaciones: observaciones,          // observaciones
                ejecutadoPor: executedBy.name,         // ejecutado_por
                creadoPor: userEmail || null,          // creado_por (email del usuario actual)
              }),
            });
          }
        } catch (e) {
          console.warn('No se pudo registrar la tarea en zonas_historial', e);
        }

        toast({
          title: "Tarea completada",
          description: `La tarea ${selectedTask?.code} ha sido marcada como completada.`,
        });
        
        setIsCompleteOpen(false);
        setSelectedTask(null);
      } else {
        throw new Error('Error al guardar en la BD');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la tarea",
        variant: "destructive"
      });
    }
  };

  // Aplicar filtro de búsqueda a todas las tareas visibles
  const visibleTasks = useMemo(() => {
    if (!normalizedQuery) return tasks;

    return tasks.filter((t) => {
      const haystack = [
        t.code,
        t.description,
        t.area,
        t.assignedTo?.name,
        t.executedBy?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [tasks, normalizedQuery]);

  const tasksBySchedule = useMemo(() => {
    const grouped: Record<Schedule, Task[]> = {
      'Partes Altas': [],
      'Equipo de Medición': [],
      'Mantenimiento Locativo': [],
      'Maquinaria': [],
    };
    visibleTasks.forEach(task => {
      if (grouped[task.schedule]) {
        grouped[task.schedule].push(task);
      }
    });
    return grouped;
  }, [visibleTasks]);

  const sortedTasks = useMemo(() => {
    return [...visibleTasks].sort(
      (a, b) => new Date(a.nextExecution).getTime() - new Date(b.nextExecution).getTime()
    );
  }, [visibleTasks]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestor de Tareas</h1>
          <p className="text-sm text-muted-foreground">
             {visibleTasks.filter(t => t.status !== 'Completada').length} tareas encontradas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={(value: ViewMode) => value && setViewMode(value)}>
            <ToggleGroupItem value="calendar" aria-label="Vista de calendario">
              <Calendar className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Vista de tabla">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button 
            variant="outline" 
            onClick={() => loadTasks(selectedSchedule)}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          {isAdmin && (
            <Button onClick={() => setIsAddTaskOpen(true)}>Agregar Nueva Labor</Button>
          )}
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <Card>
          <CardContent className="p-0 sm:p-6">
            <Tabs 
              defaultValue="Maquinaria" 
              value={selectedSchedule}
              onValueChange={(value) => setSelectedSchedule(value as Schedule)}
            >
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-4 h-auto">
                {schedules.map(schedule => {
                  const totalNoCompletadas = (tasksBySchedule[schedule] || []).filter(
                    (t) => t.status !== 'Completada'
                  ).length;

                  return (
                    <TabsTrigger key={schedule} value={schedule} className="w-full">
                      {schedule}
                      <span className="ml-2 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full text-xs">
                        {totalNoCompletadas}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              
              {schedules.map(schedule => (
                <TabsContent key={schedule} value={schedule} className="mt-4">
                    <TaskCalendarView 
                      tasks={tasksBySchedule[schedule]} 
                      onTaskClick={handleOpenDetails}
                    />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <TaskTableView 
          tasks={sortedTasks}
          users={users}
          isAdmin={isAdmin}
          onOpenComplete={handleOpenComplete}
          onOpenEdit={handleOpenEdit} // ✅ Agregar esta prop
          onDeleteTask={handleDeleteTask} // ✅ Agregar esta prop
          onOpenSpecs={handleOpenSpecs}
          onTaskClick={handleOpenDetails}
          seenCompletedIds={seenCompletedIds}
          onCompletedSeen={handleCompletedSeen}
        />
      )}

      <AddTaskDialog
        isOpen={isAddTaskOpen}
        setIsOpen={setIsAddTaskOpen}
        onAddTask={handleAddTask}
        users={users}
      />
      
      {selectedTask && (
        <>
          <TaskDetailsDialog
            isOpen={isDetailsOpen}
            setIsOpen={setIsDetailsOpen}
            task={selectedTask}
            isAdmin={isAdmin}
            onOpenComplete={handleOpenComplete}
            onOpenEdit={handleOpenEdit} 
            onOpenSpecs={handleOpenSpecs}
          />
          
          <EditTaskDialog
            isOpen={isEditTaskOpen}
            setIsOpen={setIsEditTaskOpen}
            task={selectedTask}
            users={users}
            onEditTask={handleEditTask}
          />
          
          <CompleteTaskDialog
            isOpen={isCompleteOpen}
            setIsOpen={setIsCompleteOpen}
            task={selectedTask}
            users={users}
            onComplete={handleCompleteTask}
          />
          
          <EquipmentInfoDialog
            isOpen={isSpecsOpen}
            setIsOpen={setIsSpecsOpen}
            task={selectedTask}
          />
        </>
      )}

      {deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar tarea</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              ¿Estás seguro de que quieres eliminar la tarea
              {" "}
              <span className="font-medium">
                {deleteTarget.code} - {deleteTarget.description}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                type="button"
                onClick={() => handleDeleteTask(deleteTarget.id)}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}