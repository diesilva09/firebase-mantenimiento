// components/notification-badge.tsx
"use client"

import { useRouter } from "next/navigation"
import { Bell, Check, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useNotificationsContext as useNotifications } from "@/context/notifications-context"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Notification } from "@/lib/types"

const severityIcons = {
  info: '🔧',
  warning: '🟡',
  critical: '🔴',
  success: '✅'
}

const typeIcons = {
  task_alert: '📋',
  form_submission: '📝',
  system: '🔔'
}

const getStatusBadgeClass = (status?: Notification['status']): string => {
  if (!status) return "bg-muted text-muted-foreground border";
  
  const s = status.toLowerCase();
  if (s === 'completada') {
    return 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50';
  }
  if (s === 'pendiente') {
    return 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50';
  }
  if (s === 'futura') { // El estado es 'Futura', se muestra como 'Próxima'
    return 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50';
  }
  return "bg-muted text-muted-foreground border";
};

export function NotificationBadge() {
  const router = useRouter()
  const {
    permission,
    notifications,
    unreadCount,
    requestPermission,
    markAsRead,
    markAllAsRead,
    hideNotification,
    hideAllNotifications,
  } = useNotifications()

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)

    if (notification.type === 'task_alert' && notification.refId) {
      router.push(`/dashboard/tasks?selectedTaskId=${notification.refId}`)
    }

    if (notification.type === 'spare_part_usage' && notification.refId) {
      // Navegar a la página de usos y la página se encargará de mostrar la pestaña correcta
      router.push(`/dashboard/usos-repuestos?selectedUsageId=${notification.refId}`)
    }

    // Aquí se pueden agregar más lógicas de navegación para otros tipos de notificaciones
    // ...
  }

  const getNotificationIcon = (notification: Notification) => {
    return typeIcons[notification.type] || severityIcons[notification.severity] || '🔔'
  }

 const getNotificationStyles = (notification: Notification) => {
    // Estilo simplificado: sin colores de estado/prioridad
    return {
      bgUnread: 'bg-accent/50',
      dotColor: !notification.read ? 'bg-white-500' : 'hidden'
    }
}
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[80vh] overflow-hidden">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notificaciones</span>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="h-auto p-1 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Marcar todas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={hideAllNotifications}
                className="h-auto p-1 text-xs text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Borrar todas
              </Button>
            )}
           {permission !== 'granted' && (
  <Button 
    variant="ghost" 
    size="sm" 
    onClick={requestPermission}
    className="h-auto p-1 text-xs"
  >
    Activar
  </Button>
)}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No hay notificaciones
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
       {notifications.slice(0, 20).map((notification) => {
      const { dotColor, bgUnread } = getNotificationStyles(notification)

      return (
        <DropdownMenuItem
          key={notification.id}
          className={`
            p-3 cursor-pointer border-b last:border-b-0
            ${!notification.read ? bgUnread : ''}
          `}
          onClick={() => handleNotificationClick(notification)}
        >
          <div className="flex gap-3 w-full">
            <div className="text-lg flex-shrink-0">
              {getNotificationIcon(notification)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium text-sm whitespace-pre-wrap break-words">
                  {notification.title}
                </span>
                {notification.status && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${getStatusBadgeClass(notification.status)}`}>
                    {notification.status === 'Futura' ? 'Próxima' : notification.status}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mb-1 whitespace-pre-line line-clamp-3">
                {notification.message}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                  locale: es
                })}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0 mt-1">
          <div className={`w-2 h-2 rounded-full ${dotColor}`} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              hideNotification(notification.id)
            }}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </DropdownMenuItem>
  )
})}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}