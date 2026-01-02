"use client";

import { NotificationsProvider } from "@/context/notifications-context";
import ServiceWorkerRegistration from "@/components/service-worker-registration";

export function ClientNotificationsProvider({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <NotificationsProvider>
      <ServiceWorkerRegistration />
      {children}
    </NotificationsProvider>
  );
}