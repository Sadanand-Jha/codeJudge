/**
 * Toast Notification System Types
 * Premium glassmorphism toast notifications for byteCode
 */

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  /** Toast title — 15px semibold */
  title: string;
  /** Toast description — 13px muted */
  description?: string;
  /** Auto-dismiss duration in ms (default: 4500). Set to 0 or Infinity to disable. */
  duration?: number;
  /** Optional action button */
  action?: ToastAction;
  /** Optional timestamp label (e.g. "Just now") */
  timestamp?: string;
  /** Show close button (default: true) */
  dismissible?: boolean;
}

export interface ToastItem extends Required<Omit<ToastOptions, "action" | "timestamp">> {
  id: string;
  type: ToastType;
  title: string;
  description: string;
  duration: number;
  action?: ToastAction;
  timestamp?: string;
  dismissible: boolean;
  createdAt: number;
  /** Whether the auto-dismiss timer is paused (e.g. on hover) */
  paused: boolean;
  /** Elapsed time when paused, to resume correctly */
  elapsedAtPause: number;
}

export type ToastVariant = ToastType;

export interface ToastApi {
  success: (options: ToastOptions) => string;
  error: (options: ToastOptions) => string;
  warning: (options: ToastOptions) => string;
  info: (options: ToastOptions) => string;
  loading: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
  update: (id: string, options: Partial<ToastOptions> & { type?: ToastType }) => void;
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: ToastOptions;
      success: (data: T) => ToastOptions;
      error: (err: unknown) => ToastOptions;
    }
  ) => Promise<T>;
}