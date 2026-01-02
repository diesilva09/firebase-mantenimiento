// Service worker para notificaciones personalizadas

// Instalación del service worker
self.addEventListener('install', (event) => {
  console.log('Service worker instalado');
  event.waitUntil(self.skipWaiting()); // Forzar que el service worker tome control inmediatamente
});

// Activación del service worker
self.addEventListener('activate', (event) => {
  console.log('Service worker activado');
  event.waitUntil(self.clients.claim()); // Tomar control de todas las páginas
});

// Escuchar mensajes push
self.addEventListener('push', (event) => {
  let payload = {};
  
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { title: 'Notificación', body: event.data.text() };
    }
  } else {
    payload = { title: 'Nueva notificación', body: 'Tienes una nueva notificación' };
  }

  const title = payload.title || 'Nueva notificación';
  const options = {
    body: payload.body || 'Tienes una nueva notificación',
    icon: payload.icon || '/la-coruna.jpg',
    badge: payload.badge || '/la-coruna.jpg',
    data: payload.data || {},
    actions: payload.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Escuchar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('Notificación clickeada', event);

  // Cerrar la notificación
  event.notification.close();

  // Determinar la URL a abrir basada en el tipo de notificación y datos
  let urlToOpen = '/';

  if (event.notification.data) {
    const notificationData = event.notification.data;

    // Manejar diferentes tipos de notificaciones
    if (notificationData.type) {
      switch (notificationData.type) {
        case 'task_alert':
        case 'task_created':
        case 'task_completed':
        case 'task_upcoming':
          // Para notificaciones de tareas, redirigir a la página específica de la tarea
          urlToOpen = notificationData.url || `/dashboard/tasks/${notificationData.taskId || ''}`;
          break;

        case 'spare_request':
        case 'spare_request_approved':
        case 'spare_request_rejected':
          // Para notificaciones de solicitudes de repuestos
          urlToOpen = notificationData.url || `/dashboard/solicitudes/${notificationData.requestId || ''}`;
          break;

        case 'maintenance_reminder':
          // Para recordatorios de mantenimiento
          urlToOpen = notificationData.url || `/dashboard/mantenimientos/${notificationData.maintenanceId || ''}`;
          break;

        default:
          // Para otros tipos de notificaciones, usar la URL proporcionada o ir al dashboard
          urlToOpen = notificationData.url || '/dashboard';
      }
    } else {
      // Si no hay tipo definido, usar la URL proporcionada o ir al dashboard
      urlToOpen = notificationData.url || '/dashboard';
    }
  } else {
    // Si no hay datos, ir al dashboard por defecto
    urlToOpen = '/dashboard';
  }

  event.waitUntil(
    clients.openWindow(urlToOpen)
  );
});

// Escuchar mensajes del cliente
self.addEventListener('message', (event) => {
  console.log('Mensaje recibido del cliente:', event.data);
  
  // Puedes manejar mensajes del cliente aquí si es necesario
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});