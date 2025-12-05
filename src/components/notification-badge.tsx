// components/notification-badge.tsx
"use client"

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
import { useNotifications } from "@/hooks/use-notifications"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Notification } from "@/lib/types"

const severityIcons = {
  info: '🔵',
  warning: '🟡',
  critical: '🔴'
}

const typeIcons = {
  task_alert: '📋',
  form_submission: '📝',
  system: '🔔'
}

export function NotificationBadge() {
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



  const getNotificationIcon = (notification: Notification) => {
    return typeIcons[notification.type] || severityIcons[notification.severity] || '🔔'
  }

 const getNotificationStyles = (notification: Notification) => {
  // Punto: SIEMPRE por prioridad
  let dotColor = ''

  if (notification.severity === 'critical') {
    // Prioridad alta
    dotColor = 'bg-red-500'
  } else if (notification.severity === 'warning') {
    // Prioridad media
    dotColor = 'bg-yellow-500'
  } else {
    // info (baja)
    dotColor = 'bg-blue-500'
  }

  // Tarjeta (franja izquierda + fondo de no leída) por ESTADO
  let borderColor = ''
  let bgUnread = ''

  if (notification.status === 'Completada') {
    // Completada → verde
    borderColor = 'border-l-emerald-500'
    bgUnread = 'bg-emerald-50 dark:bg-emerald-950/30'
  } else if (notification.status === 'Futura') {
    // Próxima/futura → morado
    borderColor = 'border-l-indigo-500'
    bgUnread = 'bg-indigo-50 dark:bg-indigo-950/30'
  } else {
    // Pendiente (o sin status) → naranja
    borderColor = 'border-l-amber-500'
    bgUnread = 'bg-amber-50 dark:bg-amber-950/30'
  }

  return { borderColor, dotColor, bgUnread }
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
      const { borderColor, dotColor, bgUnread } = getNotificationStyles(notification)

      return (
        <DropdownMenuItem
          key={notification.id}
          className={`
            p-3 cursor-pointer border-b last:border-b-0 border-l-4
            ${borderColor}
            ${!notification.read ? bgUnread : ''}
          `}
          onClick={() => markAsRead(notification.id)}
        >
          <div className="flex gap-3 w-full">
            <div className="text-lg flex-shrink-0">
              {getNotificationIcon(notification)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm mb-1 line-clamp-2">
                {notification.title}
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