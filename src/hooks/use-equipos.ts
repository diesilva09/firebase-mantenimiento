// hooks/use-equipos.ts
import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

// Definir los tipos que faltan
type EquipmentArea = "conservas" | "salsas" | "frutos" | "etiquetado" | "ptar" | "servicio de apoyo" | "logistica" | "locativo" | "medicion"

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
      // 1) Intentar cargar desde la API
      const res = await fetch('/api/equipos')
      if (res.ok) {
        const json = await res.json()
        const data = Array.isArray(json?.data) ? json.data : []
        
        if (data.length > 0) {
          const fromDb: StoredEquipment[] = data.map((row: any) => ({
            id: String(row.id),
            codigo: row.codigo ?? '',
            version: '',
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
            imageDataUrl: row.imagen_url ?? null,
            attachmentsUrl: row.attachments_url ?? '',
          }))

          setEquipos(fromDb)
          localStorage.setItem('equipos', JSON.stringify(fromDb))
          return
        }
      }
      
      // 2) Fallback a localStorage
      const raw = localStorage.getItem('equipos')
      if (raw) {
        setEquipos(JSON.parse(raw))
      }
    } catch (error) {
      console.warn('Error loading equipment:', error)
      const raw = localStorage.getItem('equipos')
      if (raw) {
        setEquipos(JSON.parse(raw))
      }
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
          imagenUrl: imageDataUrl ?? null,
          attachmentsUrl: equipoData.attachmentsUrl ?? null,
        }),
      })

      if (!response.ok) throw new Error('API error')

      // Actualizar estado local
      const newEquipo: StoredEquipment = {
        id: Date.now().toString(),
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
        imageDataUrl: imageDataUrl ?? null,
        attachmentsUrl: equipoData.attachmentsUrl ?? '',
      }

      setEquipos(prev => [newEquipo, ...prev])
      localStorage.setItem('equipos', JSON.stringify([newEquipo, ...equipos]))
      
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
        attachmentsUrl: equipoData.attachmentsUrl ?? currentEquipo.attachmentsUrl,
      }

      // Actualizar en API
      const response = await fetch('/api/equipos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id,
          ...equipoData,
          imagenUrl: imageDataUrl !== undefined ? imageDataUrl : currentEquipo.imageDataUrl,
          attachmentsUrl: equipoData.attachmentsUrl ?? currentEquipo.attachmentsUrl ?? null,
        }),
      })

      if (!response.ok) throw new Error('API update error')

      // Actualizar estado local
      setEquipos(prev => prev.map(e => e.id === id ? updatedEquipo : e))
      localStorage.setItem('equipos', JSON.stringify(equipos.map(e => e.id === id ? updatedEquipo : e)))
      
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
      } catch {
        errorMessage = `Error ${response.status}: ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('✅ Eliminación exitosa:', result)

    // Eliminar localmente
    const updatedEquipos = equipos.filter(e => e.id !== id)
    setEquipos(updatedEquipos)
    localStorage.setItem('equipos', JSON.stringify(updatedEquipos))
    
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