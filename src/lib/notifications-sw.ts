// register-service-worker.ts
// Archivo para registrar el service worker de notificaciones

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // Registrar el service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registrado con éxito:', registration.scope);
      
      // Escuchar mensajes del service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Mensaje recibido del service worker:', event.data);
      });
      
      return registration;
    } catch (error) {
      console.error('Error registrando el Service Worker:', error);
      return null;
    }
  } else {
    console.log('Service Worker no soportado en este navegador');
    return null;
  }
};

// Función para verificar si el service worker está registrado
export const isServiceWorkerRegistered = async (): Promise<boolean> => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    return registration !== null;
  }
  return false;
};
