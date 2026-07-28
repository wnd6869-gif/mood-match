import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ActionVariant = "primary" | "secondary";

const BASE_CLASSES =
  "flex min-h-14 w-full cursor-pointer select-none items-center justify-center rounded-2xl px-5 py-3.5 text-center text-base font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-2 active:scale-[0.98]";

const VARIANT_CLASSES: Record<ActionVariant, string> = {
  primary:
    "bg-neutral-900 text-white shadow-sm hover:bg-neutral-800 active:bg-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none disabled:active:scale-100",
  secondary:
    "border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100 active:bg-neutral-200 disabled:cursor-not-allowed disabled:border-neutral-100 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:active:scale-100",
};

function actionClasses(variant: ActionVariant, className: string) {
  return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`;
}

type ActionLinkProps = {
  href: string;
  children: ReactNode;
  variant?: ActionVariant;
  className?: string;
  ariaLabel?: string;
};

export function ActionLink({
  href,
  children,
  variant = "primary",
  className = "",
  ariaLabel,
}: ActionLinkProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={actionClasses(variant, className)}
    >
      {children}
    </Link>
  );
}

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ActionVariant;
};

export function ActionButton({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ActionButtonProps) {
  return (
    <button
      type={type}
      className={actionClasses(variant, className)}
      {...props}
    >
      {children}
    </button>
  );
}
