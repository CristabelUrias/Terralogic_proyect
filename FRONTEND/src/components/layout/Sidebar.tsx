import {
  LayoutDashboard, Sprout, Microscope,
  History, BellRing, Settings, CalendarDays,
  HelpCircle, LogOut, X, Mail, BookOpen,
  MessageCircle, type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TabId } from '../../types';
import { NAV_ITEMS } from '../../constants';
import { ConfirmDialog } from '../ui';

const ICON_MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  fields:    Sprout,
  analysis:  Microscope,
  history:   History,
  alerts:    BellRing,
  calendar:  CalendarDays,
  settings:  Settings,
};

interface SidebarProps {
  activeTab:    TabId;
  setActiveTab: (id: TabId) => void;
  alertCount:   number;
  onSignOut:    () => void;
  onNewReport:  () => void;
}

export default function Sidebar({ activeTab, setActiveTab, alertCount, onSignOut }: SidebarProps) {
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showHelp,           setShowHelp]           = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <aside className="h-screen w-64 bg-white flex flex-col py-8 z-50 shadow-2xl border-r border-earth-200 flex-shrink-0">

        {/* Logo */}
        <div className="px-8 mb-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-agri-green-500 flex items-center justify-center text-white shadow-lg shadow-agri-green-500/20">
              <Sprout size={20} />
            </div>
            <h2 className="text-2xl font-black text-agri-green-950 tracking-tighter">TerraLogic</h2>
          </div>
          <p className="text-[9px] font-black text-agri-green-600 uppercase tracking-[0.2em] opacity-70">
            IA Agrícola de Precisión
          </p>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1.5 px-4">
          {NAV_ITEMS.map((item) => {
            const Icon     = ICON_MAP[item.id as keyof typeof ICON_MAP] || LayoutDashboard;
            const isActive = activeTab === item.id;

            return (
              <button key={item.id}
                onClick={() => { setActiveTab(item.id); navigate(`/${item.id}`); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${
                  isActive
                    ? 'bg-agri-green-800 text-white shadow-xl shadow-agri-green-900/20'
                    : 'text-earth-500 hover:text-agri-green-900 hover:bg-agri-green-50'
                }`}
              >
                {isActive && (
                  <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-agri-green-400 rounded-r-full" />
                )}
                <Icon size={20} className={isActive ? 'text-agri-green-400' : 'text-earth-400 group-hover:text-agri-green-600 transition-colors'} />
                <span className="text-sm font-bold tracking-tight flex-1 text-left">{item.label}</span>
                {item.id === 'alerts' && alertCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center bg-red-500 text-white">
                    {alertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 mt-auto">
          <div className="pt-6 border-t border-earth-100 space-y-1">
            <button
              onClick={() => setShowHelp(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-earth-400 hover:text-agri-green-700 hover:bg-agri-green-50 rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
            >
              <HelpCircle size={18} /> Ayuda
            </button>
            <button
              onClick={() => setShowSignOutConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-earth-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
            >
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* ── Modal de Ayuda ── */}
      <AnimatePresence>
        {showHelp && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowHelp(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden">

                {/* Header */}
                <div className="bg-agri-green-950 px-8 py-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-agri-green-800 rounded-xl">
                      <HelpCircle size={18} className="text-agri-green-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-agri-green-400">Centro de</p>
                      <h2 className="text-lg font-black text-white">Ayuda</h2>
                    </div>
                  </div>
                  <button onClick={() => setShowHelp(false)}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>

                {/* Contenido */}
                <div className="p-8 space-y-5">

                  {/* Guía rápida */}
                  <div>
                    <p className="text-[10px] font-black text-earth-400 uppercase tracking-widest mb-3">Guía rápida</p>
                    <div className="space-y-2">
                      {[
                        { icon: LayoutDashboard, title: 'Estadísticas',  desc: 'Vista general de todos tus campos y el último análisis realizado.' },
                        { icon: Microscope,      title: 'Análisis',      desc: 'Sube una imagen de tu cultivo para que Gemini AI detecte plagas, enfermedades y estrés hídrico.' },
                        { icon: Sprout,          title: 'Campos',        desc: 'Gestiona y monitorea todos tus campos con sus métricas históricas.' },
                        { icon: History,         title: 'Historial',     desc: 'Consulta todos los análisis anteriores y exporta reportes en CSV.' },
                        { icon: BellRing,        title: 'Alertas',       desc: 'Notificaciones automáticas generadas cuando se detectan problemas críticos.' },
                        { icon: CalendarDays,    title: 'Calendario',    desc: 'Programa recordatorios de análisis y recíbelos en tu correo con invitación al calendario.' },
                      ].map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="flex items-start gap-3 p-3 rounded-2xl hover:bg-agri-green-50 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-agri-green-100 flex items-center justify-center flex-shrink-0">
                            <Icon size={14} className="text-agri-green-700" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-agri-green-950">{title}</p>
                            <p className="text-xs text-earth-500 leading-relaxed">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <hr className="border-earth-100" />

                  {/* Contacto */}
                  <div>
                    <p className="text-[10px] font-black text-earth-400 uppercase tracking-widest mb-3">Contacto y soporte</p>
                    <div className="space-y-2">
                      <a href="mailto:TerraLogicSV@gmail.com"
                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-agri-green-50 transition-colors group">
                        <div className="w-8 h-8 rounded-lg bg-agri-green-100 flex items-center justify-center flex-shrink-0">
                          <Mail size={14} className="text-agri-green-700" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-agri-green-950">Correo de soporte</p>
                          <p className="text-xs text-agri-green-600 group-hover:underline">TerraLogicSV@gmail.com</p>
                        </div>
                      </a>
                      <div className="flex items-center gap-3 p-3 rounded-2xl">
                        <div className="w-8 h-8 rounded-lg bg-agri-green-100 flex items-center justify-center flex-shrink-0">
                          <BookOpen size={14} className="text-agri-green-700" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-agri-green-950">Versión</p>
                          <p className="text-xs text-earth-400">TerraLogic AI v1.0.0 · Gemini 2.5 Flash</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Confirmar cierre de sesión ── */}
      <ConfirmDialog
        open={showSignOutConfirm}
        title="¿Cerrar sesión?"
        description="Se cerrará tu sesión actual y regresarás a la pantalla de inicio de sesión."
        confirmText="Sí, cerrar sesión"
        cancelText="Cancelar"
        danger
        onConfirm={() => { setShowSignOutConfirm(false); onSignOut(); }}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </>
  );
}