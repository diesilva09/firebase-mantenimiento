// lib/submissions-service.ts - VERSIÓN COMPLETA CON LOGS
import { Submission, FormMetadata } from './types';

// 1. Ordenes de Mantenimiento
async function fetchOrdenesMantenimiento(): Promise<Submission[]> {
  try {
    const response = await fetch('/api/ordenes-mantenimiento');
    if (!response.ok) throw new Error('Error fetching ordenes mantenimiento');
    const result = await response.json();
    const data = result.data;

    return data.map((item: any) => ({
      id: `om-${item.id}`,
      form: 'ordenes-mantenimiento',
      formTitle: 'Órdenes de Mantenimiento',
      submittedAt: item.creado_en || new Date().toISOString(),
      data: {
        'Número Orden': item.numero_orden,
        'Equipo': item.codigo_equipo || item.equipo_nombre,
        'Tipo Mantenimiento': item.tipo_mantenimiento,
        'Fecha Solicitud': item.fecha_solicitud,
        'Hora Inicio': item.hora_inicio,
        'Hora Fin': item.hora_fin,
        'Responsable': item.responsable,
        'Descripción del trabajo realizado': item.descripcion_falla,
        'Repuestos Utilizados': item.repuestos_utilizados,
        'Observaciones / Recomendaciones': item.observaciones,
        'Prioridad': item.prioridad,
        'Estado': item.estado
      }
    }));
  } catch (error) {
    console.error('❌ [fetchOrdenesMantenimiento] Error:', error);
    return [];
  }
}

// 2. Paradas Operativas
async function fetchParadasOperativas(): Promise<Submission[]> {
  try {
    const response = await fetch('/api/paradas-operativas');
    if (!response.ok) throw new Error('Error fetching paradas operativas');
    const result = await response.json();
    const data = result.data;

    return data.map((item: any) => ({
      id: `po-${item.id}`,
      form: 'paradas-operativas',
      formTitle: 'Paradas Operativas',
      submittedAt: item.creado_en || new Date().toISOString(),
      data: {
        'Equipo': item.codigo_equipo,
        'Referencia': item.referencia,
        'Fecha Parada': item.fecha_parada,
        'Hora Parada': item.hora_parada,
        'Duración (min)': item.duracion_min,
        'Tipo Parada': item.tipo_parada,
        'Motivo': item.motivo,
        'Impacto Producción': item.impacto_produccion,
        'Técnico Encargado': item.tecnico_encargado,
        'Observaciones': item.observaciones
      }
    }));
  } catch (error) {
    console.error('❌ [fetchParadasOperativas] Error:', error);
    return [];
  }
}

// 3. Tareas de Cronograma
async function fetchMaintenanceMinutes(): Promise<Submission[]> {
  try {
    const response = await fetch('/api/maintenance-minutes');
    if (!response.ok) throw new Error('Error fetching maintenance minutes');
    const result = await response.json();
    const data = result.data;

    return data.map((item: any) => ({
      id: `mm-${item.id}`,
      form: 'maintenance-minutes',
      formTitle: 'Minuta Mtto 2025',
      submittedAt: item.created_at || new Date().toISOString(),
      data: {
        'Técnico': item.tecnico,
        'Trabajo Realizado': item.trabajo_realizado,
        'Queda Pendiente': item.queda_pendiente ? 'Sí' : 'No',
        'Descripción Pendiente': item.descripcion_pendiente,
        'Repuestos Utilizados': item.repuestos_utilizados,
        'Fecha Ejecución': item.fecha_ejecucion,
        'Hora Inicio': item.hora_inicio,
        'Hora Fin': item.hora_fin,
        'Tiempo Total': item.tiempo_total
      }
    }));
  } catch (error) {
    console.error('❌ [fetchMaintenanceMinutes] Error:', error);
    return [];
  }
}

// 4. Consumos de Servicios
async function fetchConsumosServicios(): Promise<Submission[]> {
  try {
    const response = await fetch('/api/consumos-servicios');
    if (!response.ok) throw new Error('Error fetching consumos servicios');
    const result = await response.json();
    const data = result.data;

    return data.map((item: any) => ({
      id: `cs-${item.id}`,
      form: 'consumos-servicios',
      formTitle: 'Consumos de Servicios',
      submittedAt: item.created_at || new Date().toISOString(),
      data: {
        'Tipo Registro': item.tipo_registro,
        'Fecha': item.fecha,
        'Energía (kWh)': item.energia_kwh,
        'Gas Principal (m³)': item.gas_principal_m3,
        'Agua Contador Principal (m³)': item.agua_principal_m3,
        'Agua Caldera Mañana (m³)': item.agua_caldera_manana_m3,
        'Agua Caldera Tarde (m³)': item.agua_caldera_tarde_m3,
        'Agua Salsas Mañana (m³)': item.agua_salsas_manana_m3,
        'Agua Salsas Tarde (m³)': item.agua_salsas_tarde_m3,
        'Agua Frutos Mañana (m³)': item.agua_frutos_manana_m3,
        'Agua Frutos Tarde (m³)': item.agua_frutos_tarde_m3,
        'Agua Autoclave Mañana (m³)': item.agua_autoclave_manana_m3,
        'Agua Autoclave Tarde (m³)': item.agua_autoclave_tarde_m3,
        'Observaciones': item.observaciones
      }
    }));
  } catch (error) {
    console.error('❌ [fetchConsumosServicios] Error:', error);
    return [];
  }
}

// 5. Equipment Inspections
async function fetchEquipmentInspections(): Promise<Submission[]> {
  try {
    const response = await fetch('/api/equipment-inspections');
    if (!response.ok) throw new Error('Error fetching equipment inspections');
    const result = await response.json();
    const data = result.data;

    return data.map((item: any) => ({
      id: `ei-${item.id}`,
      form: 'equipment-inspections',
      formTitle: 'Inspecciones de Equipos',
      submittedAt: item.created_at || new Date().toISOString(),
      data: {
        'Equipo': item.equipo,
        'Responsable': item.responsable,
        'Tipo Inspección': item.tipo_inspeccion,
        'Estado': item.estado,
        'Observaciones': item.observaciones
      }
    }));
  } catch (error) {
    console.error('❌ [fetchEquipmentInspections] Error:', error);
    return [];
  }
}

// 6. Spares Requests
async function fetchSparesRequests(): Promise<Submission[]> {
  try {
    const response = await fetch('/api/spares-requests');
    if (!response.ok) throw new Error('Error fetching spares requests');
    const result = await response.json();
    const data = result.data;

    return data.map((item: any) => ({
      id: `sr-${item.id}`,
      form: 'spares-requests',
      formTitle: 'Solicitudes de Repuestos',
      submittedAt: item.created_at || new Date().toISOString(),
      data: {
        'Repuesto': item.repuesto,
        'Cantidad': item.cantidad,
        'Máquina': item.maquina,
        'Locativo': item.locativo,
        'Técnico': item.tecnico
      }
    }));
  } catch (error) {
    console.error('❌ [fetchSparesRequests] Error:', error);
    return [];
  }
}

// Función principal para obtener todas las submissions
export async function getAllSubmissions(): Promise<Submission[]> {
  try {
    const responses = await Promise.all([
      fetchOrdenesMantenimiento(),
      fetchParadasOperativas(),
      fetchConsumosServicios(),
      fetchEquipmentInspections(),
      fetchSparesRequests(),
      fetchMaintenanceMinutes(),
    ]);

    const allSubmissions = responses.flat();
    const sorted = allSubmissions.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    return sorted;
  } catch (error) {
    console.error('❌ [getAllSubmissions] Error:', error);
    return [];
  }
}

// Metadata de los formularios
export async function getFormsMetadata(): Promise<FormMetadata[]> {
  return [
    {
      slug: 'ordenes-mantenimiento',
      title: 'Órdenes de Mantenimiento',
      description: 'Gestión de órdenes de mantenimiento'
    },
    {
      slug: 'paradas-operativas', 
      title: 'Paradas Operativas',
      description: 'Registro de paradas operativas'
    },
    {
      slug: 'consumos-servicios',
      title: 'Consumos de Servicios',
      description: 'Control de consumos de servicios'
    },
    {
      slug: 'equipment-inspections',
      title: 'Inspecciones de Equipos',
      description: 'Inspecciones técnicas de equipos'
    },
    {
      slug: 'spares-requests',
      title: 'Solicitudes de Repuestos',
      description: 'Solicitud de repuestos y materiales'
    },
    {
      slug: 'maintenance-minutes',
      title: 'Minuta Mtto 2026',
      description: 'Registro de minutos de mantenimiento'
    }
  ];
}