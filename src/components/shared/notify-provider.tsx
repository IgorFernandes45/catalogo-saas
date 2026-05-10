"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type NotificationTone = "success" | "error" | "info";

type NotificationInput = {
  title?: string;
  message: string;
  tone?: NotificationTone;
  duration?: number;
};

type NotificationItem = NotificationInput & {
  id: number;
  tone: NotificationTone;
};

type NotifyContextValue = {
  notify: (input: NotificationInput) => void;
};

const NotifyContext = createContext<NotifyContextValue | null>(null);

export function NotifyProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const nextIdRef = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    ({ title, message, tone = "info", duration = 3600 }: NotificationInput) => {
      const id = nextIdRef.current++;

      setItems((current) => [
        ...current,
        {
          id,
          title,
          message,
          tone,
        },
      ]);

      window.setTimeout(() => {
        dismiss(id);
      }, duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotifyContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[90] flex justify-center px-4 sm:justify-end">
        <div className="flex w-full max-w-sm flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              role="status"
              aria-live="polite"
              className={`pointer-events-auto overflow-hidden rounded-[24px] border px-4 py-3 shadow-[0_20px_50px_rgba(15,23,42,0.16)] backdrop-blur ${
                item.tone === "success"
                  ? "border-emerald-200 bg-white/95 text-emerald-900"
                  : item.tone === "error"
                    ? "border-red-200 bg-white/95 text-red-900"
                    : "border-slate-200 bg-white/95 text-slate-900"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                    item.tone === "success"
                      ? "bg-emerald-500"
                      : item.tone === "error"
                        ? "bg-red-500"
                        : "bg-orange-500"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  {item.title ? (
                    <p className="text-sm font-semibold">{item.title}</p>
                  ) : null}
                  <p className="text-sm leading-6">{item.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Fechar notificacao"
                >
                  Fechar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </NotifyContext.Provider>
  );
}

export function useNotify() {
  const context = useContext(NotifyContext);

  if (!context) {
    throw new Error("useNotify precisa estar dentro de NotifyProvider.");
  }

  return context.notify;
}
