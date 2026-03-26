'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
  isShown: boolean;
};

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const toastStyles: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
};

const toastEmojis: Record<ToastType, string> = {
  success: '🎉',
  error: '🚫',
  info: '💡',
};

const toastTitles: Record<ToastType, string> = {
  success: 'Success',
  error: 'Error',
  info: 'Info',
};

const failedPattern = /fail|failed/i;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);

    setToasts((current) => [...current, { id, message, type, isShown: false }]);

    window.setTimeout(() => {
      setToasts((current) =>
        current.map((toast) => (toast.id === id ? { ...toast, isShown: true } : toast))
      );
    }, 20);

    window.setTimeout(() => {
      setToasts((current) =>
        current.map((toast) => (toast.id === id ? { ...toast, isShown: false } : toast))
      );
    }, 2850);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3250);
  }, []);

  const value = useMemo(
    () => ({
      success: (message: string) => pushToast(message, 'success'),
      error: (message: string) => pushToast(message, 'error'),
      info: (message: string) => pushToast(message, 'info'),
    }),
    [pushToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-[17rem] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-3 py-3.5 shadow-lg backdrop-blur-sm min-h-[86px] transition-all duration-300 ease-out ${toastStyles[toast.type]} ${
              toast.isShown ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-8 opacity-0 scale-95'
            }`}
          >
            <div className="min-w-0">
              <p className="text-[12px] font-bold uppercase tracking-wide">
                {(toast.type === 'error' && failedPattern.test(toast.message) ? '🛑' : toastEmojis[toast.type])}{' '}
                {toast.type === 'error' && failedPattern.test(toast.message) ? 'Failed' : toastTitles[toast.type]}
              </p>
              <p className="mt-1 text-sm font-medium leading-5 break-words">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}