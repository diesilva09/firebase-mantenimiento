import { z } from 'zod'

export const repuestoSchema = z.object({
  codigo: z.string().min(1, 'Requerido'),
  nombre: z.string().min(1, 'Requerido'),
  categoria: z.enum(['Mecanico', 'Neumatico', 'Electrico', 'Otro'], { required_error: 'Seleccione una categoría' }),
  subcategoria: z.string().optional(),
  codigoCompra: z.string().optional(),
  proveedor: z.string().optional(),
  precio: z.number({ invalid_type_error: 'Debe ser un número' }).min(0, 'No puede ser negativo').optional(),
  unidad: z.string().min(1, 'Requerido'),
  stockMaximo: z.number({ invalid_type_error: 'Debe ser un número' }).min(0, 'No puede ser negativo'),
  stockMinimo: z.number({ invalid_type_error: 'Debe ser un número' }).min(0, 'No puede ser negativo'),
  stockActual: z.number({ invalid_type_error: 'Debe ser un número' }).min(0, 'No puede ser negativo'),
  ubicacion: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  notas: z.string().optional(),
  descripcion: z.string().optional(),
  imagen: z.any().optional(),
})

export type RepuestoForm = z.infer<typeof repuestoSchema>

export type RepuestoItem = RepuestoForm & {
  id: number
  descripcion?: string | null
  imagen_url?: string | null
  stockInicial: number
  precio?: number | null
}

export const CATEGORIAS = ['Mecanico', 'Neumatico', 'Electrico', 'Otro'] as const

export const CATEGORIA_LABELS: Record<(typeof CATEGORIAS)[number], string> = {
  Mecanico: 'Mecánico',
  Neumatico: 'Neumático',
  Electrico: 'Eléctrico',
  Otro: 'Otro',
}

export const CATEGORIA_SUBCATEGORIAS: Record<string, string[]> = {
  Mecanico: ['Rodamientos', 'Correas', 'Engranes', 'Estructuras'],
  Neumatico: ['Válvulas', 'Cilindros', 'Racores', 'Mangueras'],
  Electrico: ['Sensores', 'Motores', 'Contactores', 'Interruptores', 'Cableado'],
}
