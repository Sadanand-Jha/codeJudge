"use client";

import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  MouseEventHandler,
  ReactNode,
} from "react";
import { cn } from "@/lib/helpers";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "text"
  | "danger"
  | "danger-solid"
  | "ai";

type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "b-pri",
  secondary: "",
  ghost: "b-ghost",
  text: "b-text",
  danger: "b-danger",
  "danger-solid": "b-danger-solid",
  ai: "b-ai",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "sm",
  md: "",
  lg: "lg",
};

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Label shown while loading, e.g. "Saving…". Defaults to the children. */
  loadingLabel?: ReactNode;
  iconLeft?: ReactNode;
  /** Only for text/ghost buttons that navigate to another page. */
  iconRight?: ReactNode;
  fullWidth?: boolean;
  href?: string;
  selected?: boolean;
  className?: string;
  children?: ReactNode;
}

type ButtonAsButton = ButtonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;
type ButtonAsAnchor = ButtonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className" | "href">;

export function Button(props: ButtonAsButton | ButtonAsAnchor) {
  const {
    variant = "secondary",
    size = "md",
    loading = false,
    loadingLabel,
    iconLeft,
    iconRight,
    fullWidth = false,
    href,
    selected,
    className,
    children,
    ...rest
  } = props as ButtonProps & {
    href?: string;
    onClick?: MouseEventHandler<HTMLElement>;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    target?: string;
    rel?: string;
    "aria-label"?: string;
    title?: string;
  };

  const classes = cn(
    "b",
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    fullWidth && "b-full",
    loading && "loading",
    className
  );

  const content = (
    <>
      {!loading && iconLeft}
      {loading ? (loadingLabel ?? children) : children}
      {!loading && iconRight}
    </>
  );

  if (href) {
    const {
      onClick,
      disabled,
      ...anchorRest
    } = rest as {
      onClick?: MouseEventHandler<HTMLAnchorElement>;
      type?: string;
      disabled?: boolean;
    } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children" | "className">;
    return (
      <Link
        href={href}
        aria-disabled={disabled || undefined}
        aria-busy={loading || undefined}
        className={classes}
        onClick={onClick}
        {...anchorRest}
      >
        {content}
      </Link>
    );
  }

  const { onClick, type = "button", disabled, ...buttonRest } = rest as {
    onClick?: MouseEventHandler<HTMLButtonElement>;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
  } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-pressed={selected}
      className={classes}
      {...buttonRest}
    >
      {content}
    </button>
  );
}

type IconButtonVariant = "secondary" | "ghost" | "close";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className" | "aria-label"> {
  /** Accessible name — required. Also used as the hover title. */
  label: string;
  size?: ButtonSize;
  variant?: IconButtonVariant;
  className?: string;
  children: ReactNode;
}

export function IconButton({
  label,
  size = "md",
  variant = "secondary",
  className,
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "b",
        "b-icon",
        variant === "close" && "b-close",
        variant === "ghost" && "b-ghost",
        SIZE_CLASS[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
