import { useState, useEffect } from 'react';
import { Filter, Download, ChevronRight, Search, X, ChevronDown, ChevronLeft, Trash2, Bug, Droplets, Leaf, Zap, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StatusBadge, PageHeader, ConfirmDialog } from '../components/ui';
import { listAnalyses, deleteAnalysis, type HistoryRecord } from '../services/history.service';

type ResultFilter = 'Todos' | 'Saludable' | 'Alerta' | 'Estrés';

const RESULT_FILTERS: { label: string; value: ResultFilter }[] = [
  { label: 'Todos',     value: 'Todos'     },
  { label: 'Saludable', value: 'Saludable' },
  { label: 'Alerta',    value: 'Alerta'    },
  { label: 'Estrés',    value: 'Estrés'    },
];

const PAGE_SIZE = 5;

interface HistoryPageProps {
  lastAnalysisField: string | null;
}

export default function HistoryPage({ lastAnalysisField }: HistoryPageProps) {
  const [records,        setRecords]        = useState<HistoryRecord[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [search,         setSearch]         = useState('');
  const [resultFilter,   setResultFilter]   = useState<ResultFilter>('Todos');
  const [showFilters,    setShowFilters]    = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const [page,           setPage]           = useState(1);
  const [deleteTarget,   setDeleteTarget]   = useState<HistoryRecord | null>(null);

  // ── Cargar historial ────────────────────────────────────────
  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAnalyses(0, 100);
      setRecords(data.items);
    } catch (e) {
      setError('No se pudo cargar el historial. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  // ── Filtros ─────────────────────────────────────────────────
  const filtered = records.filter((r) => {
    const matchSearch =
      r.field_name.toLowerCase().includes(search.toLowerCase()) ||
      r.result.toLowerCase().includes(search.toLowerCase());
    const matchResult = resultFilter === 'Todos' || r.result === resultFilter;
    return matchSearch && matchResult;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const resetPage  = () => setPage(1);
  const hasFilters = search !== '' || resultFilter !== 'Todos';

  // ── Eliminar ────────────────────────────────────────────────
  const handleDelete = async (record: HistoryRecord) => {
    try {
      await deleteAnalysis(record.id);
      setRecords(prev => prev.filter(r => r.id !== record.id));
      if (selectedRecord?.id === record.id) setSelectedRecord(null);
    } catch {
      setError('Error al eliminar el registro.');
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Exportar CSV ────────────────────────────────────────────
  const handleExport = () => {
    // Envuelve un valor en comillas y escapa comillas internas
    const q = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;

    // sep=; indica a Excel en español que use punto y coma como separador
    const rows = [
      'sep=;',
      ['Fecha', 'Hora', 'Campo', 'Resultado', 'NDVI', 'Estres Hidrico', 'Enfermedades', 'Plagas', 'Nivel Estres', 'Insight'].map(q).join(';'),
      ...filtered.map(r => [
        q(r.date),
        q(r.time),
        q(r.field_name),
        q(r.result),
        q(r.ndvi.toFixed(2)),
        q(`${r.water_stress_pct}%`),
        q(r.diseases_count),
        q(r.plagas_count),
        q(r.nivel_estres),
        q(r.ai_insight),
      ].join(';'))
    ].join('\r\n');

    // BOM UTF-8 — hace que Excel abra el archivo con encoding correcto
    const BOM  = '\uFEFF';
    const blob = new Blob([BOM + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `historial-terralogic-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="space-y-10">

        {/* Encabezado */}
        <div className="flex justify-between items-end">
          <PageHeader label="Registros Históricos" title="Historial de Análisis" description="Registro detallado de monitoreo con Gemini AI." />
          <div className="flex gap-3 mb-1">
            <button onClick={fetchHistory}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-earth-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-earth-600 hover:text-agri-green-700 transition-all shadow-sm">
              <RefreshCw size={14} /> Actualizar
            </button>
            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border ${showFilters ? 'bg-agri-green-50 border-agri-green-200 text-agri-green-700' : 'bg-white border-earth-200 text-earth-600'}`}>
              <Filter size={15} /> Filtros
              <ChevronDown size={13} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <button onClick={handleExport} disabled={filtered.length === 0}
              className="flex items-center gap-2 px-5 py-3 bg-agri-green-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-agri-green-900 transition-all shadow-sm disabled:opacity-40">
              <Download size={15} /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Último análisis de la sesión */}
        {lastAnalysisField && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 p-5 bg-agri-green-50 border border-agri-green-200 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-agri-green-500 flex items-center justify-center text-white flex-shrink-0">
              <Zap size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-agri-green-600 uppercase tracking-widest mb-0.5">Último análisis de esta sesión</p>
              <p className="font-black text-agri-green-950 text-sm">Campo: <span className="text-agri-green-700">{lastAnalysisField}</span></p>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-bold flex items-center gap-3">
            <X size={16} /> {error}
          </div>
        )}

        {/* Filtros */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="bg-white rounded-[2rem] border border-earth-200 shadow-xl p-6 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-400" />
                  <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                    placeholder="Buscar por campo o resultado..."
                    className="w-full bg-white border border-earth-200 rounded-2xl pl-11 pr-10 py-3 text-sm font-medium focus:ring-4 focus:ring-agri-green-500/10 focus:border-agri-green-500 outline-none" />
                  {search && <button onClick={() => { setSearch(''); resetPage(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-300 hover:text-earth-500"><X size={15} /></button>}
                </div>
                <div className="flex gap-2 p-1.5 bg-earth-200/40 rounded-2xl">
                  {RESULT_FILTERS.map(({ label, value }) => (
                    <button key={value} onClick={() => { setResultFilter(value); resetPage(); }}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${resultFilter === value ? 'bg-white text-agri-green-800 shadow-md' : 'text-earth-500 hover:text-earth-700'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabla + Panel detalle */}
        <div className="grid grid-cols-12 gap-6">
          <div className={`${selectedRecord ? 'col-span-12 lg:col-span-7' : 'col-span-12'} bg-white rounded-[2.5rem] border border-earth-200 shadow-xl overflow-hidden transition-all duration-500`}>

            {/* Contador */}
            {(hasFilters || totalPages > 1) && (
              <div className="px-8 py-4 border-b border-earth-100 flex items-center justify-between bg-white/50">
                <p className="text-[10px] font-black text-earth-400 uppercase tracking-[0.2em]">
                  {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
                  {totalPages > 1 && ` · Pág. ${page}/${totalPages}`}
                </p>
                {hasFilters && (
                  <button onClick={() => { setSearch(''); setResultFilter('Todos'); resetPage(); }}
                    className="text-[10px] font-black text-earth-400 uppercase tracking-widest hover:text-agri-green-600 flex items-center gap-1">
                    <X size={11} /> Limpiar
                  </button>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/50 border-b border-earth-100">
                  <tr>
                    {['Fecha', 'Campo', 'NDVI', 'Resultado', ''].map(col => (
                      <th key={col} className="px-6 py-5 text-[10px] font-black text-earth-400 uppercase tracking-[0.2em]">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-earth-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-16 text-center">
                        <Loader2 className="animate-spin text-agri-green-600 mx-auto mb-3" size={28} />
                        <p className="text-earth-400 font-bold text-sm">Cargando historial...</p>
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-16 text-center">
                        <p className="text-earth-400 font-bold text-sm">
                          {records.length === 0
                            ? 'No hay análisis guardados aún. Haz tu primer análisis en la sección Análisis.'
                            : 'Sin registros que coincidan.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((record) => (
                      <motion.tr key={record.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className={`transition-all group cursor-pointer ${selectedRecord?.id === record.id ? 'bg-agri-green-50/50' : 'hover:bg-earth-200/20'}`}>
                        <td className="px-6 py-4" onClick={() => setSelectedRecord(selectedRecord?.id === record.id ? null : record)}>
                          <p className="text-sm font-black text-earth-900">{record.date}</p>
                          <p className="text-[10px] font-bold text-earth-400 uppercase">{record.time}</p>
                        </td>
                        <td className="px-6 py-4 font-black text-sm text-agri-green-800" onClick={() => setSelectedRecord(selectedRecord?.id === record.id ? null : record)}>
                          {record.field_name}
                        </td>
                        <td className="px-6 py-4 font-black text-sm text-agri-green-950" onClick={() => setSelectedRecord(selectedRecord?.id === record.id ? null : record)}>
                          {record.ndvi.toFixed(2)}
                        </td>
                        <td className="px-6 py-4" onClick={() => setSelectedRecord(selectedRecord?.id === record.id ? null : record)}>
                          <StatusBadge status={record.result} size="md" />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(record); }}
                              className="w-9 h-9 rounded-xl bg-white text-earth-300 hover:bg-red-50 hover:text-red-500 flex items-center justify-center border border-earth-100 hover:border-red-200 transition-all">
                              <Trash2 size={14} />
                            </button>
                            <button onClick={() => setSelectedRecord(selectedRecord?.id === record.id ? null : record)}
                              className={`w-9 h-9 rounded-xl transition-all flex items-center justify-center shadow-sm ${selectedRecord?.id === record.id ? 'bg-agri-green-600 text-white' : 'bg-white text-earth-400 group-hover:bg-agri-green-600 group-hover:text-white border border-earth-100'}`}>
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="px-8 py-5 border-t border-earth-100 flex items-center justify-between bg-white/50">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-black text-earth-600 uppercase tracking-widest hover:text-agri-green-700 disabled:opacity-30">
                  <ChevronLeft size={15} /> Anterior
                </button>
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${page === p ? 'bg-agri-green-800 text-white shadow-md' : 'bg-white border border-earth-200 text-earth-500'}`}>
                      {p}
                    </button>
                  ))}
                </div>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-black text-earth-600 uppercase tracking-widest hover:text-agri-green-700 disabled:opacity-30">
                  Siguiente <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Panel de detalle */}
          <AnimatePresence>
            {selectedRecord && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}
                className="col-span-12 lg:col-span-5 bg-white rounded-[2.5rem] border border-agri-green-200 shadow-xl overflow-hidden self-start">
                <div className="p-6 bg-agri-green-900 relative overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-agri-green-500/10 rounded-full" />
                  <div className="relative flex justify-between items-start">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-agri-green-400 mb-1">Análisis seleccionado</p>
                      <h3 className="font-black text-white text-lg tracking-tight">{selectedRecord.field_name}</h3>
                      <p className="text-white/50 text-xs font-bold mt-0.5">{selectedRecord.date} · {selectedRecord.time}</p>
                    </div>
                    <button onClick={() => setSelectedRecord(null)}
                      className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                      <X size={15} />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Resultado',  value: selectedRecord.result },
                      { label: 'NDVI',       value: selectedRecord.ndvi.toFixed(2) },
                      { label: 'Cobertura',  value: `${selectedRecord.cobertura}%` },
                      { label: 'Confianza',  value: `${Math.round(selectedRecord.confianza * 100)}%` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-earth-200/20 rounded-2xl p-3.5">
                        <p className="text-[9px] font-black text-earth-400 uppercase tracking-widest mb-1">{label}</p>
                        <p className="font-black text-agri-green-950 text-sm">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Resultados IA */}
                  <p className="text-[10px] font-black text-earth-400 uppercase tracking-widest">Resultados de Gemini</p>

                  <div className="flex items-center justify-between p-4 bg-white border border-earth-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-agri-green-100 text-agri-green-600 rounded-xl"><Leaf size={15} /></div>
                      <span className="text-sm font-black text-earth-700">Enfermedades</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-black text-lg ${selectedRecord.diseases_count > 0 ? 'text-red-600' : 'text-agri-green-600'}`}>
                        {selectedRecord.diseases_count}
                      </span>
                      {selectedRecord.enf_detalle && selectedRecord.enf_detalle !== 'Ninguna' && (
                        <p className="text-[10px] text-earth-400">{selectedRecord.enf_detalle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white border border-earth-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 text-orange-600 rounded-xl"><Droplets size={15} /></div>
                      <span className="text-sm font-black text-earth-700">Estrés Hídrico</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-black text-lg ${selectedRecord.water_stress_pct > 50 ? 'text-red-600' : selectedRecord.water_stress_pct > 25 ? 'text-orange-600' : 'text-agri-green-600'}`}>
                        {selectedRecord.water_stress_pct}%
                      </span>
                      <p className="text-[10px] text-earth-400">{selectedRecord.nivel_estres}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white border border-earth-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${selectedRecord.plagas_count > 0 ? 'bg-red-100 text-red-600' : 'bg-agri-green-100 text-agri-green-600'}`}><Bug size={15} /></div>
                      <span className="text-sm font-black text-earth-700">Plagas</span>
                    </div>
                    <span className={`font-black text-lg ${selectedRecord.plagas_count > 0 ? 'text-red-600' : 'text-agri-green-600'}`}>
                      {selectedRecord.plagas_count}
                    </span>
                  </div>

                  {/* Insight */}
                  {selectedRecord.ai_insight && (
                    <div className="p-5 bg-agri-green-950 text-white rounded-2xl relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 w-20 h-20 bg-agri-green-500/10 rounded-full blur-xl" />
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-agri-green-400 mb-2">Insight de Gemini</p>
                      <p className="text-xs font-medium leading-relaxed opacity-90">"{selectedRecord.ai_insight}"</p>
                    </div>
                  )}

                  <button onClick={() => setDeleteTarget(selectedRecord)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-red-500 border border-red-100 hover:bg-red-50 transition-all">
                    <Trash2 size={14} /> Eliminar este análisis
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="¿Eliminar análisis?"
        description={`Se eliminará permanentemente el análisis del campo "${deleteTarget?.field_name}" del ${deleteTarget?.date}. Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar" cancelText="Cancelar" danger
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}