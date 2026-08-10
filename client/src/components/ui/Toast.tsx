import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconAlertTriangle, IconCheckCircle, IconX } from '../icons';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  detail?: string;
}

interface ToastContextValue {
  push: (kind: ToastKind, message: string, detail?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const kindStyles: Record<ToastKind, { border: string; text: string; icon: ReactNode }> = {
  success: { border: 'border-easy/40', text: 'text-easy', icon: <IconCheckCircle className="w-4 h-4" /> },
  error: { border: 'border-hard/40', text: 'text-hard', icon: <IconAlertTriangle className="w-4 h-4" /> },
  info: { border: 'border-accent/40', text: 'text-accent', icon: <IconCheckCircle className="w-4 h-4" /> },
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string, detail?: string) => {
      const id = nextId++;
      setToasts((current) => [...current, { id, kind, message, detail }]);
      setTimeout(() => remove(id), 5000);
    },
    [remove],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2" role="region" aria-label="Notifications">
          {toasts.map((toast) => {
            const style = kindStyles[toast.kind];
            return (
              <div
                key={toast.id}
                role="status"
                className={`flex items-start gap-3 rounded-lg border ${style.border} bg-surface px-4 py-3 shadow-panel animate-pop min-w-[16rem] max-w-sm`}
              >
                <span className={`mt-0.5 shrink-0 ${style.text}`}>{style.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">{toast.message}</p>
                  {toast.detail && <p className="mt-0.5 text-xs text-secondary">{toast.detail}</p>}
                </div>
                <button
                  onClick={() => remove(toast.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 text-muted hover:text-primary transition-colors"
                >
                  <IconX className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
