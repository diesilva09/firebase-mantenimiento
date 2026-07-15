/**
 * Fetch del cliente con manejo seguro de red y respuestas inválidas.
 */
export async function safeFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(input, init)
    let body: unknown

    try {
      body = await res.json()
    } catch {
      return { ok: false, error: "Respuesta inválida del servidor" }
    }

    if (!res.ok) {
      const err = body as { error?: string }
      return { ok: false, error: err?.error ?? `Error ${res.status}` }
    }

    return { ok: true, data: body as T }
  } catch (err) {
    const offline = typeof navigator !== "undefined" && !navigator.onLine
    if (offline) {
      return { ok: false, error: "Sin conexión a internet" }
    }
    if (err instanceof TypeError) {
      return { ok: false, error: "No se pudo conectar con el servidor" }
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error de red",
    }
  }
}
