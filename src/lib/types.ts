export type User = {
  id: string;
  name: string;
  avatarUrl: string;
};

export type Schedule = 'Partes Altas' | 'Equipo de Medición' | 'Mantenimiento Locativo' | 'Maquinaria';

export type Priority = 'Alta' | 'Media' | 'Baja';

export type TaskStatus = 'Completada' | 'Pendiente' | 'Futura';

export type Task = {
  id: string;
  code: string;
  area: string;
  schedule: Schedule;
  description: string;
  priority: Priority;
  assignedTo: User;
  executedBy?: User; // Optional user who executed the task
  nextExecution: string; // ISO date string
  status: TaskStatus;
  hasAlert: boolean;
  workDone?: string;
  completionDate?: string; // ISO date string
  equipmentSpecs?: Record<string, string>;
  imageUrlBefore?: string;
  imageUrlAfter?: string;
};

export type FormSlug = 'inspeccion-equipos' | 'orden-mantenimiento' | 'paradas-operativas' | 'consumo-diario' | 'mantenimiento-locativo' | 'solicitud-repuestos' | 're-mtt-007' | 're-mtt-006' | 'minuta-mtto';

export type FormMetadata = {
  slug: FormSlug;
  title: string;
  description: string;
};

export type Submission = {
  id: string;
  form: FormSlug;
  formTitle: string;
  submittedAt: string; // ISO date string
  data: Record<string, any>;
};
 
export type NotificationType = 'task_alert' | 'form_submission' | 'system';
export type NotificationSeverity = 'info' | 'warning' | 'critical';
export type Notification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  severity: NotificationSeverity;
  createdAt: string;
  read: boolean;
  refId?: string;
  status?: TaskStatus; // 'Completada' | 'Pendiente' | 'Futura'
};
