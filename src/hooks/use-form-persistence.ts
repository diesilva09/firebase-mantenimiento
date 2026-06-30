"use client"

import { useEffect, useCallback, useState, useRef } from "react"
import type { Control, Path, UseFormSetValue } from "react-hook-form"

/**
 * Hook para persistir los datos de un formulario en sessionStorage.
 * Los datos se mantienen mientras no se recargue la página.
 * 
 * @param formKey - Clave única para identificar el formulario en sessionStorage
 * @param control - Control de react-hook-form
 * @param setValue - Función setValue de react-hook-form
 * @param watch - Función watch de react-hook-form
 * @param options - Opciones adicionales
 */
export function useFormPersistence<T extends Record<string, any>>(
  formKey: string,
  control: Control<T>,
  setValue: UseFormSetValue<T>,
  watch: (callback?: (value: T) => void) => any,
  options?: {
    excludeFields?: string[] // Campos a excluir de la persistencia
    onRestore?: (data: T) => void // Callback cuando se restauran los datos
  }
) {
  const storageKey = `form_persist_${formKey}`
  const [isRestored, setIsRestored] = useState(false)
  const lastSavedData = useRef<string | null>(null)

  // Restaurar datos al montar el componente (solo una vez)
  useEffect(() => {
    if (isRestored) return

    try {
      const savedData = sessionStorage.getItem(storageKey)
      if (savedData && savedData !== lastSavedData.current) {
        const parsed = JSON.parse(savedData) as T

        const excludedFields = new Set(options?.excludeFields ?? [])

        // Restaurar cada campo
        Object.entries(parsed).forEach(([key, value]) => {
          if (excludedFields.has(key)) {
            return
          }

          if (value !== undefined && value !== null) {
            setValue(key as Path<T>, value as any, {
              shouldValidate: false,
              shouldDirty: true,
            })
          }
        })

        lastSavedData.current = savedData

        // Llamar callback si existe
        if (options?.onRestore) {
          options.onRestore(parsed)
        }
      }
    } catch (e) {
      console.warn("Error restaurando formulario de sessionStorage:", e)
    }

    setIsRestored(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formKey, setValue, options?.onRestore])

  // Guardar datos cuando cambien los valores
  useEffect(() => {
    if (!isRestored || !watch) return

    const subscription = watch((value) => {
      if (!value || Object.keys(value).length === 0) return
      
      // No guardar si el formulario está vacío (solo valores por defecto)
      const hasValues = Object.values(value).some(
        (v) => v !== "" && v !== undefined && v !== null && v !== false
      )
      
      if (hasValues) {
        const dataToSave = { ...value } as T
        
        // Excluir campos si se especificaron
        if (options?.excludeFields) {
          options.excludeFields.forEach((field) => {
            delete dataToSave[field as keyof T]
          })
        }
        
        const dataString = JSON.stringify(dataToSave)
        
        // Solo guardar si los datos cambiaron
        if (dataString !== lastSavedData.current) {
          try {
            sessionStorage.setItem(storageKey, dataString)
            lastSavedData.current = dataString
          } catch (e) {
            console.warn("Error guardando formulario en sessionStorage:", e)
          }
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [watch, isRestored, storageKey, options?.excludeFields])

  // Función para limpiar los datos persistidos
  const clearPersistedData = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey)
      lastSavedData.current = null
    } catch (e) {
      console.warn("Error limpiando sessionStorage:", e)
    }
  }, [storageKey])

  // Función para verificar si hay datos persistidos
  const hasPersistedData = useCallback(() => {
    try {
      return !!sessionStorage.getItem(storageKey)
    } catch (e) {
      return false
    }
  }, [storageKey])

  return { clearPersistedData, hasPersistedData, isRestored }
}

/**
 * Hook para persistir datos de estado local (useState)
 * útil para formularios que no usan react-hook-form
 */
export function useStatePersistence<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const storageKey = `state_persist_${key}`
  
  // Función para obtener valor inicial
  const getInitialValue = (): T => {
    if (typeof window === "undefined") return defaultValue
    try {
      const saved = sessionStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : defaultValue
    } catch {
      return defaultValue
    }
  }

  // Estado con valor inicial de sessionStorage
  const [state, setState] = useState<T>(getInitialValue)

  // Guardar en sessionStorage cuando cambie el estado
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state))
    } catch (e) {
      console.warn("Error guardando estado en sessionStorage:", e)
    }
  }, [state, storageKey])

  // Función para limpiar
  const clearState = useCallback(() => {
    if (typeof window === "undefined") return
    try {
      sessionStorage.removeItem(storageKey)
      setState(defaultValue)
    } catch (e) {
      console.warn("Error limpiando sessionStorage:", e)
    }
  }, [defaultValue, storageKey])

  return [state, setState, clearState]
}
