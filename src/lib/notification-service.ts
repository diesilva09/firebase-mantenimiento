import { query } from "@/lib/db"
import webpush from "web-push"

interface NotificationPayload {
  titulo: string
  mensaje: string
  tipo: "task_alert" | "form_submission" | "system" | "spare_part_usage"
  severidad: "info" | "warning" | "critical"
  ref_task_id?: number
  estado_tarea?: "Pendiente" | "Completada" | "Futura"
  prioridad?: "Alta" | "Media" | "Baja"
}

type StoredNotification = {
  id: number
  titulo: string
  mensaje: string
  tipo: NotificationPayload["tipo"]
  severidad: NotificationPayload["severidad"]
  ref_task_id: number | null
}

type StoredSubscription = {
  endpoint: string
  permission: string | null
  subscription_json: unknown
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY
  const subject = process.env.WEB_PUSH_SUBJECT

  if (!publicKey || !privateKey || !subject) {
    return false
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  return true
}

async function ensureNotificationSubscriptionsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS notification_subscriptions (
      id SERIAL PRIMARY KEY,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NULL,
      auth TEXT NULL,
      subscription_json JSONB NOT NULL,
      user_uid TEXT NULL,
      user_email TEXT NULL,
      permission TEXT NULL,
      user_agent TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

function buildNotificationUrl(notification: StoredNotification) {
  switch (notification.tipo) {
    case "task_alert":
      return notification.ref_task_id
        ? `/dashboard/tasks?selectedTaskId=${notification.ref_task_id}`
        : "/dashboard/tasks"
    case "form_submission":
      return notification.ref_task_id
        ? `/dashboard/forms?tab=maintenance-requests&selectedRequestId=${notification.ref_task_id}`
        : "/dashboard/forms?tab=maintenance-requests"
    case "spare_part_usage":
      return notification.ref_task_id
        ? `/dashboard/usos-repuestos?selectedUsageId=${notification.ref_task_id}`
        : "/dashboard/usos-repuestos"
    default:
      return "/dashboard"
  }
}

async function removeInvalidDeviceTokens(tokens: string[]) {
  if (tokens.length === 0) {
    return
  }

  await query(`DELETE FROM notification_subscriptions WHERE endpoint = ANY($1::text[])`, [tokens])
}

function isValidStoredSubscription(subscription: StoredSubscription) {
  if (!subscription.endpoint || typeof subscription.endpoint !== "string") {
    return false
  }

  if (subscription.permission && subscription.permission !== "granted") {
    return false
  }

  const payload = subscription.subscription_json
  if (!payload || typeof payload !== "object") {
    return false
  }

  const subscriptionPayload = payload as {
    endpoint?: unknown
    keys?: { p256dh?: unknown; auth?: unknown }
  }

  return (
    subscriptionPayload.endpoint === subscription.endpoint &&
    typeof subscriptionPayload.keys?.p256dh === "string" &&
    subscriptionPayload.keys.p256dh.trim() !== "" &&
    typeof subscriptionPayload.keys?.auth === "string" &&
    subscriptionPayload.keys.auth.trim() !== ""
  )
}

async function sendPushNotification(notification: StoredNotification) {
  try {
    const webPushReady = configureWebPush()
    if (!webPushReady) {
      return
    }

    await ensureNotificationSubscriptionsTable()

    const { rows } = await query(
      `
        SELECT endpoint, permission, subscription_json
        FROM notification_subscriptions
        WHERE endpoint IS NOT NULL
          AND endpoint <> ''
      `,
    )

    const subscriptions = rows as StoredSubscription[]
    const invalidEndpoints = subscriptions
      .filter((subscription) => !isValidStoredSubscription(subscription))
      .map((subscription) => subscription.endpoint)
    const validSubscriptions = subscriptions.filter((subscription) =>
      isValidStoredSubscription(subscription)
    )

    if (invalidEndpoints.length > 0) {
      await removeInvalidDeviceTokens(invalidEndpoints)
    }

    if (validSubscriptions.length === 0) {
      return
    }

    const url = buildNotificationUrl(notification)

    const payload = JSON.stringify({
      title: notification.titulo,
      body: notification.mensaje,
      icon: "/logo.png",
      badge: "/logo.png",
      tag: `notification-${notification.id}`,
      data: {
        url,
        type: notification.tipo,
        refId: notification.ref_task_id ? String(notification.ref_task_id) : "",
        notificationId: String(notification.id),
      },
    })

    const expiredEndpoints: string[] = []

    await Promise.all(
      validSubscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(subscription.subscription_json, payload)
        } catch (error: any) {
          const statusCode = error?.statusCode
          if (statusCode === 404 || statusCode === 410) {
            expiredEndpoints.push(subscription.endpoint)
          } else {
            console.error("Error enviando web push a una suscripcion:", error)
          }
        }
      }),
    )

    await removeInvalidDeviceTokens(expiredEndpoints)
  } catch (error) {
    console.error("Error enviando notificacion push:", error)
  }
}

export async function createNotification(payload: NotificationPayload) {
  try {
    const { titulo, mensaje, tipo, severidad, estado_tarea, prioridad, ref_task_id } = payload

    const result = await query(
      `INSERT INTO notificaciones
        (titulo, mensaje, tipo, severidad, estado_tarea, prioridad, ref_task_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [titulo, mensaje, tipo, severidad, estado_tarea, prioridad, ref_task_id],
    )

    const createdNotification = result.rows[0] as StoredNotification
    await sendPushNotification(createdNotification)

    return createdNotification
  } catch (e) {
    console.error("Error al crear notificación en la base de datos:", e)
    throw new Error("Error al crear notificación en la base de datos")
  }
}
