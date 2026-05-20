// ─────────────────────────────────────────────────────────────
// ConfirmDialog.tsx
// Diálogo de confirmación modal reutilizable.
// Usado para acciones destructivas como descartar alertas
// críticas o cerrar sesión.
// ─────────────────────────────────────────────────────────────

import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open:        boolean;
  title:       string;
  description: string;
  confirmText?: string;
  cancelText?:  string;
  danger?:      boolean;   // true = botón confirmar en rojo
  onConfirm:   () => void;
  onCancel:    () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText  = 'Cancelar',
  danger      = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay de fondo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-agri-green-950/40 backdrop-blur-sm z-[200]"
          />

          {/* Diálogo centrado */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-full max-w-md"
          >
            <div className="bg-white rounded-[2rem] shadow-2xl shadow-agri-green-950/20 border border-earth-200 p-8">

              {/* Ícono */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                danger ? 'bg-red-50 text-red-500' : 'bg-agri-green-50 text-agri-green-600'
              }`}>
                <AlertTriangle size={28} />
              </div>

              {/* Contenido */}
              <h3 className="text-xl font-black text-agri-green-950 tracking-tight mb-2">{title}</h3>
              <p className="text-earth-500 text-sm font-medium leading-relaxed mb-8">{description}</p>

              {/* Acciones */}
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-earth-200 text-earth-600 hover:bg-earth-200/30 transition-all"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all active:scale-[0.98] shadow-lg ${
                    danger
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                      : 'bg-agri-green-800 hover:bg-agri-green-900 shadow-agri-green-900/20'
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
