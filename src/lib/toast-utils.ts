export function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export function isNetworkError(error: unknown): boolean {
  if (isBrowserOffline()) return true;

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'string'
        ? error.toLowerCase()
        : '';

  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('load failed') ||
    message.includes('sin conexión') ||
    message.includes('sin conexion')
  );
}

export function getOperationErrorMessage(
  error?: unknown,
  fallbackDescription = 'Ocurrió un error inesperado. Inténtalo nuevamente.',
): { title: string; description: string } {
  if (isBrowserOffline() || isNetworkError(error)) {
    return {
      title: 'Sin conexión a internet',
      description:
        'No se pudo completar la operación porque perdiste la conexión. Revisa tu red Wi‑Fi o datos móviles e inténtalo de nuevo.',
    };
  }

  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.trim();
    if (msg !== 'Error al guardar en la BD' && msg !== 'Error al eliminar en la BD') {
      return { title: 'Error', description: msg };
    }
  }

  return { title: 'Error', description: fallbackDescription };
}
