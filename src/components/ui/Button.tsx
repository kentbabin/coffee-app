import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

type ButtonProps = {
  /** Default 'primary'. Use one primary per view. */
  variant?: "primary" | "secondary" | "quiet";
  /** Default 'md' (44px high). 'lg' is 52px, for the single page-level action. */
  size?: "md" | "lg";
  /** Renders a link that looks like a button. */
  href?: string;
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<"button">, "className" | "children">;

export function Button({ variant = "primary", size = "md", href, className, children, type = "button", ...rest }: ButtonProps) {
  const cls = cx("ca-btn", `ca-btn--${variant}`, `ca-btn--${size}`, className);
  if (href && !rest.disabled) {
    return (
      <Link className={cls} href={href} aria-label={rest["aria-label"]}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
