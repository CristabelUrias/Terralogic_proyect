import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Clock, Sprout, Send, CheckCircle2,
  AlertTriangle, Loader2, Plus, X, Bell, ChevronRight
} from 'lucide-react';
import { PageHeader } from '../components/ui';
import { listFields, type FieldItem } from '../services/fields.service';
import { TabId } from '../types';

const API_URL = 'http://127.0.0.1:8000/api/v1';

interface CalendarPageProps {
  onNavigate: (tab: TabId) => void;
}

interface ScheduledEvent {
  id:         string;
  field_name: string;
  date:       string;
  time:       string;
  notes:      string;
  created_at: string;
}

export default function CalendarPage({ onNavigate }: CalendarPageProps) {
  const [fields,      setFields]      = useState<FieldItem[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [sending,     setSending]     = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [scheduled,   setScheduled]   = useState<ScheduledEvent[]>(() => {
    try { return JSON.parse(localStorage.getItem('scheduledAnalyses') || '[]'); }
    catch { return []; }
  });

  // Formulario
  const [fieldName, setFieldName]   = useState('');
  const [customField, setCustomField] = useState('');
  const [fieldMode, setFieldMode]   = useState<'existing' | 'new'>('existing');
  const [date,      setDate]        = useState('');
  const [time,      setTime]        = useState('08:00');
  const [notes,     setNotes]       = useState('');

  // Fecha mínima = hoy
  const today    = new Date().toISOString().split('T')[0];
  const userJson = sessionStorage.getItem('user');
  const user     = userJson ? JSON.parse(userJson) : {};

  useEffect(() => {
    listFields().then(d => setFields(d.items)).catch(() => {});
  }, []);

  const effectiveField = fieldMode === 'existing' ? fieldName : customField.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!effectiveField) { setError('Selecciona o escribe el nombre del campo.'); return; }
    if (!date)           { setError('Selecciona una fecha.'); return; }
    if (!user?.email)    { setError('No se encontró el correo del usuario.'); return; }

    setSending(true);
    try {
      const token = sessionStorage.getItem('token');
      const res   = await fetch(`${API_URL}/calendar/schedule`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          field_name:  effectiveField,
          date,
          time,
          notes,
          user_email:  user.email,
          user_name:   user.displayName || 'Usuario',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al programar el análisis.');

      // Guardar localmente
      const newEvent: ScheduledEvent = {
        id:         Date.now().toString(),
        field_name: effectiveField,
        date,
        time,
        notes,
        created_at: new Date().toISOString(),
      };
      const updated = [newEvent, ...scheduled];
      setScheduled(updated);
      localStorage.setItem('scheduledAnalyses', JSON.stringify(updated));

      setSuccess(true);
      setFieldName(''); setCustomField(''); setDate(''); setTime('08:00'); setNotes('');
      setTimeout(() => setSuccess(false), 5000);

    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setSending(false);
    }
  };

  const removeScheduled = (id: string) => {
    const updated = scheduled.filter(e => e.id !== id);
    setScheduled(updated);
    localStorage.setItem('scheduledAnalyses', JSON.stringify(updated));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (t: string) => {
    const [h, m] = t.split(':');
    const hour   = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  // Ordenar por fecha próxima
  const upcoming = scheduled
    .filter(e => new Date(`${e.date}T${e.time}`) >= new Date())
    .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());

  const past = scheduled
    .filter(e => new Date(`${e.date}T${e.time}`) < new Date())
    .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());

  return (
    <div className="space-y-8">
      <PageHeader
        label="Planificación"
        title="Calendario de Análisis"
        description="Programa recordatorios de análisis y recibe la invitación en tu correo para agregar al calendario."
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Formulario — 2/5 */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white rounded-[2.5rem] border border-earth-200 shadow-xl p-8 self-start">

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-agri-green-100 rounded-xl">
              <Plus size={18} className="text-agri-green-700" />
            </div>
            <h2 className="text-lg font-black text-agri-green-950">Nuevo Recordatorio</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Campo */}
            <div>
              <label className="text-[10px] font-black text-earth-400 uppercase tracking-widest ml-1 mb-2 block">
                Campo a analizar
              </label>
              <div className="flex gap-2 p-1 bg-earth-100/60 rounded-xl mb-3">
                <button type="button" onClick={() => setFieldMode('existing')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${fieldMode === 'existing' ? 'bg-white shadow text-agri-green-800' : 'text-earth-500'}`}>
                  Existente
                </button>
                <button type="button" onClick={() => setFieldMode('new')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${fieldMode === 'new' ? 'bg-white shadow text-agri-green-800' : 'text-earth-500'}`}>
                  Nuevo
                </button>
              </div>

              {fieldMode === 'existing' ? (
                <select value={fieldName} onChange={e => setFieldName(e.target.value)}
                  className="w-full bg-earth-50 border border-earth-200 rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:border-agri-green-500 transition-all">
                  <option value="">— Selecciona un campo —</option>
                  {fields.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
              ) : (
                <input type="text" value={customField} onChange={e => setCustomField(e.target.value)}
                  placeholder="Ej. Parcela Norte B-7"
                  className="w-full bg-earth-50 border border-earth-200 rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:border-agri-green-500 transition-all" />
              )}
            </div>

            {/* Fecha */}
            <div>
              <label className="text-[10px] font-black text-earth-400 uppercase tracking-widest ml-1 mb-2 block">
                Fecha del análisis
              </label>
              <div className="relative">
                <Calendar size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-400" />
                <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)}
                  className="w-full bg-earth-50 border border-earth-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium outline-none focus:border-agri-green-500 transition-all" />
              </div>
            </div>

            {/* Hora */}
            <div>
              <label className="text-[10px] font-black text-earth-400 uppercase tracking-widest ml-1 mb-2 block">
                Hora
              </label>
              <div className="relative">
                <Clock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-400" />
                <input type="time" value={time} onChange={e => setTime(e.target.value)}
                  className="w-full bg-earth-50 border border-earth-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium outline-none focus:border-agri-green-500 transition-all" />
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="text-[10px] font-black text-earth-400 uppercase tracking-widest ml-1 mb-2 block">
                Notas <span className="text-earth-300">(opcional)</span>
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Ej. Revisar zona norte por posible estrés hídrico..."
                rows={3}
                className="w-full bg-earth-50 border border-earth-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:border-agri-green-500 transition-all resize-none" />
            </div>

            {/* Correo destino */}
            <div className="p-3 bg-agri-green-50 border border-agri-green-100 rounded-xl flex items-center gap-2">
              <Send size={13} className="text-agri-green-600 flex-shrink-0" />
              <p className="text-xs font-bold text-agri-green-700">
                Se enviará a: <span className="text-agri-green-900">{user?.email || '—'}</span>
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-bold">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            {/* Éxito */}
            <AnimatePresence>
              {success && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="p-3 bg-agri-green-50 border border-agri-green-200 rounded-xl flex items-center gap-2 text-agri-green-700 text-xs font-bold">
                  <CheckCircle2 size={14} /> ¡Recordatorio enviado! Revisa tu correo.
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={sending}
              className="w-full bg-agri-green-800 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-agri-green-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {sending
                ? <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                : <><Send size={16} /> Programar y enviar correo</>
              }
            </button>
          </form>
        </motion.div>

        {/* Lista de recordatorios — 3/5 */}
        <div className="lg:col-span-3 space-y-6">

          {/* Próximos */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-2 mb-4">
              <Bell size={15} className="text-agri-green-600" />
              <h2 className="text-sm font-black text-agri-green-950 uppercase tracking-widest">
                Próximos análisis
              </h2>
              {upcoming.length > 0 && (
                <span className="ml-auto px-2.5 py-1 bg-agri-green-100 text-agri-green-700 rounded-full text-[10px] font-black">
                  {upcoming.length}
                </span>
              )}
            </div>

            {upcoming.length === 0 ? (
              <div className="bg-white rounded-[2rem] border border-earth-100 p-10 text-center">
                <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-14 h-14 rounded-[1.5rem] bg-agri-green-50 flex items-center justify-center mx-auto mb-4">
                  <Calendar size={24} className="text-agri-green-300" />
                </motion.div>
                <p className="text-earth-400 font-bold text-sm mb-1">Sin análisis programados</p>
                <p className="text-earth-300 text-xs">Programa tu primer recordatorio con el formulario</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {upcoming.map((event, i) => (
                    <motion.div key={event.id}
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }} transition={{ delay: i * 0.06 }}
                      className="bg-white rounded-[2rem] border border-agri-green-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">

                      <div className="w-12 h-12 rounded-xl bg-agri-green-800 flex flex-col items-center justify-center flex-shrink-0 text-white">
                        <span className="text-[10px] font-black leading-none uppercase">
                          {new Date(event.date + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short' })}
                        </span>
                        <span className="text-xl font-black leading-none">
                          {new Date(event.date + 'T00:00:00').getDate()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-black text-agri-green-950 text-sm">{event.field_name}</p>
                        <p className="text-earth-400 text-xs font-bold mt-0.5">
                          {formatDate(event.date)} · {formatTime(event.time)}
                        </p>
                        {event.notes && (
                          <p className="text-earth-500 text-xs mt-1 line-clamp-1">{event.notes}</p>
                        )}
                        <button onClick={() => onNavigate('analysis')}
                          className="mt-2 text-[10px] font-black text-agri-green-600 uppercase tracking-widest flex items-center gap-1 hover:text-agri-green-800 transition-colors">
                          Ir a análisis <ChevronRight size={11} />
                        </button>
                      </div>

                      <button onClick={() => removeScheduled(event.id)}
                        className="text-earth-300 hover:text-red-500 transition-colors flex-shrink-0">
                        <X size={16} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* Pasados */}
          {past.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={15} className="text-earth-400" />
                <h2 className="text-sm font-black text-earth-400 uppercase tracking-widest">Anteriores</h2>
              </div>
              <div className="space-y-2">
                {past.slice(0, 3).map((event, i) => (
                  <motion.div key={event.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl border border-earth-100 px-5 py-3.5 flex items-center gap-3 opacity-60">
                    <div className="w-8 h-8 rounded-lg bg-earth-100 flex items-center justify-center flex-shrink-0">
                      <Sprout size={14} className="text-earth-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-earth-600 text-sm truncate">{event.field_name}</p>
                      <p className="text-earth-400 text-[10px]">{formatDate(event.date)} · {formatTime(event.time)}</p>
                    </div>
                    <button onClick={() => removeScheduled(event.id)}
                      className="text-earth-300 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}