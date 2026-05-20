// ─────────────────────────────────────────────────────────────
// SkeletonCard.tsx
// Componente de carga esqueleto — muestra mientras llegan datos.
// El backend reemplazará los estados de carga reales.
// ─────────────────────────────────────────────────────────────

// Bloque animado genérico
function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`bg-earth-200/60 rounded-xl animate-pulse ${className ?? ''}`} />
  );
}

// Skeleton para tarjeta de métrica del Dashboard
export function SkeletonMetricCard() {
  return (
    <div className="bg-white p-7 rounded-[2rem] border border-earth-200 shadow-xl shadow-earth-900/5">
      <div className="flex justify-between items-start mb-6">
        <SkeletonBlock className="w-14 h-14 rounded-2xl" />
        <SkeletonBlock className="w-16 h-7 rounded-full" />
      </div>
      <SkeletonBlock className="w-24 h-3 mb-3" />
      <SkeletonBlock className="w-20 h-10" />
    </div>
  );
}

// Skeleton para fila de tabla
export function SkeletonTableRow() {
  return (
    <tr className="border-b border-earth-50">
      <td className="px-8 py-5"><SkeletonBlock className="w-28 h-4" /></td>
      <td className="px-8 py-5"><SkeletonBlock className="w-20 h-4" /></td>
      <td className="px-8 py-5"><SkeletonBlock className="w-24 h-4" /></td>
      <td className="px-8 py-5"><SkeletonBlock className="w-16 h-4" /></td>
      <td className="px-8 py-5"><SkeletonBlock className="w-14 h-6 rounded-full" /></td>
      <td className="px-8 py-5 text-right"><SkeletonBlock className="w-10 h-10 rounded-xl ml-auto" /></td>
    </tr>
  );
}

// Skeleton para item de campo
export function SkeletonFieldItem() {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl border border-transparent">
      <div className="flex items-center gap-4">
        <SkeletonBlock className="w-14 h-14 rounded-2xl" />
        <div className="space-y-2">
          <SkeletonBlock className="w-24 h-4" />
          <SkeletonBlock className="w-16 h-3" />
        </div>
      </div>
      <SkeletonBlock className="w-16 h-6 rounded-full" />
    </div>
  );
}
