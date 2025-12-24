import { admin } from "./firebase-admin"

const adminConfigured = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY,
)

export async function requireAdminFromRequest(req: Request) {
  // Si Firebase Admin no está configurado (entorno local/demo),
  // permitir siempre el acceso como admin para no bloquear el desarrollo.
  if (!adminConfigured) {
    return { ok: true, email: "local-dev@dummy" }
  }

  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null

  if (!token) {
    return { ok: false, status: 401, message: "No autenticado" }
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    const email = decoded.email?.toLowerCase().trim()

    if (!email) {
      return { ok: false, status: 401, message: "No autenticado" }
    }

    const adminEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)

    const isAdmin = adminEnv.includes(email)

    if (!isAdmin) {
      return { ok: false, status: 403, message: "No autorizado" }
    }

    return { ok: true, email }
  } catch {
    return { ok: false, status: 401, message: "Token inválido" }
  }
}