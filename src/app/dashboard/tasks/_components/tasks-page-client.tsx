"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, List, RefreshCw, BarChart, Download, FileSpreadsheet, FileText, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useRouter, useSearchParams } from "next/navigation";
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddTaskDialog } from './add-task-dialog';
import { EditTaskDialog } from './edit-task-dialog';
import { TaskCalendarView } from './task-calendar-view';
import { TaskTableView } from './task-table-view';
import { TaskAnalytics } from './task-analytics';
import { TaskDetailsDialog } from './task-details-dialog';
import { CompleteTaskDialog } from './complete-task-dialog';
import { EquipmentInfoDialog } from './equipment-info-dialog';
import type { Task, User, Schedule, Notification } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { mapDatabaseTaskToFrontend, fetchTasksFromDB, completeTaskInDB, deleteTaskInDB } from '@/lib/task-utils';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import { useNotificationsContext as useNotifications } from '@/context/notifications-context';
import { useDashboardSearch, SearchSuggestion } from '@/context/dashboard-search-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { exportToExcel, exportToPDF, exportToWord } from "@/lib/export-utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type ViewMode = 'calendar' | 'table' | 'analytics';
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
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);
  const [loadingSpecsId, setLoadingSpecsId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const { toast } = useToast();
  const { markTasksCompletedAsRead, addNotification, permission, requestPermission } = useNotifications();
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [seenCompletedIds, setSeenCompletedIds] = useState<string[]>([]);
  const [allTasksForSearch, setAllTasksForSearch] = useState<Task[]>([]);
  const [alertedTasks, setAlertedTasks] = useState<Set<string>>(new Set());

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
          const response = await fetch('/api/auth/role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, uid: user.uid }),
          });
          if (response.ok) {
            const roleData = await response.json();
            if (mounted) setIsAdmin(roleData.isAdmin);
          } else {
            if (email) {
              const adminEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
                .split(',')
                .map(s => s.trim().toLowerCase())
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
        if (email) {
          const adminEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
            .split(',')
            .map(s => s.trim().toLowerCase())
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
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    if (!userEmail) return;
    const loadAllTasks = async () => {
      try {
        const dbTasks = await fetchTasksFromDB(undefined, userEmail);
        const mappedTasks = dbTasks.map(dbTask => mapDatabaseTaskToFrontend(dbTask, users));
        setAllTasksForSearch(mappedTasks);
      } catch (error) {
        console.error('Error loading all tasks for search:', error);
      }
    };
    loadAllTasks();
  }, [userEmail, users]);

  useEffect(() => {
    const checkDueTasks = async () => {
      const now = new Date();
      const tasksToAlert = tasks.filter(task => {
        if (task.status === 'Completada' || !task.hasAlert || alertedTasks.has(task.id)) return false;
        const taskDate = new Date(task.nextExecution);
        const diff = taskDate.getTime() - now.getTime();
        return diff <= 60000 && diff >= -60000;
      });

      for (const task of tasksToAlert) {
        const taskDate = new Date(task.nextExecution);
        let savedId = `alert-${task.id}-${Date.now()}`;
        let severity = "info";
        if (task.priority === "Alta") severity = "critical";
        else if (task.priority === "Media") severity = "warning";

        try {
          const res = await fetch('/api/notificaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              titulo: `Recordatorio de Tarea`,
              mensaje: `La tarea ${task.code} está programada para ${taskDate.toLocaleTimeString()}`,
              tipo: "task_alert",
              severidad: severity,
              estado_tarea: task.status,
              prioridad: task.priority,
              ref_task_id: task.id,
            }),
          });
          if (res.ok) {
            const json = await res.json();
            if (json.data?.id) savedId = String(json.data.id);
          }
        } catch (e) {
          console.error("Error guardando notificación de alerta", e);
        }

        const notif: Notification = {
          id: savedId,
          title: `Recordatorio de Tarea`,
          message: `La tarea ${task.code} está programada para ${taskDate.toLocaleTimeString()}`,
          type: "task_alert",
          severity: severity,
          createdAt: new Date().toISOString(),
          read: false,
          refId: task.id,
          status: task.status,
          priority: task.priority
        } as any;

        addNotification(notif);

        if (permission === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
          const browserNotif = new Notification(notif.title, {
            body: notif.message,
            tag: savedId,
            data: { url: `${window.location.origin}/dashboard/tasks?selectedTaskId=${task.id}` }
          });
          browserNotif.onclick = (event) => {
            event.preventDefault();
            window.focus();
            if (browserNotif.data?.url) {
              window.location.href = browserNotif.data.url;
            }
          };
        }

        setAlertedTasks(prev => {
          const newSet = new Set(prev);
          newSet.add(task.id);
          return newSet;
        });
      }
    };

    const interval = setInterval(checkDueTasks, 30000);
    return () => clearInterval(interval);
  }, [tasks, alertedTasks, addNotification, permission]);

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

  useEffect(() => {
    if (!selectedTaskId) return;
    if (allTasksForSearch.length === 0) return;
    const task = allTasksForSearch.find((t) => t.id === selectedTaskId);
    if (task) {
      if (selectedSchedule !== task.schedule) {
        setSelectedSchedule(task.schedule);
      }
      setSelectedTask(task);
      setIsDetailsOpen(true);

      const params = new URLSearchParams(window.location.search);
      params.delete('selectedTaskId');
      const newUrl = params.toString() ? `/dashboard/tasks?${params.toString()}` : '/dashboard/tasks';
      window.history.replaceState(null, '', newUrl);
    }
  }, [selectedTaskId, allTasksForSearch, selectedSchedule]);

  const loadTasks = async (schedule?: string) => {
    setIsLoading(true);
    try {
      const dbTasks = await fetchTasksFromDB(schedule, userEmail);
      const mappedTasks = dbTasks.map(dbTask => mapDatabaseTaskToFrontend(dbTask, users));
      setTasks(mappedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({ title: "Error", description: "No se pudieron cargar las tareas", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userEmail) return;
    loadTasks(selectedSchedule);
  }, [selectedSchedule, userEmail]);

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

  const handleOpenEdit = (task: Task) => {
    setSelectedTask(task);
    setIsEditTaskOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const success = await deleteTaskInDB(taskId);
      if (success) {
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
      toast({ title: "Error", description: "No se pudo eliminar la tarea", variant: "destructive" });
    }
  };

  const handleOpenSpecs = (task: Task) => {
    setSelectedTask(task);
    setIsSpecsOpen(true);
  };

  const handleAddTask = async (newTask: Task) => {
    try {
      await loadTasks(selectedSchedule);
      let severity = "info";
      if (newTask.priority === "Alta") severity = "critical";
      else if (newTask.priority === "Media") severity = "warning";

      // Determinar el estado correcto para la notificación
      const executionDate = new Date(newTask.nextExecution);
      const today = new Date();
      const taskStatus: Task['status'] = executionDate > today ? 'Futura' : 'Pendiente';

      const baseNotif: Omit<Notification, "id" | "createdAt"> = {
        title: `Nueva Tarea: ${newTask.code ?? ''} - ${newTask.area ?? ''}`,
        message: `Responsable: ${newTask.assignedTo?.name ?? 'Sin asignar'}\nFecha: ${new Date(newTask.nextExecution).toLocaleString()}\nPrioridad: ${newTask.priority ?? ''}\nDescripción: ${newTask.description ?? ''}`,
        type: "task_alert",
        severity: severity,
        read: false,
        refId: newTask.id,
        status: taskStatus,
        priority: newTask.priority,
      } as any;

      const notif: Notification = {
        id: `new-task-${newTask.id}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        ...baseNotif
      } as any;

      addNotification(notif);

      // Solicitar permiso si está en 'default' (usuario aún no ha decidido)
      let currentPermission = permission;
      if (currentPermission === 'default' && typeof window !== 'undefined' && 'Notification' in window) {
        currentPermission = await requestPermission();
      }

      if (currentPermission === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
        const browserNotif = new Notification(baseNotif.title, {
          body: baseNotif.message,
          tag: `new-task-${newTask.id}`,
          data: { url: `${window.location.origin}/dashboard/tasks?selectedTaskId=${newTask.id}` }
        });
        browserNotif.onclick = (event) => {
          event.preventDefault();
          window.focus();
          if (browserNotif.data?.url) window.location.href = browserNotif.data.url;
        };
      }

      toast({
        title: "Tarea agregada",
        description: "La tarea se ha guardado correctamente",
      });
    } catch (error) {
      console.error('Error refreshing tasks after add:', error);
    }
  };

  const handleEditTask = async (updatedTask: Task) => {
    await loadTasks(selectedSchedule);
    setAlertedTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(updatedTask.id);
      return newSet;
    });
    toast({
      title: "Tarea actualizada",
      description: `La tarea ${updatedTask.code} se ha actualizado correctamente.`,
    });
    setIsEditTaskOpen(false);
    setSelectedTask(null);
  };

  const handleCompletedSeen = async (taskIds: string[]) => {
    try {
      if (!userEmail) return;
      await fetch('/api/tareas/vistas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, taskIds }),
      });
      setSeenCompletedIds((prev) => {
        const set = new Set(prev);
        taskIds.forEach((id) => set.add(id.toString()));
        return Array.from(set);
      });
      markTasksCompletedAsRead(taskIds);
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
        setTasks(prev => prev.map(task =>
          task.id === taskId
            ? { ...task, status: 'Completada', workDone, executedBy, completionDate: completionIso, imageUrlBefore, imageUrlAfter, maintenanceType: tipoMantenimiento, sparesUsed: repuestos, observations: observaciones }
            : task
        ));

        let baseTask = selectedTask || tasks.find(t => t.id === taskId) || null;
        if (!baseTask) {
          try {
            const dbTaskResponse = await fetch(`/api/tareas/${taskId}`);
            if (dbTaskResponse.ok) {
              const dbTask = await dbTaskResponse.json();
              if (dbTask) baseTask = mapDatabaseTaskToFrontend(dbTask, users);
            }
          } catch (fetchError) {
            console.warn('No se pudo obtener la tarea desde la BD para la notificación', fetchError);
          }
        }

        if (baseTask) {
          const isFrecuenciada = (baseTask as any).frecuencia && (baseTask as any).frecuencia !== 'ninguna';
          const completedTitlePrefix = isFrecuenciada
            ? 'Tarea Completada (frecuenciada)'
            : 'Tarea Completada';

          const baseNotif: Omit<Notification, "id" | "createdAt"> = {
            title: `${completedTitlePrefix}: ${baseTask.code ?? ''} - ${baseTask.area ?? 'Área sin nombre'}`,
            message: `Ejecutado por: ${executedBy.name}\nPrioridad: ${baseTask.priority ?? ''}\nTrabajo: ${workDone}`,
            type: "task_alert",
            severity: "success",
            read: false,
            refId: taskId,
            status: "Completada",
          };

          let finalNotif: Notification | null = null;
          try {
            const resNotif = await fetch(`${window.location.origin}/api/notificaciones`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                titulo: baseNotif.title,
                mensaje: baseNotif.message,
                tipo: baseNotif.type,
                severidad: baseNotif.severity,
                estado_tarea: baseNotif.status,
                prioridad: baseTask.priority,
                ref_task_id: taskId,
              }),
            });

            
            if (resNotif.ok) {
              const jsonNotif = await resNotif.json();
              const saved = jsonNotif.data;
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
                priority: baseTask.priority,
              } as any;
            }
          } catch (e) {
            console.warn('No se pudo guardar la notificación de tarea completada en BD', e);
          }

          const notif: Notification = finalNotif ?? {
            id: `task-completed-${taskId}-${Date.now()}`,
            title: baseNotif.title,
            message: baseNotif.message,
            type: baseNotif.type,
            severity: baseNotif.severity,
            createdAt: new Date().toISOString(),
            read: false,
            refId: baseNotif.refId,
            status: baseNotif.status,
            priority: baseTask.priority,
          } as any;

          addNotification(notif);

          let currentPermission = permission;
          if (currentPermission === 'default' && typeof window !== 'undefined' && 'Notification' in window) {
            currentPermission = await requestPermission();
          }

          if (currentPermission === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
            const browserNotif = new Notification(notif.title, {
              body: notif.message,
              tag: `task-completed-${taskId}`,
              data: { url: `${window.location.origin}/dashboard/tasks?selectedTaskId=${taskId}` }
            });
            browserNotif.onclick = (event) => {
              event.preventDefault();
              window.focus();
              if (browserNotif.data?.url) window.location.href = browserNotif.data.url;
            };
          }
        }

        try {
          const numericTaskId = parseInt(taskId, 10);
          const isEquipoSchedule = baseTask && (baseTask.schedule === 'Maquinaria' || baseTask.schedule === 'Equipo de Medición');
          const isZonaSchedule = baseTask && (baseTask.schedule === 'Partes Altas' || baseTask.schedule === 'Mantenimiento Locativo');

          if (baseTask && baseTask.code && !isNaN(numericTaskId)) {
            if (isEquipoSchedule) {
              await fetch('/api/equipos/historial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  codigoEquipo: baseTask.code,
                  tareaId: numericTaskId,
                  fechaEvento: completionIso,
                  labor: workDone,
                  tipoMantenimiento: tipoMantenimiento,
                  repuestosUsados: repuestos,
                  observaciones: observaciones,
                  ejecutadoPor: executedBy.name,
                  creadoPor: userEmail || null,
                }),
              });
            } else if (isZonaSchedule) {
              await fetch('/api/zonas/historial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  codigoZona: baseTask.code,
                  tareaId: numericTaskId,
                  fechaEvento: completionIso,
                  labor: workDone,
                  tipoMantenimiento: tipoMantenimiento,
                  repuestosUsados: repuestos,
                  observaciones: observaciones,
                  ejecutadoPor: executedBy.name,
                  creadoPor: userEmail || null,
                }),
              });
            }
          }
        } catch (e) {
          console.warn('No se pudo registrar la tarea en historial (equipos/zona)', e);
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
      toast({ title: "Error", description: "No se pudo completar la tarea", variant: "destructive" });
    }
  };

  const visibleTasks = useMemo(() => {
    if (!normalizedQuery) return tasks;
    return tasks.filter((t) => {
      const haystack = [
        t.code,
        t.description,
        t.area,
        t.assignedTo?.name,
        t.executedBy?.name,
      ].filter(Boolean).join(' ').toLowerCase();
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
      if (grouped[task.schedule]) grouped[task.schedule].push(task);
    });
    return grouped;
  }, [visibleTasks]);

  const sortedTasks = useMemo(() => {
    return [...visibleTasks].sort((a, b) =>
      new Date(a.nextExecution).getTime() - new Date(b.nextExecution).getTime()
    );
  }, [visibleTasks]);

  const handleExport = (exportFormat: 'excel' | 'pdf' | 'word') => {
    const dataToExport = visibleTasks.map(t => ({
      'Código': t.code,
      'Descripción': t.description,
      'Área': t.area,
      'Cronograma': t.schedule,
      'Prioridad': t.priority,
      'Estado': t.status,
      'Responsable': t.assignedTo?.name || 'Sin asignar',
      'Ejecutado por': t.executedBy?.name || '-',
      'Fecha Programada': format(new Date(t.nextExecution), "PPP", { locale: es }),
      'Fecha Completada': t.completionDate ? format(new Date(t.completionDate), "PPP", { locale: es }) : '-',
      'Tipo Mantenimiento': (t as any).maintenanceType || '-',
      'Trabajo Realizado': t.workDone || 'Sin registro',
      'Repuestos Usados': (t as any).sparesUsed || '-',
      'Observaciones': (t as any).observations || '-',
    }));

    const columns = ['Código', 'Descripción', 'Área', 'Cronograma', 'Prioridad', 'Estado', 'Responsable', 'Ejecutado por', 'Fecha Programada', 'Fecha Completada', 'Tipo Mantenimiento', 'Trabajo Realizado', 'Repuestos Usados', 'Observaciones'];
    const filename = `Reporte_Tareas_${format(new Date(), "dd-MM-yyyy", { locale: es })}`;

    if (exportFormat === 'excel') {
      exportToExcel(dataToExport, filename);
    } else if (exportFormat === 'pdf') {
      exportToPDF(dataToExport, columns, 'Reporte de Tareas', filename);
    } else if (exportFormat === 'word') {
      exportToWord(dataToExport, columns, 'Reporte de Tareas', filename);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestor de Tareas</h1>
          <p className="text-sm text-muted-foreground">
            {visibleTasks.filter(t => t.status !== 'Completada').length} tareas encontradas
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch md:items-center gap-2 w-full md:w-auto">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value: ViewMode) => value && setViewMode(value)}
            className="w-full sm:w-auto justify-center sm:justify-start"
          >
            <ToggleGroupItem value="calendar" aria-label="Vista de calendario">
              <Calendar className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Vista de tabla">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="analytics" aria-label="Vista de estadísticas">
              <BarChart className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto flex-1 md:flex-none gap-2 justify-center"
              >
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="mr-2 h-4 w-4 text-red-600" /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('word')}>
                <File className="mr-2 h-4 w-4 text-blue-600" /> Word
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            onClick={() => loadTasks(selectedSchedule)}
            disabled={isLoading}
            className="w-full sm:w-auto flex-1 md:flex-none justify-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          {isAdmin && (
            <Button
              onClick={() => setIsAddTaskOpen(true)}
              className="w-full sm:w-auto flex-1 md:flex-none justify-center"
            >
              Agregar Labor
            </Button>
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
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-1 sm:gap-0">
                {schedules.map(schedule => {
                  const totalNoCompletadas = (tasksBySchedule[schedule] || []).filter(t => t.status !== 'Completada').length;
                  return (
                    <TabsTrigger
                      key={schedule}
                      value={schedule}
                      className="w-full text-xs sm:text-sm px-2 py-1 whitespace-normal"
                    >
                      {schedule}
                      <span className="ml-2 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full text-[10px] sm:text-xs">
                        {totalNoCompletadas}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {schedules.map(schedule => (
                <TabsContent key={schedule} value={schedule} className="mt-4">
                  <TaskCalendarView tasks={tasksBySchedule[schedule]} onTaskClick={handleOpenDetails} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      ) : viewMode === 'analytics' ? (
        <TaskAnalytics tasks={visibleTasks} />
      ) : (
        <TaskTableView
          tasks={sortedTasks}
          users={users}
          isAdmin={isAdmin}
          onOpenComplete={handleOpenComplete}
          onOpenEdit={handleOpenEdit}
          onDeleteTask={handleDeleteTask}
          onOpenSpecs={handleOpenSpecs}
          loadingSpecsId={loadingSpecsId}
          onTaskClick={handleOpenDetails}
          seenCompletedIds={seenCompletedIds}
          onCompletedSeen={handleCompletedSeen}
        />
      )}

      <AddTaskDialog isOpen={isAddTaskOpen} setIsOpen={setIsAddTaskOpen} onAddTask={handleAddTask} users={users} />

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
              ¿Estás seguro de que quieres eliminar la tarea{" "}
              <span className="font-medium">{deleteTarget.code} - {deleteTarget.description}</span>?
              Esta acción no se puede deshacer.
            </p>
            <DialogFooter className="mt-4">
              <Button variant="outline" type="button" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" type="button" onClick={() => handleDeleteTask(deleteTarget.id)}>
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}