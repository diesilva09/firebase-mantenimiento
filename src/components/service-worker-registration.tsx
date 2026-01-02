'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/notifications-sw';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Registrar el service worker cuando se monte el componente
    const register = async () => {
      try {
        await registerServiceWorker();
      } catch (error) {
        console.error('Error registrando el service worker:', error);
      }
    };

    // Solo registrar en el cliente (no en el servidor)
    if (typeof window !== 'undefined') {
      register();
    }
  }, []);

  return null; // Este componente no renderiza nada visible
}
