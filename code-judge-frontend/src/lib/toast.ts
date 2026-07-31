/**
 * Standalone toast API — sonner-compatible wrapper around the toast store.
 *
 * Can be used anywhere (inside or outside React components).
 *
 * Usage:
 *   import { toast } from "@/lib/toast";
 *   toast.success("Settings saved successfully!");
 *   toast.error("Failed to save", { description: "Please try again." });
 *   toast.success({ title: "Settings Saved", description: "Your changes have been saved." });
 */

import { useToastStore } from "@/store/toastStore";
import type { ToastOptions, ToastType } from "@/types/toast";

function resolveOptions(
  messageOrOptions: string | ToastOptions,
  options?: { description?: string }
): ToastOptions {
  if (typeof messageOrOptions === "string") {
    return {
      title: messageOrOptions,
      description: options?.description,
    };
  }
  return messageOrOptions;
}

function createToast(
  type: ToastType,
  messageOrOptions: string | ToastOptions,
  options?: { description?: string }
): string {
  const opts = resolveOptions(messageOrOptions, options);
  return useToastStore.getState().addToast(type, opts);
}

export const toast = {
  success: (messageOrOptions: string | ToastOptions, options?: { description?: string }) =>
    createToast("success", messageOrOptions, options),
  error: (messageOrOptions: string | ToastOptions, options?: { description?: string }) =>
    createToast("error", messageOrOptions, options),
  warning: (messageOrOptions: string | ToastOptions, options?: { description?: string }) =>
    createToast("warning", messageOrOptions, options),
  info: (messageOrOptions: string | ToastOptions, options?: { description?: string }) =>
    createToast("info", messageOrOptions, options),
  loading: (messageOrOptions: string | ToastOptions, options?: { description?: string }) =>
    createToast("loading", messageOrOptions, options),
  dismiss: (id: string) => useToastStore.getState().removeToast(id),
  promise: async <T,>(
    promise: Promise<T>,
    options: {
      loading: string | ToastOptions;
      success: string | ((data: T) => string | ToastOptions);
      error: string | ((err: unknown) => string | ToastOptions);
    }
  ): Promise<T> => {
    const loadingOpts = resolveOptions(options.loading, {});
    const id = useToastStore.getState().addToast("loading", loadingOpts);
    try {
      const data = await promise;
      const successResult =
        typeof options.success === "function" ? options.success(data) : options.success;
      useToastStore.getState().updateToast(id, {
        ...resolveOptions(successResult, {}),
        type: "success",
      });
      return data;
    } catch (err) {
      const errorResult =
        typeof options.error === "function" ? options.error(err) : options.error;
      useToastStore.getState().updateToast(id, {
        ...resolveOptions(errorResult, {}),
        type: "error",
      });
      throw err;
    }
  },
};