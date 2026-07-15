"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Error global:", error)
  }, [error])

  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", textAlign: "center" }}>
        <h2 style={{ marginBottom: "0.5rem" }}>Error de la aplicación</h2>
        <p style={{ color: "#666", marginBottom: "1.5rem" }}>
          Se produjo un error crítico. Recarga la página para continuar.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "0.5rem 1rem",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  )
}
