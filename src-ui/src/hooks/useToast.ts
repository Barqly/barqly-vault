import { useState, useCallback } from 'react';
import { ToastMessage, ToastType } from '../components/ui/Toast';

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (
      type: ToastType,
      title: string,
      message?: string,
      options?: {
        duration?: number;
        action?: {
          label: string;
          onClick: () => void;
        };
      },
    ) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: ToastMessage = {
        id,
        type,
        title,
        message,
        duration: options?.duration,
        action: options?.action,
      };

      setToasts((prev) => [...prev, newToast]);
      return id;
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showSuccess = useCallback(
    (title: string, message?: string, options?: { duration?: number }) => {
      return addToast('success', title, message, options);
    },
    [addToast],
  );

  const showError = useCallback(
    (
      title: string,
      message?: string,
      options?: {
        duration?: number;
        action?: { label: string; onClick: () => void };
      },
    ) => {
      return addToast('error', title, message, {
        duration: options?.duration || 7000, // Errors stay longer
        action: options?.action,
      });
    },
    [addToast],
  );

  const showWarning = useCallback(
    (title: string, message?: string, options?: { duration?: number }) => {
      return addToast('warning', title, message, options);
    },
    [addToast],
  );

  const showInfo = useCallback(
    (title: string, message?: string, options?: { duration?: number }) => {
      return addToast('info', title, message, options);
    },
    [addToast],
  );

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll,
  };
};
