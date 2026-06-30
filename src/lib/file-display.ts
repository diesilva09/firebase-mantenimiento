"use client"

export function getStoredFileId(url: string): string | null {
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost")
    return parsed.pathname === "/api/archivos" ? parsed.searchParams.get("id") : null
  } catch {
    return null
  }
}

export function getDisplayFileName(url: string): string | null {
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost")
    const encodedName = parsed.searchParams.get("name")

    if (encodedName) {
      return decodeURIComponent(encodedName)
    }

    if (parsed.pathname === "/api/archivos") {
      return null
    }

    const lastSegment = parsed.pathname.split("/").pop()
    return lastSegment ? decodeURIComponent(lastSegment) : null
  } catch {
    return null
  }
}

export function getFileExtensionLabel(fileName: string): string {
  const cleanName = fileName.trim()
  const lastDot = cleanName.lastIndexOf(".")

  if (lastDot <= 0 || lastDot === cleanName.length - 1) {
    return "Archivo"
  }

  return cleanName.slice(lastDot + 1).toUpperCase()
}
