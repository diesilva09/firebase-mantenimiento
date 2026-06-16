import { NextResponse } from 'next/server'
import { query } from "@/lib/db"
import sharp from 'sharp'

export async function GET() {
  try {
    // 1. Traer todos los equipos que tienen imagen
    // Seleccionamos solo lo necesario para no saturar la memoria
    // Agregamos un LIMIT para evitar exceder tiempos de ejecución en serverless
    const { rows } = await query("SELECT id, codigo, imagen_url FROM equipos WHERE imagen_url IS NOT NULL LIMIT 100")

    let processed = 0
    let skipped = 0
    let errors = 0

    console.log(`Iniciando optimización de ${rows.length} equipos...`)

    for (const equipo of rows) {
      try {
        const originalString = equipo.imagen_url as string

        // Validar que sea una imagen en base64 válida
        if (!originalString || !originalString.startsWith('data:image')) {
            skipped++
            continue
        }

        // Si la imagen ya es pequeña (menos de 150KB), la ignoramos para ahorrar tiempo
        if (originalString.length < 150 * 1024) {
            skipped++
            continue
        }

        // 2. Convertir Base64 a Buffer (archivo en memoria)
        const parts = originalString.split(';')
        if (parts.length < 2) { skipped++; continue; }
        
        const base64Data = parts[1].split(',')[1]
        if (!base64Data) { skipped++; continue; }

        const inputBuffer = Buffer.from(base64Data, 'base64')

        // 3. Comprimir con Sharp
        const outputBuffer = await sharp(inputBuffer)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true }) // Redimensionar a máx 800px
          .webp({ quality: 70 }) // Convertir a WebP con calidad 70%
          .toBuffer()

        // 4. Crear el nuevo string Base64
        const newBase64 = `data:image/webp;base64,${outputBuffer.toString('base64')}`

        // 5. Guardar solo si logramos reducir el tamaño
        if (newBase64.length < originalString.length) {
            await query('UPDATE equipos SET imagen_url = $1 WHERE id = $2', [newBase64, equipo.id])
            processed++
            console.log(`Equipo ${equipo.codigo} optimizado: ${(originalString.length/1024).toFixed(0)}KB -> ${(newBase64.length/1024).toFixed(0)}KB`)
        } else {
            skipped++
        }

      } catch (e) {
        console.error(`Error procesando equipo ${equipo.codigo}:`, e)
        errors++
      }
    }

    //notificacion de error

    return NextResponse.json({
      message: `Proceso finalizado. Se optimizaron ${processed} imágenes.`,
      stats: { total: rows.length, optimizados: processed, saltados: skipped, errores: errors }
    })

  } catch (error) {
    console.error('Error general en script de optimización:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
