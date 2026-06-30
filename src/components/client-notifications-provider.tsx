"use client";

import { NotificationsProvider } from "@/context/notifications-context";
import { PushNotificationsManager } from "@/components/push-notifications-manager";

export function ClientNotificationsProvider({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <NotificationsProvider>
      <PushNotificationsManager />
      {children}
    </NotificationsProvider>
  );
}
