import { NextResponse } from "next/server"

import { query } from "@/lib/db"

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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const subscription = body.subscription ?? null
    const endpoint = typeof subscription?.endpoint === "string" ? subscription.endpoint.trim() : ""
    const p256dh = typeof subscription?.keys?.p256dh === "string" ? subscription.keys.p256dh.trim() : null
    const auth = typeof subscription?.keys?.auth === "string" ? subscription.keys.auth.trim() : null
    const permission = typeof body.permission === "string" ? body.permission.trim() : "default"
    const userUid = typeof body.userUid === "string" ? body.userUid.trim() : null
    const userEmail = typeof body.userEmail === "string" ? body.userEmail.trim().toLowerCase() : null
    const userAgent = request.headers.get("user-agent")

    if (!endpoint) {
      return NextResponse.json({ success: false, error: "La suscripcion es requerida." }, { status: 400 })
    }

    await ensureNotificationSubscriptionsTable()

    if (permission !== "granted") {
      await query(`DELETE FROM notification_subscriptions WHERE endpoint = $1`, [endpoint])
      return NextResponse.json({ success: true, cleaned: true })
    }

    await query(
      `
        INSERT INTO notification_subscriptions (
          endpoint,
          p256dh,
          auth,
          subscription_json,
          user_uid,
          user_email,
          permission,
          user_agent,
          updated_at,
          last_seen_at
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (endpoint)
        DO UPDATE SET
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          subscription_json = EXCLUDED.subscription_json,
          user_uid = EXCLUDED.user_uid,
          user_email = EXCLUDED.user_email,
          permission = EXCLUDED.permission,
          user_agent = EXCLUDED.user_agent,
          updated_at = NOW(),
          last_seen_at = NOW()
      `,
      [endpoint, p256dh, auth, JSON.stringify(subscription), userUid, userEmail, permission, userAgent],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error registrando suscripcion de notificaciones:", error)
    return NextResponse.json(
      { success: false, error: "No se pudo registrar la suscripcion para notificaciones." },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : ""

    if (!endpoint) {
      return NextResponse.json({ success: false, error: "El endpoint es requerido." }, { status: 400 })
    }

    await ensureNotificationSubscriptionsTable()
    await query(`DELETE FROM notification_subscriptions WHERE endpoint = $1`, [endpoint])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error eliminando suscripcion de notificaciones:", error)
    return NextResponse.json(
      { success: false, error: "No se pudo eliminar la suscripcion de notificaciones." },
      { status: 500 },
    )
  }
}
