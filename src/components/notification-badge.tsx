// components/notification-badge.tsx
"use client"

import { useRouter } from "next/navigation"
import {
  Bell,
  BellDot,
  Check,
  CheckCircle2,
  ClipboardList,
  Factory,
  FileText,
  Package,
  ShieldAlert,
  Trash2,
  TriangleAlert,
  Wrench,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNotificationsContext as useNotifications } from "@/context/notifications-context"
import { useToast } from "@/hooks/use-toast"
import { Notification } from "@/lib/types"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

const getStatusBadgeClass = (status?: Notification["status"]): string => {
  if (!status) return "border-border bg-muted/60 text-muted-foreground"

  const normalizedStatus = status.toLowerCase()
  if (normalizedStatus === "completada") {
    return "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300"
  }
  if (normalizedStatus === "pendiente") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
  }
  if (normalizedStatus === "futura") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
  }
  return "border-border bg-muted/60 text-muted-foreground"
}

const isFrecuenciadaNotification = (notification: Notification): boolean => {
  if (!notification.title) return false
  return notification.title.toLowerCase().includes("frecuenciada")
}

const getNotificationIcon = (notification: Notification) => {
  if (notification.type === "task_alert") {
    return <ClipboardList className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
  }
  if (notification.type === "form_submission") {
    return <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
  }
  if (notification.type === "spare_part_usage") {
    return <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
  }
  if (notification.type === "operational_stop") {
    return <Factory className="h-4 w-4 text-rose-600 dark:text-rose-400" />
  }
  if (notification.severity === "critical") {
    return <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
  }
  if (notification.severity === "warning") {
    return <TriangleAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
  }
  if (notification.severity === "info") {
    return <Wrench className="h-4 w-4 text-sky-600 dark:text-sky-400" />
  }
  return <BellDot className="h-4 w-4 text-muted-foreground" />
}

const getNotificationCardClass = (notification: Notification) =>
  cn(
    "relative flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
    "focus:bg-accent/60 focus:text-foreground",
    notification.read
      ? "border-transparent bg-background hover:bg-muted/70"
      : "border-primary/15 bg-primary/5 hover:bg-primary/10"
  )

export function NotificationBadge() {
  const router = useRouter()
  const { toast } = useToast()
  const {
    permission,
    secureContext,
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

    if (notification.type === "task_alert" && notification.refId) {
      router.push(`/dashboard/tasks?selectedTaskId=${notification.refId}`)
    }

    if (notification.type === "spare_part_usage" && notification.refId) {
      router.push(`/dashboard/usos-repuestos?selectedUsageId=${notification.refId}`)
    }

    if (notification.type === "form_submission" && notification.refId) {
      router.push(`/dashboard/forms?tab=maintenance-requests&selectedRequestId=${notification.refId}`)
    }

    if (notification.type === "operational_stop") {
      router.push(
        notification.refId
          ? `/dashboard/forms/paradas-operativas?registroId=${notification.refId}`
          : "/dashboard/forms/paradas-operativas",
      )
    }
  }

  const handleEnableNotifications = async () => {
    if (!secureContext) {
      toast({
        title: "No se pueden activar los avisos",
        description:
          "En el movil, las notificaciones del navegador requieren una conexion segura por HTTPS o un dominio valido.",
        variant: "destructive",
      })
      return
    }

    const result = await requestPermission()

    if (result === "granted") {
      toast({
        title: "Avisos activados",
        description: "Las notificaciones del navegador quedaron habilitadas.",
        variant: "success",
      })
      return
    }

    if (result === "denied") {
      toast({
        title: "Permiso bloqueado",
        description: "El navegador rechazo las notificaciones. Debes habilitarlas manualmente en la configuracion del sitio.",
        variant: "warning",
      })
      return
    }

    toast({
      title: "Avisos no disponibles",
      description: "Este navegador o esta conexion no permiten activar notificaciones del navegador en este momento.",
      variant: "destructive",
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[420px] overflow-hidden rounded-2xl p-0">
        <DropdownMenuLabel className="border-b bg-muted/40 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Notificaciones</p>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0
                  ? `${unreadCount} sin leer`
                  : "Todas las notificaciones estan al dia"}
              </p>
            </div>

            {unreadCount > 0 && (
              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">
                Nuevas
              </Badge>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead} className="h-8 rounded-full text-xs">
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Marcar todas
              </Button>
            )}

            {notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={hideAllNotifications}
                className="h-8 rounded-full text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Limpiar
              </Button>
            )}

            {permission !== "granted" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnableNotifications}
                className="h-8 rounded-full text-xs"
              >
                {secureContext ? "Activar avisos" : "Requiere HTTPS"}
              </Button>
            )}
          </div>

          {!secureContext && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
              Las notificaciones del navegador no se pueden activar aqui porque la conexion no es segura. En movil necesitas HTTPS o un dominio valido.
            </p>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="m-0" />

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
            <div className="rounded-full bg-muted p-3">
              <BellDot className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No hay notificaciones</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Cuando haya novedades del sistema, tareas o solicitudes, apareceran aqui.
            </p>
          </div>
        ) : (
          <div className="max-h-[28rem] space-y-1 overflow-y-auto p-2">
            {notifications.slice(0, 20).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="cursor-pointer rounded-xl border-none p-0 focus:bg-transparent"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={getNotificationCardClass(notification)}>
                  {!notification.read && (
                    <span className="absolute left-0 top-3 h-8 w-1 rounded-r-full bg-primary" aria-hidden="true" />
                  )}

                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted/80">
                    {getNotificationIcon(notification)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium leading-tight text-foreground break-words">
                            {notification.title}
                          </p>
                          {isFrecuenciadaNotification(notification) && (
                            <Badge
                              variant="secondary"
                              className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0 text-[10px] uppercase tracking-wide text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
                            >
                              Frecuenciada
                            </Badge>
                          )}
                        </div>
                      </div>

                      {notification.status && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            getStatusBadgeClass(notification.status)
                          )}
                        >
                          {notification.status === "Futura" ? "Proxima" : notification.status}
                        </span>
                      )}
                    </div>

                    <p className="mb-2 text-xs leading-5 text-muted-foreground whitespace-pre-line break-words">
                      {notification.message}
                    </p>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>

                      {!notification.read && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          <CheckCircle2 className="h-3 w-3" />
                          Nueva
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      hideNotification(notification.id)
                    }}
                    className="mt-0.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                    aria-label="Ocultar notificacion"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
