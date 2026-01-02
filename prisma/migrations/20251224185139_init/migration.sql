-- CreateTable
CREATE TABLE "Equipo" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "version" TEXT,
    "nombre" TEXT NOT NULL,
    "area" TEXT,
    "linea" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "fabricante" TEXT,
    "fecha_implementacion" DATE,
    "fecha_adquisicion" DATE,
    "capacidad" TEXT,
    "amperaje" TEXT,
    "potencia" TEXT,
    "voltaje" TEXT,
    "rpm" TEXT,
    "magnitud_medida" TEXT,
    "estado" TEXT DEFAULT 'Operativo',
    "imagen_url" TEXT,
    "attachments_url" TEXT,
    "creado_en" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3),

    CONSTRAINT "Equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zona" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "area" TEXT,
    "codigo" TEXT,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Zona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenMantenimiento" (
    "id" SERIAL NOT NULL,
    "codigo_equipo" TEXT NOT NULL,
    "tipo_mantenimiento" TEXT NOT NULL,
    "fecha_solicitud" DATE NOT NULL,
    "responsable" TEXT,
    "descripcion_falla" TEXT NOT NULL,
    "repuestos_utilizados" TEXT,
    "prioridad" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "hora_inicio" TEXT,
    "hora_fin" TEXT,
    "observaciones" TEXT,
    "creado_en" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdenMantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquiposHistorial" (
    "id" SERIAL NOT NULL,
    "codigo_equipo" TEXT NOT NULL,
    "tarea_id" INTEGER,
    "fecha_evento" TIMESTAMP(6) NOT NULL,
    "labor" TEXT NOT NULL,
    "tipo_mantenimiento" TEXT,
    "repuestos_usados" TEXT,
    "observaciones" TEXT,
    "ejecutado_por" TEXT,
    "creado_por" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquiposHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarea" (
    "id" SERIAL NOT NULL,
    "orden_mantenimiento_id" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "fecha_inicio" TIMESTAMP(6),
    "fecha_fin" TIMESTAMP(6),
    "responsable" TEXT,
    "prioridad" TEXT DEFAULT 'media',
    "creado_en" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3),

    CONSTRAINT "Tarea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Equipo_codigo_key" ON "Equipo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Zona_codigo_key" ON "Zona"("codigo");

-- AddForeignKey
ALTER TABLE "OrdenMantenimiento" ADD CONSTRAINT "OrdenMantenimiento_codigo_equipo_fkey" FOREIGN KEY ("codigo_equipo") REFERENCES "Equipo"("codigo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquiposHistorial" ADD CONSTRAINT "EquiposHistorial_codigo_equipo_fkey" FOREIGN KEY ("codigo_equipo") REFERENCES "Equipo"("codigo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquiposHistorial" ADD CONSTRAINT "EquiposHistorial_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "Tarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_orden_mantenimiento_id_fkey" FOREIGN KEY ("orden_mantenimiento_id") REFERENCES "OrdenMantenimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
