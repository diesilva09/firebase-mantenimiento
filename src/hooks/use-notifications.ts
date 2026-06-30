import { useNotificationsContext } from "@/context/notifications-context"

export function useNotifications() {
  const ctx = useNotificationsContext()

  return {
    notifications: ctx.notifications,
    unreadCount: ctx.unreadCount,
    markAsRead: ctx.markAsRead,
    markAllAsRead: ctx.markAllAsRead,
    addNotification: ctx.addNotification,
    removeNotification: ctx.removeNotification,
    markTasksCompletedAsRead: ctx.markTasksCompletedAsRead,
    permission: ctx.permission,
    requestPermission: ctx.requestPermission,
    hideNotification: ctx.hideNotification,
    hideAllNotifications: ctx.hideAllNotifications,
    subscribe: () => {},
  }
}
