import { User, Task, FormMetadata, Submission, FormSlug } from './types';
import { subDays, addDays, formatISO } from 'date-fns';

export const users: User[] = [
  { id: 'tech-1', name: 'Luis Bohorquez', avatarUrl: 'https://picsum.photos/seed/tech1/40/40' },
  { id: 'tech-2', name: 'Duvan Guevara', avatarUrl: 'https://picsum.photos/seed/tech2/40/40' },
  { id: 'tech-3', name: 'Juan David Caro', avatarUrl: 'https://picsum.photos/seed/tech3/40/40' },
  { id: 'tech-4', name: 'Sergio Rubiano', avatarUrl: 'https://picsum.photos/seed/tech4/40/40' },
  { id: 'tech-5', name: 'Javier Morales', avatarUrl: 'https://picsum.photos/seed/tech5/40/40' },
];

const today = new Date();

export const tasks: Task[] = [
  // Completed Tasks
  {
    id: '1', code: 'PA-001', area: 'Techo Sector A', schedule: 'Partes Altas', description: 'Inspección de canaletas',
    priority: 'Media', assignedTo: users[0], executedBy: users[0], nextExecution: formatISO(subDays(today, 15)), status: 'Completada', hasAlert: false,
    workDone: 'Limpieza de canaletas y revisión de fijaciones. Todo en orden.', completionDate: formatISO(subDays(today, 14)),
    equipmentSpecs: { 'Tipo de Techo': 'Metálico', 'Área': '250 m²' }
  },
  {
    id: '2', code: 'EM-001', area: 'Medidor Principal', schedule: 'Equipo de Medición', description: 'Calibración de medidor de agua',
    priority: 'Alta', assignedTo: users[1], executedBy: users[2], nextExecution: formatISO(subDays(today, 20)), status: 'Completada', hasAlert: false,
    workDone: 'Calibración realizada según protocolo. Se ajustó un 2% de desviación.', completionDate: formatISO(subDays(today, 19)),
    equipmentSpecs: { 'Modelo': 'AquaFlow 5000', 'Última Calibración': formatISO(subDays(today, 19)) }
  },
  // Pending Tasks (within 7 days or overdue)
  {
    id: '3', code: 'ML-001', area: 'Oficina Gerencia', schedule: 'Mantenimiento Locativo', description: 'Reparación de aire acondicionado',
    priority: 'Alta', assignedTo: users[2], nextExecution: formatISO(subDays(today, 2)), status: 'Pendiente', hasAlert: true,
    equipmentSpecs: { 'Marca': 'CoolAir', 'Modelo': 'CZ-500', 'Capacidad': '12000 BTU' }
  },
  {
    id: '4', code: 'MQ-001', area: 'Torno CNC', schedule: 'Maquinaria', description: 'Mantenimiento preventivo mensual',
    priority: 'Alta', assignedTo: users[3], nextExecution: formatISO(addDays(today, 1)), status: 'Pendiente', hasAlert: true,
    equipmentSpecs: { 'Marca': 'Hass', 'Modelo': 'VF-2', 'Año': '2021' }
  },
  {
    id: '5', code: 'PA-002', area: 'Fachada Norte', schedule: 'Partes Altas', description: 'Limpieza de ventanas',
    priority: 'Baja', assignedTo: users[0], nextExecution: formatISO(addDays(today, 3)), status: 'Pendiente', hasAlert: false,
  },
  {
    id: '6', code: 'EM-002', area: 'Tablero Eléctrico', schedule: 'Equipo de Medición', description: 'Verificación de termografía',
    priority: 'Media', assignedTo: users[1], nextExecution: formatISO(addDays(today, 5)), status: 'Pendiente', hasAlert: true,
    equipmentSpecs: { 'Marca': 'Fluke', 'Modelo': 'IR-250', 'Rango': '-20°C a 250°C' }
  },
  // Future Tasks
  {
    id: '7', code: 'MQ-002', area: 'Prensa Hidráulica', schedule: 'Maquinaria', description: 'Cambio de aceite hidráulico',
    priority: 'Media', assignedTo: users[3], nextExecution: formatISO(addDays(today, 10)), status: 'Futura', hasAlert: false,
    equipmentSpecs: { 'Marca': 'Parker', 'Capacidad': '50 Toneladas', 'Aceite': 'ISO VG 46' }
  },
  {
    id: '8', code: 'ML-002', area: 'Baños Personal', schedule: 'Mantenimiento Locativo', description: 'Revisión de grifería y fugas',
    priority: 'Baja', assignedTo: users[4], nextExecution: formatISO(addDays(today, 12)), status: 'Futura', hasAlert: false,
  },
  {
    id: '9', code: 'PA-003', area: 'Techo Sector B', schedule: 'Partes Altas', description: 'Revisión de impermeabilización',
    priority: 'Alta', assignedTo: users[0], nextExecution: formatISO(addDays(today, 18)), status: 'Futura', hasAlert: true,
  },
  {
    id: '10', code: 'EM-003', area: 'Balanza Producción', schedule: 'Equipo de Medición', description: 'Certificación de calibración',
    priority: 'Alta', assignedTo: users[1], nextExecution: formatISO(addDays(today, 25)), status: 'Futura', hasAlert: true,
    equipmentSpecs: { 'Marca': 'Ohaus', 'Modelo': 'Defender 3000', 'Capacidad': '150kg' }
  },
   {
    id: '11', code: 'MQ-003', area: 'Fresadora Universal', schedule: 'Maquinaria', description: 'Engrase y lubricación general',
    priority: 'Media', assignedTo: users[3], nextExecution: formatISO(addDays(today, 30)), status: 'Futura', hasAlert: false,
    equipmentSpecs: { 'Marca': 'Bridgeport', 'Modelo': 'Series I' }
  },
  {
    id: '12', code: 'ML-003', area: 'Comedor', schedule: 'Mantenimiento Locativo', description: 'Pintura de muros',
    priority: 'Baja', assignedTo: users[4], nextExecution: formatISO(addDays(today, 45)), status: 'Futura', hasAlert: false,
  },
  {
    id: '13', code: 'PA-004', area: 'Pararrayos', schedule: 'Partes Altas', description: 'Revisión de conexión a tierra',
    priority: 'Alta', assignedTo: users[0], nextExecution: formatISO(addDays(today, 60)), status: 'Futura', hasAlert: true,
    equipmentSpecs: { 'Tipo': 'Franklin', 'Cobertura': '100m' }
  },
  {
    id: '14', code: 'MQ-004', area: 'Compresor de Aire', schedule: 'Maquinaria', description: 'Limpieza de filtros de aire',
    priority: 'Media', assignedTo: users[3], nextExecution: formatISO(addDays(today, 8)), status: 'Futura', hasAlert: false,
    equipmentSpecs: { 'Marca': 'Ingersoll Rand', 'Potencia': '25 HP' }
  },
  {
    id: '15', code: 'EM-004', area: 'Manómetros Línea Vapor', schedule: 'Equipo de Medición', description: 'Contraste con patrón',
    priority: 'Media', assignedTo: users[1], nextExecution: formatISO(addDays(today, 14)), status: 'Futura', hasAlert: false,
  },
  {
    id: '16', code: 'ML-004', area: 'Salas de reuniones', schedule: 'Mantenimiento Locativo', description: 'Revisión sistema de proyección',
    priority: 'Baja', assignedTo: users[4], nextExecution: formatISO(addDays(today, 22)), status: 'Futura', hasAlert: false,
    equipmentSpecs: { 'Proyector': 'Epson PowerLite', 'Sonido': 'Logitech Z506' }
  },
  {
    id: '17', code: 'PA-005', area: 'Anclajes de seguridad', schedule: 'Partes Altas', description: 'Inspección anual de puntos de anclaje',
    priority: 'Alta', assignedTo: users[0], nextExecution: formatISO(addDays(today, 90)), status: 'Futura', hasAlert: true,
  },
  {
    id: '18', code: 'MQ-005', area: 'Sierra de Cinta', schedule: 'Maquinaria', description: 'Ajuste de guías de hoja',
    priority: 'Media', assignedTo: users[3], nextExecution: formatISO(addDays(today, 28)), status: 'Futura', hasAlert: false,
  },
  {
    id: '19', code: 'ML-005', area: 'Sistema de CCTV', schedule: 'Mantenimiento Locativo', description: 'Limpieza de lentes de cámaras',
    priority: 'Media', assignedTo: users[4], nextExecution: formatISO(addDays(today, 40)), status: 'Futura', hasAlert: false,
  },
  {
    id: '20', code: 'EM-005', area: 'Medidor de Gas', schedule: 'Equipo de Medición', description: 'Revisión de estanqueidad',
    priority: 'Alta', assignedTo: users[1], nextExecution: formatISO(addDays(today, 50)), status: 'Futura', hasAlert: true,
    equipmentSpecs: { 'Marca': 'Elster', 'Modelo': 'BK-G4' }
  },
];

export const forms: FormMetadata[] = [
    { slug: 'inspeccion-equipos', title: 'Inspección de Equipos', description: 'Registro de inspecciones de rutina y estado de equipos.' },
    { slug: 'orden-mantenimiento', title: 'Orden de Mantenimiento', description: 'Generación de órdenes de trabajo para tareas correctivas.' },
    { slug: 'paradas-operativas', title: 'Paradas Operativas en Máquina', description: 'Registro de paradas no planificadas y su impacto.' },
    { slug: 'consumo-diario', title: 'Consumo Diario de Servicio', description: 'Control de consumo de energía, agua y gas.' },
    
    { slug: 'solicitud-repuestos', title: 'Solicitud de Repuestos', description: 'Sistema para solicitar y gestionar repuestos necesarios.' },
    
    { slug: 'minuta-mtto', title: 'Minuta MTTO 2026', description: 'Actas de reunión del equipo de mantenimiento.' },
];

const getFormTitle = (slug: FormSlug) => forms.find(f => f.slug === slug)?.title || 'Formulario';

export const submissions: Submission[] = [
  { 
    id: 'sub-1', form: 'inspeccion-equipos', formTitle: getFormTitle('inspeccion-equipos'), submittedAt: formatISO(subDays(today, 3)), 
    data: { equipo: 'Torno CNC', tipoInspeccion: 'Preventiva', estado: 'Operativo', observaciones: 'Niveles de aceite correctos. Sin virutas acumuladas.' }
  },
  { 
    id: 'sub-2', form: 'orden-mantenimiento', formTitle: getFormTitle('orden-mantenimiento'), submittedAt: formatISO(subDays(today, 5)), 
    data: { equipo: 'Aire Acondicionado Gerencia', tipoMantenimiento: 'Correctivo', descripcionFalla: 'No enfría, solo ventila', responsable: 'Luis Garcia' }
  },
  { 
    id: 'sub-3', form: 'solicitud-repuestos', formTitle: getFormTitle('solicitud-repuestos'), submittedAt: formatISO(subDays(today, 2)), 
    data: { solicitante: 'Javier Hernandez', centroCosto: 'Producción', repuestos: [{ codigo: 'FIL-001', descripcion: 'Filtro de aire para compresor', cantidad: 2 }] }
  },
  { 
    id: 'sub-4', form: 'consumo-diario', formTitle: getFormTitle('consumo-diario'), submittedAt: formatISO(subDays(today, 1)), 
    data: {
      fecha: formatISO(subDays(today, 1)),
      energia: 1500,
      medidorGasPrincipal: 120,
      aguaCalderaManana: 12,
      aguaCalderaTarde: 10,
      aguaSalsasManana: 8,
      aguaSalsasTarde: 7,
      aguaFrutosManana: 5,
      aguaFrutosTarde: 4,
      aguaAutoclaveManana: 6,
      aguaAutoclaveTarde: 5,
      aguaContadorPrincipal: 25,
    }
  },
  { 
    id: 'sub-5', form: 'inspeccion-equipos', formTitle: getFormTitle('inspeccion-equipos'), submittedAt: formatISO(subDays(today, 10)), 
    data: { equipo: 'Prensa Hidráulica', tipoInspeccion: 'Rutinaria', estado: 'Operativo', observaciones: 'Se detecta pequeña fuga en manguera sector 3.' }
  },
  { 
    id: 'sub-6', form: 'consumo-diario', formTitle: getFormTitle('consumo-diario'), submittedAt: formatISO(subDays(today, 32)), 
    data: {
      fecha: formatISO(subDays(today, 32)),
      energia: 4500,
      medidorGasPrincipal: 320,
      aguaCalderaManana: 20,
      aguaCalderaTarde: 18,
      aguaSalsasManana: 12,
      aguaSalsasTarde: 11,
      aguaFrutosManana: 6,
      aguaFrutosTarde: 5,
      aguaAutoclaveManana: 8,
      aguaAutoclaveTarde: 7,
      aguaContadorPrincipal: 75,
    }
  },
  { 
    id: 'sub-7', form: 'consumo-diario', formTitle: getFormTitle('consumo-diario'), submittedAt: formatISO(subDays(today, 65)), 
    data: {
      fecha: formatISO(subDays(today, 65)),
      energia: 4800,
      medidorGasPrincipal: 350,
      aguaCalderaManana: 22,
      aguaCalderaTarde: 20,
      aguaSalsasManana: 14,
      aguaSalsasTarde: 13,
      aguaFrutosManana: 7,
      aguaFrutosTarde: 6,
      aguaAutoclaveManana: 9,
      aguaAutoclaveTarde: 8,
      aguaContadorPrincipal: 80,
    }
  }
];
