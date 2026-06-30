"use client"

import React, { useEffect, useState } from "react"
import { Image as ImageIcon, FileText, ExternalLink, Download, Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getDisplayFileName, getFileExtensionLabel, getStoredFileId } from "@/lib/file-display"

interface MultiFileViewerProps {
  /** Comma-separated URLs or a single URL */
  urls: string | null | undefined
  /** Label to display before the files */
  label: string
  /** Color variant for styling */
  variant?: "blue" | "green" | "orange"
  /** Show image thumbnails (true) or just file links (false) */
  isImage?: boolean
  onDeleteFile?: (url: string) => void | Promise<void>
  deletingUrl?: string | null
}

const variantClasses = {
  blue: {
    badge: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    icon: "text-blue-600",
  },
  green: {
    badge: "bg-green-50 text-green-700 hover:bg-green-100",
    icon: "text-green-600",
  },
  orange: {
    badge: "bg-orange-50 text-orange-700 hover:bg-orange-100",
    icon: "text-orange-600",
  },
}

/**
 * Splits a comma-separated URL string into an array
 */
function parseUrls(urls: string | null | undefined): string[] {
  if (!urls) return []
  return urls
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean)
}

function isGoogleDriveUrl(url: string): boolean {
  return url.includes("drive.google.com")
}

/**
 * Renders a comma-separated list of file URLs as compact links or thumbnails.
 */
export function MultiFileViewer({
  urls,
  label,
  variant = "blue",
  isImage = true,
  onDeleteFile,
  deletingUrl = null,
}: MultiFileViewerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileNames, setFileNames] = useState<Record<string, string>>({})
  const parsedUrls = parseUrls(urls)
  const { toast } = useToast()

  if (parsedUrls.length === 0) return null

  const styles = variantClasses[variant]

  useEffect(() => {
    let isMounted = true

    const resolveStoredFileNames = async () => {
      const pendingUrls = parsedUrls.filter((url) => {
        const directName = getDisplayFileName(url)
        const storedFileId = getStoredFileId(url)

        return !directName && Boolean(storedFileId) && !fileNames[url]
      })

      if (pendingUrls.length === 0) return

      const resolvedEntries = await Promise.all(
        pendingUrls.map(async (url) => {
          const storedFileId = getStoredFileId(url)
          if (!storedFileId) return null

          try {
            const response = await fetch(`/api/archivos?id=${storedFileId}&metadata=1`)
            if (!response.ok) return null

            const data = await response.json()
            return [url, data.nombre as string] as const
          } catch {
            return null
          }
        })
      )

      if (!isMounted) return

      const nextNames = Object.fromEntries(
        resolvedEntries.filter((entry): entry is readonly [string, string] => Boolean(entry))
      )

      if (Object.keys(nextNames).length > 0) {
        setFileNames((prev) => ({ ...prev, ...nextNames }))
      }
    }

    void resolveStoredFileNames()

    return () => {
      isMounted = false
    }
  }, [fileNames, parsedUrls])

  const getFileName = (url: string) => {
    return fileNames[url] || getDisplayFileName(url) || "Archivo adjunto"
  }

  const handleDownload = async (url: string, fileName: string) => {
    if (isGoogleDriveUrl(url)) {
      window.open(url, "_blank")
      return
    }
    
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error("Error downloading file:", error)
      toast({
        title: "Error al descargar",
        description: "No se pudo descargar el archivo. Inténtelo de nuevo.",
        variant: "destructive"
      })
    }
  }

  return (
    <>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs font-medium flex items-center gap-1">
          {isImage ? (
            <ImageIcon className={`h-3.5 w-3.5 ${styles.icon}`} />
          ) : (
            <FileText className={`h-3.5 w-3.5 ${styles.icon}`} />
          )}
          {label} ({parsedUrls.length})
        </span>

        <div className="flex flex-wrap gap-2">
          {parsedUrls.map((url, i) => (
            <div key={i} className="flex items-center gap-1">
              {isImage ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (isGoogleDriveUrl(url)) {
                        window.open(url, "_blank")
                      } else {
                        setPreviewUrl(url)
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded ${styles.badge} text-[10px] sm:text-xs transition-colors cursor-pointer hover:opacity-80`}
                  >
                    <ImageIcon className="h-3 w-3" />
                    {getFileName(url)}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(url, getFileName(url))
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded ${styles.badge} text-[10px] sm:text-xs transition-colors cursor-pointer hover:opacity-80`}
                    title={isGoogleDriveUrl(url) ? "Abrir en Google Drive" : "Descargar"}
                  >
                    {isGoogleDriveUrl(url) ? <ExternalLink className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                  </button>
                  {onDeleteFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void onDeleteFile(url)
                      }}
                      disabled={deletingUrl === url}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded ${styles.badge} text-[10px] sm:text-xs transition-colors cursor-pointer hover:opacity-80 disabled:pointer-events-none disabled:opacity-60`}
                      title="Eliminar"
                    >
                      {deletingUrl === url ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded ${styles.badge} text-[10px] sm:text-xs transition-colors`}
                  >
                    <FileText className="h-3 w-3" />
                    <span>{getFileName(url)}</span>
                    <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                      {getFileExtensionLabel(getFileName(url))}
                    </span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      handleDownload(url, getFileName(url))
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded ${styles.badge} text-[10px] sm:text-xs transition-colors cursor-pointer hover:opacity-80`}
                    title="Descargar"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                  {onDeleteFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        void onDeleteFile(url)
                      }}
                      disabled={deletingUrl === url}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded ${styles.badge} text-[10px] sm:text-xs transition-colors cursor-pointer hover:opacity-80 disabled:pointer-events-none disabled:opacity-60`}
                      title="Eliminar"
                    >
                      {deletingUrl === url ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              {label}
              <button
                type="button"
                onClick={() => previewUrl && handleDownload(previewUrl, getFileName(previewUrl))}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded ${styles.badge} text-xs transition-colors cursor-pointer hover:opacity-80`}
                title={previewUrl && isGoogleDriveUrl(previewUrl) ? "Abrir en Google Drive" : "Descargar imagen"}
              >
                {previewUrl && isGoogleDriveUrl(previewUrl) ? (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Abrir en Drive
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Descargar
                  </>
                )}
              </button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center">
            {previewUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewUrl}
                alt={label}
                className="max-h-[70vh] w-auto rounded-md object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Renders the combined section with before/after images + attachments
 */
export function MultiFileSection({
  imagenAntesUrl,
  imagenDespuesUrl,
  anexoUrl,
}: {
  imagenAntesUrl?: string | null
  imagenDespuesUrl?: string | null
  anexoUrl?: string | null
}) {
  const hasAny = imagenAntesUrl || imagenDespuesUrl || anexoUrl
  if (!hasAny) return null

  return (
    <div className="flex flex-col gap-3 sm:col-span-2 pt-2 border-t mt-2">
      <MultiFileViewer urls={imagenAntesUrl} label="Fotos Antes" variant="blue" isImage />
      <MultiFileViewer urls={imagenDespuesUrl} label="Fotos Después" variant="green" isImage />
      <MultiFileViewer urls={anexoUrl} label="Archivos Anexos" variant="orange" isImage={false} />
    </div>
  )
}
