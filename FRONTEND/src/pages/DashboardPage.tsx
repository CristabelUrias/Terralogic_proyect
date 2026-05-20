import { useState, useEffect } from 'react';
import {
  ArrowUpRight, ArrowDownRight, Leaf, Droplets, Bug, Waves,
  Sprout, ImageOff, Activity, TrendingUp, AlertTriangle,
  CheckCircle2, ChevronRight, Zap, Target, BarChart2,
  type LucideIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TabId } from '../types';
import { StatusBadge } from '../components/ui';
import { listFields, type FieldItem } from '../services/fields.service';

const ICON_MAP: Record<string, LucideIcon> = { Leaf, Droplets, Bug, Waves };

interface GeminiResult {
  field_name:        string;
  resultado:         'Saludable' | 'Alerta' | 'Estrés';
  enfermedades:      { count: number; detalle: string };
  estres_hidrico:    { porcentaje: number; nivel: string };
  plagas:            { count: number; detalle: string };
  ndvi:              number;
  cobertura_vegetal: number;
  insight:           string;
  confianza:         number;
}

interface DashboardPageProps {
  lastAnalysisImage:  string | null;
  lastAnalysisField:  string | null;
  lastAnalysisResult: GeminiResult | null;
  onNavigate:         (tab: TabId) => void;
}

// ── Skeleton loader ───────────────────────────────────────────
const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-earth-100 rounded-2xl ${className}`} />
);

// ── KPI card component ────────────────────────────────────────
interface KPICardProps {
  label:    string;
  value:    string;
  change:   string;
  trend:    'up' | 'down' | 'neutral';
  icon:     string;
  color:    string;
  bgColor:  string;
  action?:  string;
  onAction?: () => void;
  progress?: number;
  loading:  boolean;
}

function KPICard({ label, value, change, trend, icon, color, bgColor, action, onAction, progress, loading }: KPICardProps) {
  const Icon = ICON_MAP[icon];

  if (loading) return <Skeleton className="h-44" />;

  const trendConfig = {
    up:      { bg: 'bg-agri-green-50', text: 'text-agri-green-700', icon: <ArrowUpRight size={12} /> },
    down:    { bg: 'bg-red-50',        text: 'text-red-700',        icon: <ArrowDownRight size={12} /> },
    neutral: { bg: 'bg-earth-100',     text: 'text-earth-500',      icon: null },
  }[trend];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-[1.75rem] border border-earth-100 shadow-sm p-6 flex flex-col gap-4 cursor-default relative overflow-hidden"
    >
      {/* Acento de color en esquina */}
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[3rem] ${bgColor} opacity-40`} />

      <div className="relative flex justify-between items-start">
        <div className={`p-3 rounded-2xl ${bgColor}`}>
          <Icon size={20} className={color} />
        </div>
        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${trendConfig.bg} ${trendConfig.text}`}>
          {trendConfig.icon}{change}
        </span>
      </div>

      <div className="relative">
        <p className="text-[10px] font-black text-earth-400 uppercase tracking-[0.15em] mb-1">{label}</p>
        <p className="text-4xl font-black text-agri-green-950 tracking-tighter leading-none">{value}</p>
      </div>

      {/* Barra de progreso */}
      {progress !== undefined && (
        <div className="relative">
          <div className="h-1.5 bg-earth-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
              className={`h-full rounded-full ${trend === 'up' ? 'bg-agri-green-500' : trend === 'down' ? 'bg-red-400' : 'bg-orange-400'}`}
            />
          </div>
        </div>
      )}

      {/* CTA accionable */}
      {action && onAction && (
        <button onClick={onAction}
          className={`text-[10px] font-black uppercase tracking-widest ${color} flex items-center gap-1 hover:gap-2 transition-all`}>
          {action} <ChevronRight size={12} />
        </button>
      )}
    </motion.div>
  );
}

export default function DashboardPage({
  lastAnalysisImage, lastAnalysisField, lastAnalysisResult, onNavigate,
}: DashboardPageProps) {
  const [fields,        setFields]        = useState<FieldItem[]>([]);
  const [fieldStats,    setFieldStats]    = useState({ total: 0, healthy: 0, attention: 0, critical: 0 });
  const [loadingFields, setLoadingFields] = useState(true);

  useEffect(() => {
    listFields()
      .then(data => { setFields(data.items); setFieldStats(data.stats); })
      .catch(() => {})
      .finally(() => setLoadingFields(false));
  }, []);

  // ── KPIs ─────────────────────────────────────────────────────
  const hasData = !!lastAnalysisResult;

  const kpis: KPICardProps[] = hasData ? [
    {
      label:    'Salud del Campo',
      value:    `${lastAnalysisResult!.cobertura_vegetal}%`,
      change:   lastAnalysisResult!.resultado,
      trend:    lastAnalysisResult!.resultado === 'Saludable' ? 'up' : lastAnalysisResult!.resultado === 'Estrés' ? 'down' : 'neutral',
      icon:     'Leaf',
      color:    'text-agri-green-600',
      bgColor:  'bg-agri-green-50',
      progress: lastAnalysisResult!.cobertura_vegetal,
      action:   'Ver campos',
      onAction: () => onNavigate('fields'),
      loading:  false,
    },
    {
      label:    'Estrés Hídrico',
      value:    `${lastAnalysisResult!.estres_hidrico.porcentaje}%`,
      change:   lastAnalysisResult!.estres_hidrico.nivel,
      trend:    lastAnalysisResult!.estres_hidrico.porcentaje > 50 ? 'down' : lastAnalysisResult!.estres_hidrico.porcentaje > 25 ? 'neutral' : 'up',
      icon:     'Droplets',
      color:    'text-blue-600',
      bgColor:  'bg-blue-50',
      progress: lastAnalysisResult!.estres_hidrico.porcentaje,
      action:   lastAnalysisResult!.estres_hidrico.porcentaje > 40 ? 'Revisar riego' : undefined,
      onAction: () => onNavigate('analysis'),
      loading:  false,
    },
    {
      label:    'Plagas Activas',
      value:    String(lastAnalysisResult!.plagas.count).padStart(2, '0'),
      change:   lastAnalysisResult!.plagas.count === 0 ? 'Sin plagas' : 'Detectadas',
      trend:    lastAnalysisResult!.plagas.count > 0 ? 'down' : 'up',
      icon:     'Bug',
      color:    'text-orange-600',
      bgColor:  'bg-orange-50',
      action:   lastAnalysisResult!.plagas.count > 0 ? 'Ver historial' : undefined,
      onAction: () => onNavigate('history'),
      loading:  false,
    },
    {
      label:    'Índice NDVI',
      value:    lastAnalysisResult!.ndvi.toFixed(2),
      change:   lastAnalysisResult!.ndvi >= 0.6 ? 'Óptimo' : lastAnalysisResult!.ndvi >= 0.4 ? 'Moderado' : 'Bajo',
      trend:    lastAnalysisResult!.ndvi >= 0.6 ? 'up' : lastAnalysisResult!.ndvi >= 0.4 ? 'neutral' : 'down',
      icon:     'Waves',
      color:    'text-emerald-600',
      bgColor:  'bg-emerald-50',
      progress: lastAnalysisResult!.ndvi * 100,
      action:   lastAnalysisResult!.ndvi < 0.4 ? 'Analizar campo' : undefined,
      onAction: () => onNavigate('analysis'),
      loading:  false,
    },
  ] : [
    { label: 'Salud del Campo',  value: '—', change: 'Sin datos', trend: 'neutral', icon: 'Leaf',     color: 'text-agri-green-600', bgColor: 'bg-agri-green-50', loading: true },
    { label: 'Estrés Hídrico',   value: '—', change: 'Sin datos', trend: 'neutral', icon: 'Droplets', color: 'text-blue-600',       bgColor: 'bg-blue-50',       loading: true },
    { label: 'Plagas Activas',   value: '—', change: 'Sin datos', trend: 'neutral', icon: 'Bug',      color: 'text-orange-600',     bgColor: 'bg-orange-50',     loading: true },
    { label: 'Índice NDVI',      value: '—', change: 'Sin datos', trend: 'neutral', icon: 'Waves',    color: 'text-emerald-600',    bgColor: 'bg-emerald-50',    loading: true },
  ] as KPICardProps[];

  // ── Estado crítico dominante ──────────────────────────────────
  const criticalCount  = fieldStats.critical;
  const attentionCount = fieldStats.attention;
  const overallStatus  =
    criticalCount > 0  ? 'critical'  :
    attentionCount > 0 ? 'attention' : 'healthy';

  const statusConfig = {
    critical:  { label: 'Atención Requerida', color: 'text-red-700',         bg: 'bg-red-50',         border: 'border-red-200',         dot: 'bg-red-500'         },
    attention: { label: 'Monitorear Campos',  color: 'text-orange-700',      bg: 'bg-orange-50',      border: 'border-orange-200',      dot: 'bg-orange-500'      },
    healthy:   { label: 'Todo en Orden',      color: 'text-agri-green-700',  bg: 'bg-agri-green-50',  border: 'border-agri-green-200',  dot: 'bg-agri-green-500'  },
  }[overallStatus];

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 p-4 md:p-6">

      {/* ── Header con estado global ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-earth-400 uppercase tracking-[0.25em] mb-1">Panel de Control</p>
          <h1 className="text-3xl font-black text-agri-green-950 tracking-tight">Vista General</h1>
        </div>

        {/* Estado dominante */}
        {!loadingFields && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${statusConfig.bg} ${statusConfig.border}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${statusConfig.dot} animate-pulse`} />
            <span className={`text-sm font-black ${statusConfig.color}`}>{statusConfig.label}</span>
            {criticalCount > 0 && (
              <span className="text-xs font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                {criticalCount} crítico{criticalCount !== 1 ? 's' : ''}
              </span>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <KPICard {...kpi} />
          </motion.div>
        ))}
      </div>

      {/* ── Recomendación inteligente ── */}
      <AnimatePresence>
        {hasData && lastAnalysisResult && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-4 p-5 bg-agri-green-950 text-white rounded-[1.75rem] relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-agri-green-500/10 rounded-full blur-2xl" />
            <div className="p-2.5 bg-agri-green-800 rounded-xl flex-shrink-0">
              <Zap size={18} className="text-agri-green-300" />
            </div>
            <div className="flex-1 min-w-0 relative">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-agri-green-400 mb-1">
                Recomendación de Gemini AI · {lastAnalysisField}
              </p>
              <p className="text-sm font-medium text-white/85 leading-relaxed line-clamp-2">
                "{lastAnalysisResult.insight}"
              </p>
            </div>
            <button onClick={() => onNavigate('history')}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-agri-green-800 hover:bg-agri-green-700 rounded-xl text-[10px] font-black uppercase tracking-wider text-agri-green-300 transition-colors">
              Ver historial <ChevronRight size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cuerpo principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Último análisis — 2/3 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white rounded-[2rem] border border-earth-100 shadow-sm overflow-hidden flex flex-col"
          style={{ minHeight: 440 }}>

          {/* Header */}
          <div className="px-7 py-5 flex justify-between items-center border-b border-earth-50">
            <div>
              <h2 className="text-base font-black text-agri-green-950 tracking-tight">Último Análisis</h2>
              <p className="text-[10px] font-bold text-earth-400 uppercase tracking-widest mt-0.5">
                {lastAnalysisResult ? lastAnalysisField : 'Sin análisis recientes'}
              </p>
            </div>
            {lastAnalysisResult && (
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  lastAnalysisResult.resultado === 'Saludable' ? 'bg-agri-green-500' :
                  lastAnalysisResult.resultado === 'Estrés'    ? 'bg-red-500' : 'bg-orange-500'
                }`} />
                <span className="text-xs font-black text-earth-500 uppercase tracking-wider">
                  {lastAnalysisResult.resultado}
                </span>
              </div>
            )}
          </div>

          {/* Imagen */}
          <div className="relative flex-1 overflow-hidden bg-earth-50" style={{ minHeight: 280 }}>
            {lastAnalysisResult ? (
              <>
                <img
                  src={lastAnalysisImage ||
                    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1200'}
                  className="w-full h-full object-cover"
                  style={{ minHeight: 280, opacity: lastAnalysisImage ? 0.95 : 0.5 }}
                  alt="Análisis"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-agri-green-950/80 via-transparent to-transparent" />

                {!lastAnalysisImage && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl text-xs font-bold text-earth-500 border border-earth-200">
                      📋 Datos del historial — imagen no disponible
                    </div>
                  </div>
                )}

                {/* Métricas flotantes */}
                <div className="absolute top-4 left-4 grid grid-cols-2 gap-2">
                  {[
                    { label: 'NDVI',       value: lastAnalysisResult.ndvi.toFixed(2),                 ok: lastAnalysisResult.ndvi >= 0.5 },
                    { label: 'Estrés',     value: `${lastAnalysisResult.estres_hidrico.porcentaje}%`, ok: lastAnalysisResult.estres_hidrico.porcentaje < 40 },
                    { label: 'Enf.',       value: String(lastAnalysisResult.enfermedades.count),      ok: lastAnalysisResult.enfermedades.count === 0 },
                    { label: 'Confianza',  value: `${Math.round(lastAnalysisResult.confianza * 100)}%`, ok: true },
                  ].map(({ label, value, ok }) => (
                    <div key={label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/90 backdrop-blur-sm border border-white/60">
                      {ok
                        ? <CheckCircle2 size={11} className="text-agri-green-500 flex-shrink-0" />
                        : <AlertTriangle size={11} className="text-orange-500 flex-shrink-0" />
                      }
                      <span className="text-[10px] font-black text-earth-700">{label}: {value}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button onClick={() => onNavigate('analysis')}
                    className="px-4 py-2 bg-agri-green-700 hover:bg-agri-green-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors">
                    Nuevo análisis →
                  </button>
                </div>
              </>
            ) : (
              /* Empty state inteligente */
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-16 h-16 rounded-[1.5rem] bg-agri-green-50 border border-agri-green-100 flex items-center justify-center mb-4">
                  <Target size={28} className="text-agri-green-400" />
                </motion.div>
                <h3 className="text-lg font-black text-earth-600 mb-1">Aún no hay análisis</h3>
                <p className="text-sm text-earth-400 max-w-xs leading-relaxed mb-5">
                  Sube una imagen de tu cultivo y Gemini AI detectará plagas, enfermedades y calculará el NDVI en segundos.
                </p>
                <button onClick={() => onNavigate('analysis')}
                  className="flex items-center gap-2 bg-agri-green-800 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-agri-green-900 transition-all shadow-md">
                  <Zap size={14} /> Hacer primer análisis
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Panel derecho */}
        <div className="flex flex-col gap-4">

          {/* Resumen de estado */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="bg-agri-green-950 rounded-[2rem] p-6 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-agri-green-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={14} className="text-agri-green-400" />
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-agri-green-400">Estado general</p>
              </div>
              {loadingFields ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 bg-agri-green-800" />
                  <Skeleton className="h-8 bg-agri-green-800" />
                </div>
              ) : (
                <>
                  <p className="text-5xl font-black tracking-tighter mb-0.5">{fieldStats.total}</p>
                  <p className="text-agri-green-400 text-sm font-bold mb-5">campos monitoreados</p>
                  <div className="space-y-3">
                    {[
                      { label: 'Saludables',  count: fieldStats.healthy,   color: 'bg-agri-green-500', text: 'text-agri-green-400' },
                      { label: 'En atención', count: fieldStats.attention, color: 'bg-orange-400',      text: 'text-orange-400'     },
                      { label: 'Críticos',    count: fieldStats.critical,  color: 'bg-red-500',         text: 'text-red-400'        },
                    ].map(({ label, count, color, text }) => (
                      <div key={label}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${text}`}>{label}</span>
                          <span className="text-xs font-black text-white/60">{count}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: fieldStats.total > 0 ? `${(count / fieldStats.total) * 100}%` : '0%' }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                            className={`h-full rounded-full ${color}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* Campos recientes */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white rounded-[2rem] border border-earth-100 shadow-sm flex flex-col flex-1 overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center border-b border-earth-50">
              <div>
                <h2 className="text-sm font-black text-agri-green-950">Campos Recientes</h2>
                <p className="text-[10px] text-earth-400 font-bold uppercase tracking-widest mt-0.5">Último análisis</p>
              </div>
              <BarChart2 size={15} className="text-earth-300" />
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {loadingFields ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)
              ) : fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Sprout size={22} className="text-earth-200 mb-2" />
                  <p className="text-xs font-bold text-earth-300">Sin campos todavía</p>
                  <p className="text-[10px] text-earth-300 mt-0.5">Aparecen al analizar imágenes</p>
                </div>
              ) : (
                fields.slice(0, 5).map((field, i) => (
                  <motion.div key={field.id}
                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.06 }}
                    whileHover={{ backgroundColor: 'rgba(240,249,240,0.8)' }}
                    onClick={() => onNavigate('fields')}
                    className="flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-colors border border-transparent hover:border-agri-green-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        field.status === 'Saludable' ? 'bg-agri-green-50 text-agri-green-600' :
                        field.status === 'Atención'  ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                      }`}>
                        <Sprout size={15} />
                      </div>
                      <div>
                        <p className="font-black text-sm text-agri-green-950 leading-none">{field.name}</p>
                        <p className="text-[10px] font-bold text-earth-400 mt-0.5">
                          NDVI {field.ndvi.toFixed(2)} · {field.last_analysis}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={field.status} size="sm" />
                  </motion.div>
                ))
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-earth-50 text-center">
              <button onClick={() => onNavigate('fields')}
                className="text-[10px] font-black text-agri-green-700 uppercase tracking-widest hover:text-agri-green-500 transition-colors flex items-center gap-1 mx-auto">
                Ver todos los campos <ChevronRight size={12} />
              </button>
            </div>
          </motion.div>

          {/* Acciones rápidas */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="grid grid-cols-2 gap-3">
            {[
              { label: 'Nuevo análisis', icon: Zap,       color: 'bg-agri-green-800 text-white hover:bg-agri-green-900', tab: 'analysis' as TabId },
              { label: 'Ver historial',  icon: TrendingUp, color: 'bg-white text-agri-green-800 hover:bg-agri-green-50 border border-earth-200', tab: 'history' as TabId },
            ].map(({ label, icon: Icon, color, tab }) => (
              <button key={tab} onClick={() => onNavigate(tab)}
                className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${color}`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}