"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Notification } from "@/lib/types";
import { tasks } from "@/lib/data";

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
  requestPermission: () => Promise<NotificationPermissionState>;
  hideNotification: (id: string) => void;
  hideAllNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

// Fecha fija usada para las notificaciones mock, para evitar diferencias SSR/CSR


export function NotificationsProvider({ children }: { children: React.ReactNode }) {

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [permission, setPermission] = useState<NotificationPermissionState>("unsupported");
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  // Leer permiso inicial (solo en cliente) y memo sencillo en localStorage para no molestar siempre
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    // Siempre usamos el estado real del navegador
    setPermission(window.Notification.permission);
  }, []);

    useEffect(() => {
    const loadNotifications = async () => {
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
    }

    loadNotifications()
  }, [])

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

  // Guardar IDs ocultos en localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('hidden-notifications', JSON.stringify(hiddenIds));
    } catch (e) {
      console.warn('No se pudieron guardar notificaciones ocultas', e);
    }
  }, [hiddenIds]);

  

  const requestPermission = async (): Promise<NotificationPermissionState> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return "unsupported";
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

  const visibleNotifications = useMemo(
    () => notifications.filter((n) => !hiddenIds.includes(n.id)),
    [notifications, hiddenIds]
  );

  const unreadCount = useMemo(
    () => visibleNotifications.filter((n) => !n.read).length,
    [visibleNotifications]
  );

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
    requestPermission,
    hideNotification,
    hideAllNotifications,
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
