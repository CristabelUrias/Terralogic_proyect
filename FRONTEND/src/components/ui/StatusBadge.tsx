// ─────────────────────────────────────────────────────────────
// StatusBadge.tsx
// Componente reutilizable que muestra el estado de un campo
// o resultado de análisis con el color correspondiente.
// ─────────────────────────────────────────────────────────────

import { FieldStatus, AnalysisResult } from '../../types';

// Acepta tanto estados de campo como resultados de análisis
type BadgeStatus = FieldStatus | AnalysisResult;

interface StatusBadgeProps {
  status: BadgeStatus;
  size?:  'sm' | 'md'; // sm = compacto (listas), md = normal (tablas)
}

// Mapa de colores por estado — agregar aquí si se añaden nuevos estados
const STYLES: Record<BadgeStatus, string> = {
  Saludable: 'bg-agri-green-100 text-agri-green-700',
  Atención:  'bg-orange-100 text-orange-700',
  Crítico:   'bg-red-100 text-red-700',
  Alerta:    'bg-red-100 text-red-700',
  Estrés:    'bg-orange-100 text-orange-700',
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  return (
    <span
      className={`
        ${size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-1.5'}
        rounded-full text-[9px] font-black uppercase tracking-[0.1em]
        ${STYLES[status] ?? 'bg-earth-100 text-earth-600'}
      `}
    >
      {status}
    </span>
  );
}
