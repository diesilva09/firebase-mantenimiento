"use client"

const SERVICE_WORKER_PATH = "/notifications-sw.js"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; ++index) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

export async function registerPushServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null
  }

  const existingRegistration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH)
  if (existingRegistration) {
    return existingRegistration
  }

  return navigator.serviceWorker.register(SERVICE_WORKER_PATH)
}

export async function subscribeUserToPush(publicKey: string) {
  if (typeof window === "undefined") {
    return null
  }

  const registration = await registerPushServiceWorker()
  if (!registration || !("PushManager" in window)) {
    return null
  }

  const existingSubscription = await registration.pushManager.getSubscription()
  if (existingSubscription) {
    return existingSubscription
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })
}

export async function unsubscribeUserFromPush() {
  if (typeof window === "undefined") {
    return
  }

  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH)
  const subscription = await registration?.pushManager.getSubscription()
  if (subscription) {
    await subscription.unsubscribe()
  }
}
