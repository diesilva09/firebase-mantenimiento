// Importar firebase-messaging para que funcione en el service worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Configuración de Firebase (debe coincidir con la configuración en el cliente)
const firebaseConfig = {
  apiKey: "AIzaSyBt2K9mYv3i7Y4i43f5K0j9K2j4H5R8G1E",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456",
  measurementId: "G-XXXXXXXXXX"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Escuchar mensajes cuando la app está en segundo plano
messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/la-coruna.jpg' // Icono de notificación
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Escuchar eventos de notificación
self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received: ', event);

  event.notification.close();

  // Abrir la aplicación cuando se hace clic en la notificación
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});