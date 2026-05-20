// ─────────────────────────────────────────────────────────────
// TopBar.tsx
// Recibe alerts como prop desde App.tsx para que el panel
// de notificaciones siempre refleje las alertas activas reales.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Bell, Settings, X, AlertTriangle, Info, CheckCircle2, type LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Alert, AlertType } from '../../types';

interface TopBarProps {
  profile:         UserProfile | null;
  alerts:          Alert[];      // ← recibido desde App.tsx
  onSettingsClick: () => void;
  onAlertsClick:   () => void;
  onMenuToggle:    () => void;
}

const NOTIF_STYLES: Record<AlertType, { icon: LucideIcon; color: string; bg: string }> = {
  critical: { icon: AlertTriangle, color: 'text-red-500',        bg: 'bg-red-50'        },
  warning:  { icon: Info,          color: 'text-orange-500',     bg: 'bg-orange-50'     },
  info:     { icon: CheckCircle2,  color: 'text-agri-green-600', bg: 'bg-agri-green-50' },
};

export default function TopBar({ profile, alerts, onSettingsClick, onAlertsClick }: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-20 fixed top-0 right-0 left-0 lg:left-64 bg-white/90 backdrop-blur-xl border-b border-earth-200/50 flex items-center justify-end px-6 lg:px-10 z-40">

      <div className="flex items-center gap-3">

        {/* Notificaciones */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(v => !v)}
            className={`p-2.5 rounded-xl transition-all relative border ${
              showNotifications
                ? 'bg-agri-green-50 text-agri-green-700 border-agri-green-200'
                : 'text-earth-500 hover:bg-earth-200/40 hover:text-agri-green-700 border-transparent hover:border-earth-200'
            }`}
          >
            <Bell size={20} />
            {/* Badge usa alerts.length en tiempo real */}
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white text-white text-[9px] font-black flex items-center justify-center">
                {alerts.length}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-14 w-96 bg-white rounded-3xl shadow-2xl shadow-earth-900/15 border border-earth-200 overflow-hidden z-50"
              >
                <div className="px-6 py-4 border-b border-earth-100 flex justify-between items-center">
                  <div>
                    <p className="font-black text-agri-green-950 tracking-tight text-sm">Notificaciones</p>
                    <p className="text-[10px] font-bold text-earth-400 uppercase tracking-widest mt-0.5">
                      {alerts.length} sin leer
                    </p>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-earth-50">
                  {alerts.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-earth-400 font-bold text-sm">Sin notificaciones</p>
                    </div>
                  ) : (
                    alerts.map((notif, i) => {
                      const { icon: Icon, color, bg } = NOTIF_STYLES[notif.type];
                      return (
                        <div key={i} className="flex gap-4 px-5 py-4 hover:bg-earth-200/20 transition-colors">
                          <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <Icon size={16} className={color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-earth-900 tracking-tight">{notif.title}</p>
                            <p className="text-xs text-earth-500 font-medium mt-0.5 leading-relaxed truncate">{notif.desc}</p>
                            <p className="text-[10px] font-bold text-earth-300 uppercase tracking-widest mt-1">{notif.time}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="px-6 py-4 border-t border-earth-100 bg-earth-200/20">
                  <button
                    onClick={() => { setShowNotifications(false); onAlertsClick(); }}
                    className="w-full text-center text-[10px] font-black text-agri-green-700 uppercase tracking-widest hover:text-agri-green-900 transition-colors"
                  >
                    Ver todas las alertas →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Configuración */}
        <button
          onClick={onSettingsClick}
          className="p-2.5 text-earth-500 hover:bg-earth-200/40 hover:text-agri-green-700 rounded-xl transition-all border border-transparent hover:border-earth-200"
        >
          <Settings size={20} />
        </button>

        <div className="h-8 w-[1px] bg-earth-200 mx-1" />

        {/* Perfil */}
        <button
          onClick={onSettingsClick}
          className="flex items-center gap-3 p-1.5 pr-4 hover:bg-earth-200/30 rounded-2xl transition-all border border-transparent hover:border-earth-200 group"
        >
          <div className="w-9 h-9 rounded-xl bg-earth-200 overflow-hidden border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
            <img
              src={profile?.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=100&h=100&q=80'}
              alt="Avatar" referrerPolicy="no-referrer"
            />
          </div>
          <div className="text-left">
            <p className="text-xs font-black text-earth-900 tracking-tight leading-none mb-0.5">
              {profile?.displayName || 'Usuario'}
            </p>
            <p className="text-[10px] font-bold text-agri-green-600 uppercase tracking-widest leading-none">
              {profile?.role === 'admin' ? 'Administrador' : profile?.role === 'agronomo' ? 'Agrónomo' : 'Productor'}
            </p>
          </div>
        </button>
      </div>

      {showNotifications && (
        <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
      )}
    </header>
  );
}
