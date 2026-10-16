import type { ReactNode } from "react";
import { cx } from "./cx";

/** Shown in place of results when nothing matches. No illustration, apology or joke. */
export function EmptyState({ title, children, actions, className }: { title: string; children?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cx("ca-empty", className)}>
      <h2 className="ca-empty__title">{title}</h2>
      {children ? <p className="ca-empty__text">{children}</p> : null}
      {actions ? <div className="ca-empty__actions">{actions}</div> : null}
    </div>
  );
}
