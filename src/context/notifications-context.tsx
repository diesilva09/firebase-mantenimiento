"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Notification } from "@/lib/types";
import { useLiveRefresh } from "@/hooks/use-live-refresh";

type NotificationPermissionState = NotificationPermission | "unsupported";

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (n: Notification) => void;
  removeNotification: (id: string) => void;
  markTasksCompletedAsRead: (taskIds: string[]) => void;
  permission: NotificationPermissionState;
  secureContext: boolean;
  requestPermission: () => Promise<NotificationPermissionState>;
  hideNotification: (id: string) => void;
  hideAllNotifications: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

// Fecha fija usada para las notificaciones mock, para evitar diferencias SSR/CSR


export function NotificationsProvider({ children }: { children: React.ReactNode }) {

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [permission, setPermission] = useState<NotificationPermissionState>("unsupported");
  const [secureContext, setSecureContext] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);

  const loadNotifications = useCallback(async () => {
      try {
        const res = await fetch('/api/notificaciones', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        const mapped: Notification[] = json.data.map((n: any) => ({
          id: String(n.id),
          title: n.titulo,
          message: n.mensaje,
          type: n.tipo,
          severity: n.severidad,
          createdAt: new Date(n.creado_en).toISOString(),
          read: false,
          refId: n.ref_task_id ?? undefined,
          status: n.estado_tarea as any,
        }))
        setNotifications(mapped)
      } catch (e) {
        console.error('Error cargando notificaciones desde BD', e)
      }
    }, [])
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"

    const isSecureNotificationsContext = window.isSecureContext || isLocalhost
    setSecureContext(isSecureNotificationsContext)

    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    // Siempre usamos el estado real del navegador
    setPermission(window.Notification.permission);
  }, []);

  useLiveRefresh({
    callback: loadNotifications,
    scopes: ["notifications"],
    intervalMs: 15000,
  })

  // Cargar IDs ocultos desde localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('hidden-notifications');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setHiddenIds(parsed);
        }
      }
    } catch (e) {
      console.warn('No se pudieron cargar notificaciones ocultas', e);
    }
  }, []);

  // Cargar IDs leídos desde localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('read-notifications');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setReadIds(parsed);
        }
      }
    } catch (e) {
      console.warn('No se pudieron cargar notificaciones leídas', e);
    }
  }, []);

  // Guardar IDs ocultos en localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('hidden-notifications', JSON.stringify(hiddenIds));
    } catch (e) {
      console.warn('No se pudieron guardar notificaciones ocultas', e);
    }
  }, [hiddenIds]);

  // Guardar IDs leídos en localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('read-notifications', JSON.stringify(readIds));
    } catch (e) {
      console.warn('No se pudieron guardar notificaciones leídas', e);
    }
  }, [readIds]);

  

  const requestPermission = async (): Promise<NotificationPermissionState> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return "unsupported";
    }

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"

    const isSecureNotificationsContext = window.isSecureContext || isLocalhost
    setSecureContext(isSecureNotificationsContext)

    if (!isSecureNotificationsContext) {
      setPermission("unsupported")
      return "unsupported"
    }

    try {
      const result = await window.Notification.requestPermission();
      setPermission(result);
      try {
        window.localStorage.setItem("notification-permission", result);
      } catch {
        // ignore
      }
      return result;
    } catch {
      return permission;
    }
  };

  // Aplicar hidden + estado leído persistente
  const visibleNotifications = useMemo(
    () =>
      notifications
        .filter((n) => !hiddenIds.includes(n.id))
        .map((n) => ({
          ...n,
          read: readIds.includes(n.id) ? true : n.read,
        })),
    [notifications, hiddenIds, readIds]
  );

  const unreadCount = useMemo(
    () => visibleNotifications.filter((n) => !n.read).length,
    [visibleNotifications]
  );

  const markAsRead = (id: string) => {
    setReadIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  };

  const markAllAsRead = () => {
    setReadIds((prev) => {
      const set = new Set(prev);
      notifications.forEach((n) => {
        if (!hiddenIds.includes(n.id)) {
          set.add(n.id);
        }
      });
      return Array.from(set);
    });
  };

  const hideNotification = (id: string) => {
    setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const hideAllNotifications = () => {
    setHiddenIds((prev) => {
      const allIds = notifications.map((n) => n.id);
      const merged = new Set([...prev, ...allIds]);
      return Array.from(merged);
    });
  };

  const addNotification = (n: Notification) => {
    setNotifications((prev) => [n, ...prev]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markTasksCompletedAsRead = (taskIds: string[]) => {
    if (!taskIds || taskIds.length === 0) return;
    setNotifications((prev) =>
      prev.map((n) =>
        n.refId && taskIds.includes(String(n.refId))
          ? { ...n, read: true }
          : n
      )
    );
  };

  const value: NotificationsContextValue = {
    notifications: visibleNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
    markTasksCompletedAsRead,
    permission,
    secureContext,
    requestPermission,
    hideNotification,
    hideAllNotifications,
    refreshNotifications: loadNotifications,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotificationsContext must be used within a NotificationsProvider");
  }
  return ctx;
}
