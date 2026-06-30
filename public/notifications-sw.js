self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  let payload = {}

  if (event.data) {
    try {
      payload = event.data.json()
    } catch (error) {
      payload = { title: "Notificacion", body: event.data.text() }
    }
  } else {
    payload = { title: "Nueva notificacion", body: "Tienes una nueva notificacion" }
  }

  const title = payload.title || "Nueva notificacion"
  const options = {
    body: payload.body || "Tienes una nueva notificacion",
    icon: payload.icon || "/logo.png",
    badge: payload.badge || "/logo.png",
    tag: payload.tag || title,
    data: payload.data || {},
    actions: payload.actions || [],
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({
          type: "PUSH_NOTIFICATION_RECEIVED",
          payload,
        })
      })

      return self.registration.showNotification(title, options)
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const targetUrl = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }

      return clients.openWindow(targetUrl)
    }),
  )
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
