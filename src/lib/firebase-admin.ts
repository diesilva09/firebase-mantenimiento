import admin from "firebase-admin"

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY

if (!admin.apps.length) {
  if (projectId && clientEmail && rawPrivateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: rawPrivateKey.replace(/\\n/g, "\n"),
      }),
    })
  } else {
    console.warn(
      "[firebase-admin] Variables de entorno incompletas. Se omite la inicialización de Firebase Admin en este entorno.",
    )
  }
}

export { admin }