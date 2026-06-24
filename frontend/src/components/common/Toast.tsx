/* Toast notification system */
import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

let addToastFn: ((toast: Omit<ToastData, 'id'>) => void) | null = null;

export function toast(type: ToastData['type'], message: string, duration = 4000) {
  addToastFn?.({ type, message, duration });
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)', text: '#22C55E' },
  error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', text: '#EF4444' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', text: '#F59E0B' },
  info: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)', text: '#3B82F6' },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((t: Omit<ToastData, 'id'>) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, t.duration || 4000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  const remove = (id: string) => setToasts((prev) => prev.filter((x) => x.id !== id));

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        const c = colors[t.type];
        return (
          <div
            key={t.id}
            className="flex items-start gap-3 px-4 py-3 rounded-xl animate-slide-in"
            style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, backdropFilter: 'blur(12px)' }}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: c.text }} />
            <p className="text-sm flex-1" style={{ color: '#fff' }}>{t.message}</p>
            <button onClick={() => remove(t.id)} className="shrink-0 mt-0.5 opacity-50 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
