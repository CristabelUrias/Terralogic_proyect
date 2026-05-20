// ─────────────────────────────────────────────────────────────
// useNotification.ts
// Hook para mostrar notificaciones toast temporales.
// Soporta tipos: success, error, warning, info
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { ToastMessage, ToastType } from '../types';

interface UseNotificationReturn {
  toast:   ToastMessage | null;
  notify:  (text: string, type?: ToastType) => void;
  notifyError:   (text: string) => void;
  notifyWarning: (text: string) => void;
  notifyInfo:    (text: string) => void;
}

export function useNotification(duration = 4000): UseNotificationReturn {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const notify = useCallback((text: string, type: ToastType = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), duration);
  }, [duration]);

  const notifyError   = useCallback((text: string) => notify(text, 'error'),   [notify]);
  const notifyWarning = useCallback((text: string) => notify(text, 'warning'), [notify]);
  const notifyInfo    = useCallback((text: string) => notify(text, 'info'),    [notify]);

  return { toast, notify, notifyError, notifyWarning, notifyInfo };
}
