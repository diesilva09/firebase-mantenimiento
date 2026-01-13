// hooks/use-equipos.ts
import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

// Definir los tipos que faltan
type EquipmentArea = "conservas" | "salsas" | "frutos" | "etiquetado" | "ptar" | "servicio de apoyo" | "logistica" | "locativo" | "medicion"
type EquipmentStatus = "Operativo" | "En mantenimiento" | "Fuera de servicio" | "En backup"

interface EquipmentForm {
  codigo: string
  version?: string
  fechaImplementacion?: string
  nombre: string
  marca?: string
  modelo?: string
  fabricante?: string
  fechaAdquisicion?: string
  image?: any
  area?: EquipmentArea
  linea?: string
  capacidad?: string
  amperaje?: string
  potencia?: string
  voltaje?: string
  rpm?: string
  magnitudMedida?: string
  estado?: EquipmentStatus
  attachmentsUrl?: string
}

interface StoredEquipment extends Omit<EquipmentForm, "image"> {
  id: string
  imageDataUrl?: string | null
  attachmentsUrl?: string
}

export function useEquipos() {
  const [equipos, setEquipos] = useState<StoredEquipment[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadEquipos()
  }, [])

  const loadEquipos = async () => {
    setLoading(true)
    try {
      // Cargar siempre desde la API y reflejar exactamente lo que devuelva
      const res = await fetch('/api/equipos')
      if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}`)
      }

      const json = await res.json()
      const data = Array.isArray(json?.data) ? json.data : []

      const fromDb: StoredEquipment[] = data.map((row: any) => ({
        id: String(row.id),
        codigo: row.codigo ?? '',
        version: row.version ?? '',
        fechaImplementacion: row.fecha_implementacion ?? '',
        nombre: row.nombre ?? '',
        marca: row.marca ?? '',
        modelo: row.modelo ?? '',
        fabricante: row.fabricante ?? '',
        fechaAdquisicion: row.fecha_adquisicion ?? '',
        area: row.area ?? 'conservas',
        linea: row.linea ?? '',
        capacidad: row.capacidad ?? '',
        amperaje: row.amperaje ?? '',
        potencia: row.potencia ?? '',
        voltaje: row.voltaje ?? '',
        rpm: row.rpm ?? '',
        magnitudMedida: row.magnitud_medida ?? '',
        estado: (row.estado as EquipmentStatus) ?? 'Operativo',
        imageDataUrl: row.imagen_url ?? null,
        attachmentsUrl: row.attachments_url ?? '',
      }))

      setEquipos(fromDb)
      try {
        localStorage.setItem('equipos', JSON.stringify(fromDb))
      } catch {
        // si falla el localStorage, no rompemos la carga principal
      }
    } catch (error) {
      console.warn('Error loading equipment:', error)
    } finally {
      setLoading(false)
    }
  } 

  const createEquipo = async (equipoData: EquipmentForm): Promise<boolean> => {
    try {
      const file = equipoData.image && equipoData.image[0]
      let imageDataUrl: string | undefined
      
      // Convertir imagen a Data URL si existe
      if (file) {
        imageDataUrl = await readFileAsDataUrl(file)
      }

      const equipoToSave = {
        ...equipoData,
        imageDataUrl,
        id: Date.now().toString()
      }

      // Intentar guardar en la API
      const response = await fetch('/api/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: equipoData.codigo,
          version: equipoData.version ?? null,
          nombre: equipoData.nombre,
          area: equipoData.area,
          linea: equipoData.linea,
          marca: equipoData.marca,
          modelo: equipoData.modelo,
          fabricante: equipoData.fabricante,
          fechaImplementacion: equipoData.fechaImplementacion,
          fechaAdquisicion: equipoData.fechaAdquisicion,
          capacidad: equipoData.capacidad,
          amperaje: equipoData.amperaje,
          potencia: equipoData.potencia,
          voltaje: equipoData.voltaje,
          rpm: equipoData.rpm,
          magnitudMedida: equipoData.magnitudMedida,
          estado: equipoData.estado ?? 'Operativo',
          imagen_url: imageDataUrl ?? null,
          attachmentsUrl: equipoData.attachmentsUrl ?? null,
        }),
      })

      if (!response.ok) throw new Error('API error')
      
      const saved = await response.json()

      // Actualizar estado local
      const newEquipo: StoredEquipment = {
        id: String(saved.id),
        codigo: equipoData.codigo,
        version: equipoData.version ?? '',
        fechaImplementacion: equipoData.fechaImplementacion ?? '',
        nombre: equipoData.nombre,
        marca: equipoData.marca ?? '',
        modelo: equipoData.modelo ?? '',
        fabricante: equipoData.fabricante ?? '',
        fechaAdquisicion: equipoData.fechaAdquisicion ?? '',
        area: equipoData.area ?? 'conservas',
        linea: equipoData.linea ?? '',
        capacidad: equipoData.capacidad ?? '',
        amperaje: equipoData.amperaje ?? '',
        potencia: equipoData.potencia ?? '',
        voltaje: equipoData.voltaje ?? '',
        rpm: equipoData.rpm ?? '',
        magnitudMedida: equipoData.magnitudMedida ?? '',
        estado: equipoData.estado ?? 'Operativo',
        imageDataUrl: imageDataUrl ?? null,
        attachmentsUrl: equipoData.attachmentsUrl ?? '',
      }

      await loadEquipos()
      
      toast({ 
        title: 'Equipo creado', 
        description: 'El equipo se ha creado correctamente.' 
      })
      
      return true
    } catch (error) {
      console.error('Error creating equipment:', error)
      toast({
        title: 'Error',
        description: 'No se pudo crear el equipo',
        variant: 'destructive'
      })
      return false
    }
  }

  const updateEquipo = async (id: string, equipoData: EquipmentForm): Promise<boolean> => {
    try {
      const file = equipoData.image && equipoData.image[0]
      let imageDataUrl: string | undefined
      
      if (file) {
        imageDataUrl = await readFileAsDataUrl(file)
      }

      // Buscar equipo actual para preservar imagen si no hay nueva
      const currentEquipo = equipos.find(e => e.id === id)
      if (!currentEquipo) {
        throw new Error('Equipment not found')
      }

      const updatedEquipo: StoredEquipment = {
        ...currentEquipo,
        ...equipoData,
        imageDataUrl: imageDataUrl !== undefined ? imageDataUrl : currentEquipo.imageDataUrl,
        estado: equipoData.estado ?? currentEquipo.estado ?? 'Operativo',
        attachmentsUrl: equipoData.attachmentsUrl ?? currentEquipo.attachmentsUrl,
      }

      // Actualizar en API
      const response = await fetch('/api/equipos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          // campos que espera el API (snake_case)
          codigo: equipoData.codigo,
          version: equipoData.version ?? currentEquipo.version ?? null,
          nombre: equipoData.nombre,
          area: equipoData.area,
          linea: equipoData.linea,
          marca: equipoData.marca,
          modelo: equipoData.modelo,
          fabricante: equipoData.fabricante,
          fecha_implementacion: equipoData.fechaImplementacion ?? currentEquipo.fechaImplementacion ?? null,
          fecha_adquisicion: equipoData.fechaAdquisicion ?? currentEquipo.fechaAdquisicion ?? null,
          capacidad: equipoData.capacidad ?? currentEquipo.capacidad ?? null,
          amperaje: equipoData.amperaje ?? currentEquipo.amperaje ?? null,
          potencia: equipoData.potencia ?? currentEquipo.potencia ?? null,
          voltaje: equipoData.voltaje ?? currentEquipo.voltaje ?? null,
          rpm: equipoData.rpm ?? currentEquipo.rpm ?? null,
          magnitud_medida: equipoData.magnitudMedida ?? currentEquipo.magnitudMedida ?? null,
          estado: equipoData.estado ?? currentEquipo.estado ?? 'Operativo',
          imagen_url: imageDataUrl !== undefined ? imageDataUrl : currentEquipo.imageDataUrl ?? null,
          attachments_url: equipoData.attachmentsUrl ?? currentEquipo.attachmentsUrl ?? null,
        }),
      })

      if (!response.ok) {
        // Intentar obtener mensaje detallado desde la API
        let errorMessage = 'API update error'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.details || `HTTP ${response.status}`
        } catch {
          errorMessage = `Error ${response.status}: ${response.statusText}`
        }

        throw new Error(errorMessage)
      }

      // Volver a cargar desde la API para mantener todo consistente
      await loadEquipos()
      
      toast({ 
        title: 'Equipo actualizado', 
        description: 'Los cambios se han guardado correctamente.' 
      })
      
      return true
    } catch (error) {
      console.error('Error updating equipment:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el equipo',
        variant: 'destructive'
      })
      return false
    }
  }

  const deleteEquipo = async (id: string): Promise<boolean> => {
    try {
      console.log('🔄 Eliminando equipo ID:', id)

      // Eliminar de la API
      const response = await fetch(`/api/equipos?id=${id}`, {
        method: 'DELETE',
      })

      console.log('📡 Response status:', response.status)

      if (!response.ok) {
        // Obtener el error real de la API
        let errorMessage = 'Error del servidor'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.details || `HTTP ${response.status}`

          // Caso especial: 404 Equipment not found → ya estaba borrado en la BD
          if (response.status === 404 && errorMessage.toLowerCase().includes('equipment not found')) {
            console.warn('⚠️ Equipo no encontrado en BD al eliminar; limpiando localmente de todas formas.')

            const updatedEquipos = equipos.filter(e => e.id !== id)
            setEquipos(updatedEquipos)
            try {
              localStorage.setItem('equipos', JSON.stringify(updatedEquipos))
            } catch (storageError) {
              console.warn('⚠️ No se pudo actualizar localStorage después de eliminar equipo (404):', storageError)
            }

            toast({
              title: 'Equipo eliminado',
              description: 'El equipo ya no existía en la base de datos, se ha limpiado de la lista local.',
            })

            return true
          }
        } catch {
          errorMessage = `Error ${response.status}: ${response.statusText}`
        }

        // Si no es el caso especial 404, lanzar error normal
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('✅ Eliminación exitosa:', result)

      // Eliminar localmente
      const updatedEquipos = equipos.filter(e => e.id !== id)
      setEquipos(updatedEquipos)

      // Guardar en localStorage solo si es posible, sin romper la operación
      try {
        localStorage.setItem('equipos', JSON.stringify(updatedEquipos))
      } catch (storageError) {
        console.warn('⚠️ No se pudo actualizar localStorage después de eliminar equipo:', storageError)
      }

      toast({
        title: '✅ Equipo eliminado',
        description: 'El equipo se ha eliminado correctamente.'
      })

      return true

    } catch (error) {
      console.error('❌ Error completo eliminando equipo:', error)

      toast({
        title: '❌ Error al eliminar',
        description: `No se pudo eliminar el equipo: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        variant: 'destructive'
      })

      return false
    }
  }

  // Función auxiliar para leer archivos
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = (err) => reject(err)
      reader.readAsDataURL(file)
    })
  }

  return {
    equipos,
    loading,
    createEquipo,
    updateEquipo,
    deleteEquipo,
    refreshEquipos: loadEquipos
  }
}