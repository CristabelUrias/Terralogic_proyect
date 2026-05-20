import { NavItem, Metric, Field, AnalysisRecord, Alert } from './types';

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Estadísticas',   icon: 'LayoutDashboard' },
  { id: 'fields',    label: 'Campos',          icon: 'Sprout'          },
  { id: 'analysis',  label: 'Análisis',        icon: 'Microscope'      },
  { id: 'history',   label: 'Historial',       icon: 'History'         },
  { id: 'alerts',    label: 'Alertas',         icon: 'BellRing'        },
  { id: 'calendar',  label: 'Calendario',      icon: 'CalendarDays'    },
  { id: 'settings',  label: 'Configuración',   icon: 'Settings'        },
];

export const DASHBOARD_METRICS: Metric[] = [
  { label: 'Salud del Campo',   value: '94.8%', change: '+2.4%',    trend: 'up',      icon: 'Leaf',     color: 'text-green-600'   },
  { label: 'Estrés Hídrico',    value: '0.12',  change: 'Óptimo',   trend: 'neutral', icon: 'Droplets', color: 'text-blue-600'    },
  { label: 'Plagas Activas',    value: '04',    change: '-12%',     trend: 'down',    icon: 'Bug',      color: 'text-orange-600'  },
  { label: 'Humedad del Suelo', value: '62.5%', change: 'IA Activa', trend: 'up',     icon: 'Waves',    color: 'text-emerald-600' },
];

export const RECENT_FIELDS: Field[] = [
  { id: 'A-01',  name: 'Sector A-01',  crop: 'Maíz Híbrido',  status: 'Saludable', health: 98 },
  { id: 'G-12',  name: 'Sector G-12',  crop: 'Soja',          status: 'Atención',  health: 72 },
  { id: 'F-04',  name: 'Sector F-04',  crop: 'Trigo Blando',  status: 'Crítico',   health: 45 },
  { id: 'CN-01', name: 'Cresta Norte', crop: 'Optimizado IA', status: 'Saludable', health: 95 },
];

export const ANALYSIS_HISTORY: AnalysisRecord[] = [
  { id: 'VALLE-N-042', date: '24 Oct, 2023', time: '09:45 AM', fieldId: 'VALLE-N-042', crop: 'Maíz Híbrido', resolution: '4.2 cm/px', type: 'Multiespectral', result: 'Alerta',    imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=400' },
  { id: 'SUR-V-008',   date: '22 Oct, 2023', time: '11:20 AM', fieldId: 'SUR-V-008',   crop: 'Vid de Mesa',  resolution: '2.8 cm/px', type: 'RGB Alta Res',  result: 'Saludable', imageUrl: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=400' },
  { id: 'ESTE-T-115',  date: '19 Oct, 2023', time: '08:15 AM', fieldId: 'ESTE-T-115',  crop: 'Trigo Duro',   resolution: '5.0 cm/px', type: 'Térmico IR',    result: 'Estrés',    imageUrl: 'https://images.unsplash.com/photo-1530507629858-e4977d30e9e0?auto=format&fit=crop&q=80&w=400' },
];

export const ALERTS: Alert[] = [
  { id: 'alert-001', type: 'critical', title: 'Falla en Sistema de Irrigación', field: 'Sector F-04', time: 'Hace 12 min', desc: 'Caída de presión crítica en la línea principal. Riesgo de estrés hídrico inmediato.' },
  { id: 'alert-002', type: 'warning',  title: 'Detección Temprana de Patógenos', field: 'Sector G-12', time: 'Hace 2 horas', desc: 'Análisis multiespectral sugiere presencia temprana de roya en el cuadrante noreste.' },
  { id: 'alert-003', type: 'info',     title: 'Optimización de Fertilizante',   field: 'Cresta Norte', time: 'Hace 5 horas', desc: 'La IA sugiere reducir el aporte de nitrógeno en un 15% basado en el vigor actual.' },
];