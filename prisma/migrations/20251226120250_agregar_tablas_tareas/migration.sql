-- CreateTable
CREATE TABLE "TareaCronograma" (
    "id" SERIAL NOT NULL,
    "tarea_id" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(6) NOT NULL,
    "fecha_fin" TIMESTAMP(6),
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "creado_en" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3),

    CONSTRAINT "TareaCronograma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TareaVista" (
    "id" SERIAL NOT NULL,
    "tarea_id" INTEGER NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "visto_en" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TareaVista_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TareaVista_tarea_id_usuario_id_key" ON "TareaVista"("tarea_id", "usuario_id");

-- AddForeignKey
ALTER TABLE "TareaCronograma" ADD CONSTRAINT "TareaCronograma_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TareaVista" ADD CONSTRAINT "TareaVista_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
