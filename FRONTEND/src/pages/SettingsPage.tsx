import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { type LucideIcon } from 'lucide-react';
import {
  Loader2, CheckCircle, User, Mail, Shield, Bell, Zap,
  ChevronRight, Camera, Eye, EyeOff, Lock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, ConfirmDialog } from '../components/ui';

const API_URL = 'http://127.0.0.1:8000/api/v1';

interface SettingsPageProps {
  onNotify: (msg: string) => void;
}

const SECTIONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'profile',  label: 'Perfil',            icon: User   },
  { id: 'security', label: 'Seguridad',          icon: Shield },
  { id: 'ai',       label: 'Preferencias de IA', icon: Zap    },
  { id: 'notif',    label: 'Notificaciones',      icon: Bell   },
];

// ── Toggle — fuera del componente principal ───────────────────
function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={`w-12 h-6 rounded-full relative cursor-pointer transition-all duration-300 ${value ? 'bg-agri-green-500' : 'bg-earth-200'}`}
    >
      <motion.div
        layout
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
        animate={{ left: value ? '26px' : '4px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </div>
  );
}

// ── Campo contraseña — fuera del componente principal ─────────
function PwdField({
  label, value, onChange, show, onToggle, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-earth-400 uppercase tracking-[0.15em] ml-1">
        {label}
      </label>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-7 h-7 bg-earth-100 group-focus-within:bg-agri-green-50 rounded-lg flex items-center justify-center transition-colors">
          <Lock size={14} className="text-earth-400 group-focus-within:text-agri-green-600 transition-colors" />
        </div>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-earth-200/20 border-2 border-earth-200 rounded-2xl pl-13 pr-12 py-4 text-sm font-medium focus:ring-0 focus:border-agri-green-500 focus:bg-white transition-all outline-none"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 bg-earth-100 hover:bg-earth-200 rounded-lg flex items-center justify-center transition-colors"
        >
          {show
            ? <EyeOff size={14} className="text-earth-400" />
            : <Eye    size={14} className="text-earth-400" />
          }
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function SettingsPage({ onNotify }: SettingsPageProps) {
  const { profile, signOut } = useAuth();

  const [activeSection, setActiveSection] = useState('profile');

  // Perfil
  const [displayName,  setDisplayName]  = useState('');
  const [email,        setEmail]        = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving,     setIsSaving]     = useState(false);
  const [saveSuccess,  setSaveSuccess]  = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Seguridad
  const [currentPwd,        setCurrentPwd]        = useState('');
  const [newPwd,            setNewPwd]            = useState('');
  const [confirmPwd,        setConfirmPwd]        = useState('');
  const [showCurrent,       setShowCurrent]       = useState(false);
  const [showNew,           setShowNew]           = useState(false);
  const [showConfirm,       setShowConfirm]       = useState(false);
  const [isSavingPwd,       setIsSavingPwd]       = useState(false);
  const [pwdSuccess,        setPwdSuccess]        = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Preferencias
  const [autoAnalysis, setAutoAnalysis] = useState(true);
  const [emailReports, setEmailReports] = useState(true);
  const [pushNotif,    setPushNotif]    = useState(true);

  // Cargar datos del perfil real
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setEmail(profile.email || '');
      setPhotoPreview(profile.photoURL || null);
    }
  }, [profile]);

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

  const roleLabel =
    profile?.role === 'admin'    ? 'Administrador' :
    profile?.role === 'agronomo' ? 'Agrónomo'      : 'Productor';

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onNotify('Solo se aceptan imágenes JPG, PNG o WEBP.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!displayName.trim()) { onNotify('El nombre no puede estar vacío.'); return; }
    setIsSaving(true);
    try {
      const token = sessionStorage.getItem('token');
      const res   = await fetch(`${API_URL}/auth/me`, {
        method:  'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ display_name: displayName }),
      });
      if (res.ok) {
        const raw = sessionStorage.getItem('user');
        if (raw) {
          const user = JSON.parse(raw);
          user.displayName = displayName;
          sessionStorage.setItem('user', JSON.stringify(user));
        }
      }
      setSaveSuccess(true);
      onNotify('Perfil actualizado correctamente.');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      onNotify('Error de conexión.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePwd = async () => {
    if (!currentPwd)           { onNotify('Ingresa tu contraseña actual.');                          return; }
    if (newPwd.length < 6)     { onNotify('La nueva contraseña debe tener al menos 6 caracteres.'); return; }
    if (newPwd !== confirmPwd) { onNotify('Las contraseñas nuevas no coinciden.');                   return; }
    setIsSavingPwd(true);
    try {
      const token = sessionStorage.getItem('token');
      const res   = await fetch(`${API_URL}/auth/me/password`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
      });
      if (res.ok) {
        setPwdSuccess(true);
        onNotify('Contraseña actualizada correctamente.');
        setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
        setTimeout(() => setPwdSuccess(false), 3000);
      } else {
        const err = await res.json();
        onNotify(err.detail || 'Error al cambiar la contraseña.');
      }
    } catch {
      onNotify('Error de conexión con el servidor.');
    } finally {
      setIsSavingPwd(false);
    }
  };

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          label="Preferencias"
          title="Configuración"
          description="Gestiona tu cuenta y las preferencias del sistema."
        />

        <div className="grid grid-cols-12 gap-8">

          {/* Menú lateral */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-[2rem] border border-earth-200 shadow-xl shadow-earth-900/5 overflow-hidden">
              <div className="p-6 bg-gradient-to-br from-agri-green-800 to-agri-green-950 relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-agri-green-500/10 rounded-full" />
                <div className="relative flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-agri-green-400/30 bg-earth-200">
                      {photoPreview
                        ? <img src={photoPreview} alt="Foto" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        : <div className="w-full h-full flex items-center justify-center bg-agri-green-700"><User size={24} className="text-white/60" /></div>
                      }
                    </div>
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-agri-green-500 rounded-lg flex items-center justify-center shadow-lg hover:bg-agri-green-400 transition-colors"
                    >
                      <Camera size={11} className="text-white" />
                    </button>
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-white text-sm tracking-tight truncate">{displayName || 'Usuario'}</p>
                    <p className="text-agri-green-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">{roleLabel}</p>
                  </div>
                </div>
              </div>

              <nav className="p-3 space-y-1">
                {SECTIONS.map(({ id, label, icon: Icon }) => {
                  const isActive = activeSection === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveSection(id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left ${
                        isActive
                          ? 'bg-agri-green-50 text-agri-green-800 border border-agri-green-100'
                          : 'text-earth-500 hover:bg-earth-200/30 hover:text-earth-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={17} className={isActive ? 'text-agri-green-600' : 'text-earth-400'} />
                        <span className="text-sm font-bold">{label}</span>
                      </div>
                      <ChevronRight size={14} className={isActive ? 'text-agri-green-400' : 'text-earth-300'} />
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Panel de contenido */}
          <div className="col-span-12 lg:col-span-9">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >

                {/* PERFIL */}
                {activeSection === 'profile' && (
                  <div className="space-y-6">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />

                    <div className="bg-white rounded-[2rem] border border-earth-200 shadow-xl shadow-earth-900/5 overflow-hidden">
                      <div className="h-28 bg-gradient-to-r from-agri-green-800 via-agri-green-700 to-agri-green-600 relative overflow-hidden">
                        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
                      </div>
                      <div className="px-8 pb-8">
                        <div className="-mt-10 mb-6 flex items-end justify-between">
                          <div className="relative">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-earth-200">
                              {photoPreview
                                ? <img src={photoPreview} alt="Perfil" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                : <div className="w-full h-full flex items-center justify-center bg-agri-green-100"><User size={32} className="text-agri-green-400" /></div>
                              }
                            </div>
                            <button
                              onClick={() => photoInputRef.current?.click()}
                              className="absolute -bottom-1 -right-1 w-8 h-8 bg-agri-green-500 rounded-xl flex items-center justify-center shadow-lg hover:bg-agri-green-600 transition-colors"
                            >
                              <Camera size={14} className="text-white" />
                            </button>
                          </div>
                          <span className="px-4 py-2 bg-agri-green-50 text-agri-green-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-agri-green-100 mb-2">
                            {roleLabel}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-earth-400 uppercase tracking-[0.15em] flex items-center gap-2">
                              <User size={11} /> Nombre completo
                            </label>
                            <input
                              type="text"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              placeholder="Tu nombre completo"
                              className="w-full bg-earth-200/20 border border-earth-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-agri-green-500/10 focus:border-agri-green-500 focus:bg-white transition-all outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-earth-400 uppercase tracking-[0.15em] flex items-center gap-2">
                              <Mail size={11} /> Correo electrónico
                            </label>
                            <input
                              type="email"
                              value={email}
                              readOnly
                              className="w-full bg-earth-100 border border-earth-200 rounded-2xl px-5 py-4 text-sm font-bold text-earth-400 cursor-not-allowed outline-none"
                            />
                            <p className="text-[10px] font-bold text-earth-400 ml-1">El correo no se puede cambiar desde aquí.</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-agri-green-800 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-agri-green-900 transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 className="animate-spin" size={15} /> : 'Guardar Cambios'}
                          </button>
                          <AnimatePresence>
                            {saveSuccess && (
                              <motion.div
                                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                className="flex items-center gap-2 text-agri-green-600 font-black text-[10px] uppercase tracking-widest"
                              >
                                <CheckCircle size={15} /> ¡Guardado!
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* Info de cuenta */}
                    <div className="bg-white rounded-[2rem] border border-earth-200 shadow-xl shadow-earth-900/5 p-8">
                      <h3 className="font-black text-agri-green-950 tracking-tight mb-5">Información de cuenta</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { label: 'Miembro desde', value: memberSince },
                          { label: 'Último acceso',  value: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) },
                          { label: 'Rol',            value: roleLabel  },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-earth-200/20 rounded-2xl p-4">
                            <p className="text-[10px] font-black text-earth-400 uppercase tracking-widest mb-1">{label}</p>
                            <p className="font-black text-agri-green-950 text-sm">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SEGURIDAD */}
                {activeSection === 'security' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] border border-earth-200 shadow-xl shadow-earth-900/5 overflow-hidden">
                      <div className="p-8 border-b border-earth-100">
                        <h3 className="font-black text-agri-green-950 tracking-tight text-xl">Cambiar Contraseña</h3>
                        <p className="text-earth-400 text-sm font-medium mt-1">Actualiza tu contraseña de acceso.</p>
                      </div>
                      <div className="p-8 space-y-5">
                        <PwdField
                          label="Contraseña actual"
                          value={currentPwd}
                          onChange={setCurrentPwd}
                          show={showCurrent}
                          onToggle={() => setShowCurrent(v => !v)}
                          placeholder="Tu contraseña actual"
                        />
                        <PwdField
                          label="Nueva contraseña"
                          value={newPwd}
                          onChange={setNewPwd}
                          show={showNew}
                          onToggle={() => setShowNew(v => !v)}
                          placeholder="Mínimo 6 caracteres"
                        />
                        <PwdField
                          label="Confirmar nueva contraseña"
                          value={confirmPwd}
                          onChange={setConfirmPwd}
                          show={showConfirm}
                          onToggle={() => setShowConfirm(v => !v)}
                          placeholder="Repite la nueva contraseña"
                        />
                        {newPwd && confirmPwd && newPwd !== confirmPwd && (
                          <p className="text-xs font-bold text-red-500">Las contraseñas no coinciden</p>
                        )}
                        <div className="flex items-center gap-4 pt-2">
                          <button
                            onClick={handleChangePwd}
                            disabled={isSavingPwd}
                            className="bg-agri-green-800 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-agri-green-900 transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
                          >
                            {isSavingPwd ? <Loader2 className="animate-spin" size={15} /> : 'Actualizar Contraseña'}
                          </button>
                          <AnimatePresence>
                            {pwdSuccess && (
                              <motion.div
                                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                className="flex items-center gap-2 text-agri-green-600 font-black text-[10px] uppercase tracking-widest"
                              >
                                <CheckCircle size={15} /> ¡Actualizada!
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-earth-200 shadow-xl shadow-earth-900/5 p-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-black text-agri-green-950 tracking-tight">Autenticación de dos pasos</h3>
                          <p className="text-earth-400 text-sm font-medium mt-1">Añade una capa extra de seguridad.</p>
                        </div>
                        <span className="px-4 py-2 bg-earth-100 text-earth-500 rounded-xl text-[10px] font-black uppercase tracking-widest">
                          Próximamente
                        </span>
                      </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border-2 border-red-100 shadow-xl shadow-earth-900/5 p-8">
                      <h3 className="font-black text-red-600 tracking-tight mb-2">Zona de peligro</h3>
                      <p className="text-earth-400 text-sm font-medium mb-5">Estas acciones son permanentes e irreversibles.</p>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-6 py-3.5 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                      >
                        Eliminar cuenta permanentemente
                      </button>
                    </div>
                  </div>
                )}

                {/* PREFERENCIAS DE IA */}
                {activeSection === 'ai' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] border border-earth-200 shadow-xl shadow-earth-900/5 overflow-hidden">
                      <div className="p-8 border-b border-earth-100">
                        <h3 className="font-black text-agri-green-950 tracking-tight text-xl">Preferencias de IA</h3>
                        <p className="text-earth-400 text-sm font-medium mt-1">Personaliza el comportamiento del motor de análisis.</p>
                      </div>
                      <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between py-4 border-b border-earth-100">
                          <div>
                            <p className="font-black text-sm text-earth-900 tracking-tight">Análisis Automático</p>
                            <p className="text-earth-400 text-xs font-medium mt-0.5">Procesa imágenes automáticamente al subirlas</p>
                          </div>
                          <Toggle value={autoAnalysis} onToggle={() => setAutoAnalysis(v => !v)} />
                        </div>
                      </div>
                    </div>

                    <div className="bg-agri-green-950 rounded-[2rem] p-8 text-white relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-agri-green-500/10 rounded-full blur-2xl" />
                      <div className="relative">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-agri-green-400 mb-1">Motor de IA</p>
                        <h3 className="font-black text-2xl tracking-tight mb-6">Nivel de Precisión</h3>
                        <div className="space-y-4">
                          {[
                            { label: 'Detección de enfermedades',  value: 94 },
                            { label: 'Análisis de estrés hídrico', value: 88 },
                            { label: 'Índice NDVI',                value: 97 },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-xs font-bold text-white/70">{label}</span>
                                <span className="text-xs font-black text-agri-green-400">{value}%</span>
                              </div>
                              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${value}%` }}
                                  transition={{ duration: 1, ease: 'easeOut' }}
                                  className="h-full bg-agri-green-500 rounded-full"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* NOTIFICACIONES */}
                {activeSection === 'notif' && (
                  <div className="bg-white rounded-[2rem] border border-earth-200 shadow-xl shadow-earth-900/5 overflow-hidden">
                    <div className="p-8 border-b border-earth-100">
                      <h3 className="font-black text-agri-green-950 tracking-tight text-xl">Notificaciones</h3>
                      <p className="text-earth-400 text-sm font-medium mt-1">Decide cómo y cuándo te enviamos alertas.</p>
                    </div>
                    <div className="p-8 space-y-6">
                      {[
                        { label: 'Reportes por Email',  desc: 'Resúmenes semanales de tus campos en tu correo', value: emailReports, toggle: () => setEmailReports(v => !v) },
                        { label: 'Notificaciones Push', desc: 'Alertas críticas en tiempo real en el navegador',  value: pushNotif,    toggle: () => setPushNotif(v => !v)    },
                      ].map(({ label, desc, value, toggle }) => (
                        <div key={label} className="flex items-center justify-between py-4 border-b border-earth-100 last:border-0">
                          <div>
                            <p className="font-black text-sm text-earth-900 tracking-tight">{label}</p>
                            <p className="text-earth-400 text-xs font-medium mt-0.5">{desc}</p>
                          </div>
                          <Toggle value={value} onToggle={toggle} />
                        </div>
                      ))}
                    </div>
                    <div className="px-8 py-5 border-t border-earth-100 bg-earth-200/20">
                      <p className="text-[10px] font-bold text-earth-400 leading-relaxed">
                        Las alertas críticas siempre se mostrarán en el panel independientemente de estas preferencias.
                      </p>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="¿Eliminar tu cuenta?"
        description="Esta acción eliminará permanentemente tu cuenta, campos, análisis e historial. No se puede deshacer."
        confirmText="Sí, eliminar mi cuenta"
        cancelText="Cancelar"
        danger
        onConfirm={() => { setShowDeleteConfirm(false); signOut(); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}