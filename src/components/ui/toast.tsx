'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type?: ToastType;
  title: string;
  description?: string;
  onClose?: () => void;
}

const icons: Record<ToastType, React.ReactNode> = {
  success:  <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
  error:    <XCircle className="w-5 h-5 text-red-500" />,
  warning:  <AlertTriangle className="w-5 h-5 text-amber-500" />,
  info:     <Info className="w-5 h-5 text-blue-500" />,
};

export function Toast({ type = 'info', title, description, onClose }: ToastProps) {
  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-2xl border shadow-xl bg-white animate-slide-in-right',
      'min-w-[320px] max-w-[400px]'
    )}>
      <div className="mt-0.5 shrink-0">{icons[type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Simple toast context/hook
interface ToastItem extends ToastProps { id: string }

const ToastContext = React.createContext<{
  toast: (props: Omit<ToastItem, 'id'>) => void;
}>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((props: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...props, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map(t => (
          <Toast key={t.id} {...t} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return React.useContext(ToastContext);
}
