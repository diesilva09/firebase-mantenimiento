// services/task-reminders.ts
import type { Task } from '@/lib/types';
import { getBaseUrl } from '@/lib/utils';

// Función para programar recordatorios de tareas
export async function scheduleTaskReminders(task: Omit<Task, 'assignedTo' | 'nextExecution' | 'status'> & { assignedTo: any, nextExecution: any, status: any }, executionDate: Date, reminderConfig: any) {
  try {
    const execDate = new Date(executionDate);
    const now = new Date();

    if (execDate < now) {
      return;
    }

    const reminderDates: { date: Date; label: string }[] = [];

    if (reminderConfig.reminderType === 'predefined' && reminderConfig.predefinedReminders) {
      const predefinedOptions = [
        { days: 7, label: 'Semana antes', index: 0 },
        { days: 3, label: '3 días antes', index: 1 },
        { days: 1, label: 'Día antes', index: 2 }
      ];

      for (const option of predefinedOptions) {
        if (reminderConfig.predefinedReminders[option.index]) {
          const reminderDate = new Date(execDate);
          reminderDate.setDate(reminderDate.getDate() - option.days);

          if (reminderDate >= now) {
            reminderDates.push({ date: reminderDate, label: option.label });
          }
        }
      }
    } else if (reminderConfig.reminderType === 'custom' && reminderConfig.customReminderDate) {
      const customDate = new Date(reminderConfig.customReminderDate);

      if (customDate >= now && customDate < execDate) {
        reminderDates.push({ date: customDate, label: 'Personalizado' });
      }
    }

    const baseUrl = getBaseUrl();
    for (const reminder of reminderDates) {
      const reminderNotif = {
        titulo: `Recordatorio: ${task.description}`,
        mensaje: `${reminder.label}: La tarea "${task.description}" está programada para ${execDate.toLocaleDateString('es-ES')} en ${task.area}.`,
        tipo: 'task_alert',
        severidad: 'warning',
        ref_task_id: task.id,
        estado_tarea: 'Pendiente',
        creado_en: reminder.date.toISOString() // Fecha en que debería activarse el recordatorio
      };

      await fetch(`${baseUrl}/api/notificaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reminderNotif),
      });
    }
  } catch (error) {
    console.error('Error programando recordatorios:', error);
  }
}
