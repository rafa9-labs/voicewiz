import * as React from "react";
import { X, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "../lib/utils";
import { ToastContext, type ToastProps } from "./useToast";

interface ToastState extends ToastProps {
  id: string;
  isExiting?: boolean;
  createdAt: number;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastState[]>([]);
  const timersRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const clearTimer = React.useCallback((id: string) => {
    const timer = timersRef.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timersRef.current[id];
    }
  }, []);

  const startExitAnimation = React.useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  const toast = React.useCallback(
    (props: Omit<ToastProps, "id">): string => {
      const id = Math.random().toString(36).substring(2, 11);
      const newToast: ToastState = { ...props, id, createdAt: Date.now() };

      setToasts((prev) => [...prev, newToast]);

      const duration = props.duration ?? (props.variant === "destructive" ? 4000 : 2500);
      if (duration > 0) {
        const timer = setTimeout(() => {
          startExitAnimation(id);
        }, duration);
        timersRef.current[id] = timer;
      }

      return id;
    },
    [startExitAnimation]
  );

  const dismiss = React.useCallback(
    (id?: string) => {
      if (id) {
        clearTimer(id);
        startExitAnimation(id);
      } else {
        const lastToast = toasts[toasts.length - 1];
        if (lastToast) {
          clearTimer(lastToast.id);
          startExitAnimation(lastToast.id);
        }
      }
    },
    [toasts, clearTimer, startExitAnimation]
  );

  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const id in timers) {
        clearTimeout(timers[id]);
      }
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss, toastCount: toasts.length }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

const variantConfig = {
  default: {
    bg: "bg-neutral-900/90",
    border: "border-white/10",
    text: "text-white/90",
    Icon: Info,
  },
  destructive: {
    bg: "bg-red-950/90",
    border: "border-red-500/20",
    text: "text-red-100",
    Icon: AlertCircle,
  },
  success: {
    bg: "bg-emerald-950/90",
    border: "border-emerald-500/20",
    text: "text-emerald-100",
    Icon: CheckCircle2,
  },
};

const ToastViewport: React.FC<{
  toasts: ToastState[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[100] flex flex-col items-center gap-1.5 pointer-events-none px-4">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          {...toast}
          onClose={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
};

const ToastItem: React.FC<
  ToastState & { onClose?: () => void }
> = ({
  title,
  description,
  action,
  variant = "default",
  isExiting,
  onClose,
}) => {
  const config = variantConfig[variant];
  const Icon = config.Icon;
  const message = title || description;
  const detail = title && description ? description : undefined;

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-2 max-w-[90vw]",
        "rounded-full px-4 py-1.5 border shadow-lg backdrop-blur-md",
        config.bg, config.border,
        "transition-all duration-250 ease-out",
        isExiting
          ? "opacity-0 scale-90 translate-y-2"
          : "opacity-100 scale-100 animate-in zoom-in-95 fade-in duration-200"
      )}
    >
      <Icon className={cn("size-3.5 shrink-0 mt-0.5", config.text)} />

      <div className="min-w-0 flex-1">
        <span className={cn("text-xs font-medium", config.text)}>
          {message}
        </span>
        {detail && (
          <span className="block text-[10px] leading-tight mt-0.5 opacity-60 truncate">
            {detail}
          </span>
        )}
      </div>

      {action && (
        <div className="shrink-0 self-center">{action}</div>
      )}

      {onClose && (
        <button
          onClick={onClose}
          className={cn(
            "shrink-0 self-center p-0.5 rounded-full",
            "opacity-40 hover:opacity-100 transition-opacity",
            "hover:bg-white/10"
          )}
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
};
