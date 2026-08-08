/**
 * useToast — Premium toast notification hook
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success({ title: "Solution Submitted", description: "Your code has been queued." });
 *   toast.error({ title: "Compilation Failed", description: "Unexpected token near line 27." });
 *   toast.promise(fetchData, { loading: {...}, success: {...}, error: {...} });
 */

import { useCallback, useMemo } from "react";
import { useToastStore } from "@/store/toastStore";
import type { ToastApi, ToastOptions, ToastType } from "@/types/toast";

export function useToast(): ToastApi {
  const addToast = useToastStore((s) => s.addToast);
  const removeToast = useToastStore((s) => s.removeToast);
  const updateToast = useToastStore((s) => s.updateToast);

  const success = useCallback(
    (options: ToastOptions) => addToast("success", options),
    [addToast]
  );

  const error = useCallback(
    (options: ToastOptions) => addToast("error", options),
    [addToast]
  );

  const warning = useCallback(
    (options: ToastOptions) => addToast("warning", options),
    [addToast]
  );

  const info = useCallback(
    (options: ToastOptions) => addToast("info", options),
    [addToast]
  );

  const loading = useCallback(
    (options: ToastOptions) => addToast("loading", options),
    [addToast]
  );

  const dismiss = useCallback(
    (id: string) => removeToast(id),
    [removeToast]
  );

  const update = useCallback(
    (id: string, options: Partial<ToastOptions> & { type?: ToastType }) =>
      updateToast(id, options),
    [updateToast]
  );

  const promise = useCallback(
    async <T,>(
      promise: Promise<T>,
      options: {
        loading: ToastOptions;
        success: (data: T) => ToastOptions;
        error: (err: unknown) => ToastOptions;
      }
    ): Promise<T> => {
      const id = addToast("loading", options.loading);
      try {
        const data = await promise;
        updateToast(id, { ...options.success(data), type: "success" });
        return data;
      } catch (err) {
        updateToast(id, { ...options.error(err), type: "error" });
        throw err;
      }
    },
    [addToast, updateToast]
  );

  return useMemo(
    () => ({
      success,
      error,
      warning,
      info,
      loading,
      dismiss,
      update,
      promise,
    }),
    [success, error, warning, info, loading, dismiss, update, promise]
  );
}