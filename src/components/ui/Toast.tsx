"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

// Типы
type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

// Хук для использования toast в компонентах
export function useToast() {
  return useContext(ToastContext);
}

// Провайдер — оборачивает приложение
let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);

    // Автоматическое удаление через 4 секунды
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Контейнер для тостов */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              onClick={() => removeToast(t.id)}
              className="px-4 py-3 rounded-lg text-sm font-medium shadow-lg cursor-pointer animate-slide-up"
              style={{
                backgroundColor: t.type === "success"
                  ? "var(--success)"
                  : t.type === "error"
                  ? "var(--destructive)"
                  : "var(--primary)",
                color: "white",
              }}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
