import { admin } from "./firebase-admin"

const adminConfigured = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY,
)

// --- CONFIGURACIÓN DE ROLES Y CORREOS ---
// Aquí asignas los correos de Firebase a cada rol.
// Puedes usar variables de entorno o escribirlos directamente aquí.
const ROLE_ASSIGNMENTS = {
  JEFE: [
    ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()),
  ].filter(Boolean),
  TECNICO: [
    // Se recomienda agregar una variable de entorno para técnicos también: process.env.TECNICO_EMAILS
    ...(process.env.TECNICO_EMAILS || "").split(",").map(s => s.trim().toLowerCase()),
  ].filter(Boolean),
  INVITADO: [
    ...(process.env.INVITADO_EMAILS || "").split(",").map(s => s.trim().toLowerCase()),
  ].filter(Boolean)
}

export async function requireAdminFromRequest(req: Request) {
  // Si Firebase Admin no está configurado (entorno local/demo),
  // permitir siempre el acceso como admin para no bloquear el desarrollo.
  if (!adminConfigured) {
    return { ok: true, email: "local-dev@dummy", role: "JEFE" }
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

    // Validar que el email haya sido verificado por el usuario (clic en el link de Firebase)
    if (!decoded.email_verified) {
      return { ok: false, status: 403, message: "Debes verificar tu correo electrónico para acceder." }
    }

    if (!email) {
      return { ok: false, status: 401, message: "No autenticado" }
    }

    // Determinar el rol basado en las listas definidas arriba
    const isJefe = ROLE_ASSIGNMENTS.JEFE.includes(email)
    const isTecnico = ROLE_ASSIGNMENTS.TECNICO.includes(email)
    const isInvitado = ROLE_ASSIGNMENTS.INVITADO.includes(email)

    // Si no está en ninguna lista, no tiene acceso
    if (!isJefe && !isTecnico && !isInvitado) {
      return { ok: false, status: 403, message: "No autorizado" }
    }

    // Retornamos el rol detectado para que la API sepa quién es
    return { 
      ok: true, 
      email, 
      role: isJefe ? 'JEFE' : (isTecnico ? 'TECNICO' : 'INVITADO') 
    }

  } catch {
    return { ok: false, status: 401, message: "Token inválido" }
  }
}