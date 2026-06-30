"use client"

import React, { useEffect, useRef, useState } from "react"
import { X, FileText, Camera, Loader2, Plus, ExternalLink, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getDisplayFileName, getFileExtensionLabel, getStoredFileId } from "@/lib/file-display"

interface MultiFileUploaderProps {
  value: string // Comma-separated list of URLs
  onChange: (value: string) => void
  accept?: string
  label?: string
  maxSizeMB?: number | null // null = sin límite
  maxFiles?: number | null
  isImageOnly?: boolean
  showCamera?: boolean // Mostrar botón de tomar foto
  uploadMode?: "immediate" | "manual"
  uploadButtonLabel?: string
}

export function MultiFileUploader({
  value,
  onChange,
  accept = "*/*",
  label = "Subir archivos",
  maxSizeMB = null, // Sin límite por defecto
  maxFiles = null,
  isImageOnly = false,
  showCamera = true, // Mostrar cámara por defecto
  uploadMode = "immediate",
  uploadButtonLabel = "Adjuntar",
}: MultiFileUploaderProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFiles, setUploadingFiles] = useState<{ id: string; name: string }[]>([])
  const [fileNames, setFileNames] = useState<Record<string, string>>({})
  const [pendingFiles, setPendingFiles] = useState<{ id: string; file: File }[]>([])

  // Parse existing files
  const filesList = value
    ? value
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean)
    : []
  const hasFileLimit = typeof maxFiles === "number" && Number.isFinite(maxFiles)
  const isManualUpload = uploadMode === "manual"
  const visibleUploadedFiles = isManualUpload ? [] : filesList

  useEffect(() => {
    let isMounted = true

    const resolveStoredFileNames = async () => {
      const pendingUrls = filesList.filter((url) => {
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
  }, [fileNames, filesList])

  const validateFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return []

    const remainingSlots = hasFileLimit
      ? Math.max(0, (maxFiles as number) - filesList.length - uploadingFiles.length - pendingFiles.length)
      : Number.POSITIVE_INFINITY

    if (hasFileLimit && remainingSlots <= 0) {
      toast({
        title: "Límite de archivos alcanzado",
        description: `Solo puedes subir un máximo de ${maxFiles} archivos.`,
        variant: "destructive",
      })
      return []
    }

    const filesToUpload = hasFileLimit
      ? Array.from(files).slice(0, remainingSlots)
      : Array.from(files)
    const validFiles: File[] = []

    for (const file of filesToUpload) {
      if (maxSizeMB !== null && file.size > maxSizeMB * 1024 * 1024) {
        toast({
          title: "Archivo muy pesado",
          description: `El archivo ${file.name} supera el tamaño límite de ${maxSizeMB}MB.`,
          variant: "destructive",
        })
        continue
      }

      validFiles.push(file)
    }

    return validFiles
  }

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return

    const currentUrls = [...filesList]
    const uploadedEntries: { url: string; name: string }[] = []

    for (const file of files) {
      const tempId = Math.random().toString(36).substring(7)
      setUploadingFiles((prev) => [...prev, { id: tempId, name: file.name }])

      const formData = new FormData()
      formData.append("file", file)

      try {
        const response = await fetch("/api/archivos", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Error en la subida")
        }

        const data = await response.json()
        const newUrl = data.url
        const uploadedFileName = typeof data.nombre === "string" ? data.nombre : file.name

        currentUrls.push(newUrl)
        uploadedEntries.push({ url: newUrl, name: uploadedFileName })
      } catch (error) {
        console.error("Upload error:", error)
        toast({
          title: "Error de subida",
          description: `No se pudo subir el archivo ${file.name}. Inténtalo de nuevo.`,
          variant: "destructive",
        })
      } finally {
        // Remove from uploading list
        setUploadingFiles((prev) => prev.filter((item) => item.id !== tempId))
      }
    }

    if (uploadedEntries.length > 0) {
      setFileNames((prev) => ({
        ...prev,
        ...Object.fromEntries(uploadedEntries.map((entry) => [entry.url, entry.name])),
      }))
      onChange(currentUrls.join(","))
    }
  }

  const handleUpload = async (files: FileList | null) => {
    const validFiles = validateFiles(files)
    if (validFiles.length === 0) return

    if (isManualUpload) {
      setPendingFiles((prev) => [
        ...prev,
        ...validFiles.map((file) => ({
          id: Math.random().toString(36).substring(7),
          file,
        })),
      ])
      return
    }

    await uploadFiles(validFiles)
  }

  const handleConfirmUpload = async () => {
    if (pendingFiles.length === 0) return

    const filesToUpload = pendingFiles.map((item) => item.file)
    setPendingFiles([])
    await uploadFiles(filesToUpload)
  }

  const handleRemovePending = (idToDelete: string) => {
    setPendingFiles((prev) => prev.filter((item) => item.id !== idToDelete))
  }

  const handleDelete = (indexToDelete: number) => {
    const updatedList = filesList.filter((_, idx) => idx !== indexToDelete)
    onChange(updatedList.join(","))
  }

  const isGoogleDriveUrl = (url: string) => {
    return url.includes("drive.google.com")
  }

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

  const isImageUrl = (url: string) => {
    const fileName = getFileName(url).toLowerCase()
    return (
      isImageOnly ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".png") ||
      fileName.endsWith(".webp") ||
      fileName.endsWith(".gif") ||
      fileName.endsWith(".bmp") ||
      fileName.endsWith(".svg")
    )
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const triggerCameraInput = () => {
    cameraInputRef.current?.click()
  }

  return (
    <div className="space-y-3">
      {/* File inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          void handleUpload(e.target.files)
          e.currentTarget.value = ""
        }}
      />
      
      {/* Dedicated Camera Input (Mobile capture environment) */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void handleUpload(e.target.files)
          e.currentTarget.value = ""
        }}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Uploaded Files grid */}
        {visibleUploadedFiles.map((url, idx) => (
          <div
            key={url + idx}
            className="group relative border rounded-lg overflow-hidden bg-card h-24 sm:h-28 transition-all duration-300 hover:shadow-md border-border"
          >
            {(() => {
              const fileName = getFileName(url)
              const fileTypeLabel = getFileExtensionLabel(fileName)

              return isImageUrl(url) ? (
                // Image Preview
                <>
                  <img
                    src={url}
                    alt={fileName}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      ;(e.target as HTMLElement).style.display = "none"
                      const sibling = (e.target as HTMLElement).nextElementSibling as HTMLElement
                      if (sibling) sibling.style.display = "flex"
                    }}
                  />
                  <div
                    style={{ display: "none" }}
                    className="w-full h-full flex-col items-center justify-center text-muted-foreground p-2"
                  >
                    <FileText className="h-7 w-7 text-primary/70 mb-1" />
                    <span className="max-w-full rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-slate-600">
                      {fileTypeLabel}
                    </span>
                    <span className="mt-1 text-[9px] sm:text-[10px] text-center break-all line-clamp-2 max-w-full font-medium">
                      {fileName}
                    </span>
                  </div>
                </>
              ) : (
                // Generic File View
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2 bg-slate-50">
                  <FileText className="h-7 w-7 text-blue-600 mb-1" />
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-blue-700">
                    {fileTypeLabel}
                  </span>
                  <span className="mt-1 text-[9px] sm:text-[10px] text-center break-all line-clamp-2 max-w-full font-medium text-slate-700 px-1">
                    {fileName}
                  </span>
                </div>
              )
            })()}

            {/* Overlays - always visible on touch devices */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white text-slate-800 rounded-full hover:bg-slate-100 transition-colors shadow-sm"
                title="Ver archivo"
              >
                <ExternalLink className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </a>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  handleDownload(url, getFileName(url))
                }}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-sm"
                title={isGoogleDriveUrl(url) ? "Abrir en Google Drive" : "Descargar"}
              >
                {isGoogleDriveUrl(url) ? <ExternalLink className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> : <Download className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(idx)}
                className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-sm"
                title="Eliminar"
              >
                <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {pendingFiles.map((item) => {
          const fileTypeLabel = getFileExtensionLabel(item.file.name)

          return (
            <div
              key={item.id}
              className="group relative border rounded-lg overflow-hidden bg-amber-50 h-24 sm:h-28 flex flex-col items-center justify-center p-2 border-dashed border-amber-300"
            >
              <FileText className="h-7 w-7 text-amber-600 mb-1" />
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-amber-700">
                {fileTypeLabel}
              </span>
              <span className="mt-1 text-[9px] sm:text-[10px] text-center break-all line-clamp-2 max-w-full font-medium text-slate-700 px-1">
                {item.file.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemovePending(item.id)}
                className="absolute right-1.5 top-1.5 rounded-full bg-white p-1 text-red-600 shadow-sm hover:bg-red-50"
                title="Quitar de la cola"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}

        {/* Uploading indicator cards */}
        {uploadingFiles.map((item) => (
          <div
            key={item.id}
            className="border border-dashed rounded-lg bg-slate-50/50 h-24 sm:h-28 flex flex-col items-center justify-center p-2 text-muted-foreground animate-pulse"
          >
            <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 text-primary animate-spin mb-1.5" />
            <span className="text-[9px] sm:text-[10px] text-center break-all line-clamp-2 max-w-full font-medium">
              {item.name}
            </span>
            <span className="text-[8px] text-muted-foreground">Subiendo...</span>
          </div>
        ))}

        {/* Add File / Photo Actions */}
        {(!hasFileLimit || filesList.length + uploadingFiles.length < (maxFiles as number)) && (
          <div className={showCamera ? "grid grid-rows-2 gap-1.5 h-24 sm:h-28" : "h-24 sm:h-28"}>
            <button
              type="button"
              onClick={triggerFileInput}
              aria-label={label}
              className={`flex items-center justify-center gap-1.5 border border-dashed rounded-lg text-xs sm:text-sm font-medium text-slate-700 border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-[0.98] ${!showCamera ? "h-full" : ""}`}
            >
              <Plus className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline">{isImageOnly ? "Subir Foto" : "Subir Archivo"}</span>
              <span className="sm:hidden">{isImageOnly ? "Foto" : "Archivo"}</span>
            </button>

            {showCamera && (
              <button
                type="button"
                onClick={triggerCameraInput}
                className="flex items-center justify-center gap-1.5 border border-dashed rounded-lg text-xs sm:text-sm font-medium text-slate-700 border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-[0.98]"
              >
                <Camera className="h-4 w-4 text-slate-500" />
                <span className="hidden sm:inline">Tomar Foto</span>
                <span className="sm:hidden">Cámara</span>
              </button>
            )}
          </div>
        )}
      </div>
      {isManualUpload && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {pendingFiles.length > 0
              ? `${pendingFiles.length} archivo(s) listo(s) para adjuntar.`
              : "Selecciona los archivos y luego pulsa Adjuntar para cargarlos todos."}
          </p>
          <button
            type="button"
            onClick={() => void handleConfirmUpload()}
            disabled={pendingFiles.length === 0 || uploadingFiles.length > 0}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {uploadingFiles.length > 0 ? "Adjuntando..." : uploadButtonLabel}
          </button>
        </div>
      )}
      <p className="text-[9px] sm:text-[10px] text-muted-foreground">
        {hasFileLimit ? `Máximo ${maxFiles} archivos` : "Sin límite de archivos"} {maxSizeMB !== null ? `de hasta ${maxSizeMB}MB cada uno` : "de cualquier tamaño"}. {showCamera ? 'En celulares, "Tomar Foto" activará la cámara.' : ''}
      </p>
    </div>
  )
}
