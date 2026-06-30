"use client"

import { useEffect, useRef } from "react"

import { useNotificationsContext } from "@/context/notifications-context"
import { useUser } from "@/firebase/auth/use-user"
import {
  registerPushServiceWorker,
  subscribeUserToPush,
  unsubscribeUserFromPush,
} from "@/lib/web-push-client"

async function syncPushSubscription(payload: {
  subscription: PushSubscriptionJSON
  permission: NotificationPermission
  userUid: string | null
  userEmail: string | null
}) {
  await fetch("/api/notificaciones/devices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
}

async function removePushSubscription(endpoint: string) {
  await fetch("/api/notificaciones/devices", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ endpoint }),
  })
}

export function PushNotificationsManager() {
  const { user } = useUser()
  const { permission, refreshNotifications } = useNotificationsContext()
  const currentEndpointRef = useRef<string | null>(null)

  useEffect(() => {
    let detached = false

    registerPushServiceWorker().catch((error) => {
      console.error("No se pudo registrar el service worker de notificaciones web push:", error)
    })

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "PUSH_NOTIFICATION_RECEIVED") {
        return
      }

      refreshNotifications().catch((error) => {
        console.error("No se pudieron refrescar las notificaciones tras el push:", error)
      })
    }

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage)

    return () => {
      if (!detached) {
        navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage)
        detached = true
      }
    }
  }, [])

  useEffect(() => {
    if (permission !== "granted") {
      const cleanupSubscription = async () => {
        const registration = await registerPushServiceWorker().catch(() => null)
        const existingSubscription = await registration?.pushManager.getSubscription()
        const endpoint = existingSubscription?.endpoint ?? currentEndpointRef.current

        if (endpoint) {
          await removePushSubscription(endpoint).catch((error) => {
            console.error("No se pudo eliminar la suscripcion push desactivada:", error)
          })
        }

        currentEndpointRef.current = null
        await unsubscribeUserFromPush().catch(() => {})
      }

      cleanupSubscription().catch(() => {})
      return
    }

    let cancelled = false

    const registerSubscription = async () => {
      const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY
      if (!publicKey) {
        return
      }

      const subscription = await subscribeUserToPush(publicKey)
      if (!subscription || cancelled) {
        return
      }

      const subscriptionJson = subscription.toJSON()
      if (!subscriptionJson.endpoint) {
        return
      }

      currentEndpointRef.current = subscriptionJson.endpoint

      try {
        await syncPushSubscription({
          subscription: subscriptionJson,
          permission,
          userUid: user?.uid ?? null,
          userEmail: user?.email ?? null,
        })
      } catch (error) {
        console.error("No se pudo sincronizar la suscripcion push con el servidor:", error)
      }
    }

    registerSubscription().catch((error) => {
      console.error("No se pudo registrar la suscripcion de notificaciones push:", error)
    })

    return () => {
      cancelled = true
    }
  }, [permission, user?.email, user?.uid, refreshNotifications])

  return null
}
