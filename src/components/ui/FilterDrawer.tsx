"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { plural } from "@/lib/labels";
import { Button } from "./Button";
import { cx } from "./cx";
import { Icon } from "./Icon";

type FilterDrawerProps = {
  open: boolean;
  /** Called by the close button, the scrim, Escape and the apply button. */
  onClose: () => void;
  onClear: () => void;
  /** Shown in the apply button: 'Show 24 shops'. */
  resultCount?: number;
  title?: string;
  id?: string;
  children: ReactNode;
  className?: string;
};

/** The phone filter panel: a bottom sheet over a scrim. Traps focus, closes on Escape, returns focus on close. */
export function FilterDrawer({ open, onClose, onClear, resultCount, title = "Filters", id = "ca-filters", children, className }: FilterDrawerProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panel.current) return;
    const list = Array.from(
      panel.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
    ).filter((n) => !(n as HTMLButtonElement).disabled);
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const apply = typeof resultCount === "number" ? `Show ${plural(resultCount, "shop", "shops")}` : "Show results";

  return (
    <>
      <div className="ca-drawer__scrim" onClick={onClose} />
      <div
        className={cx("ca-drawer", className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        ref={panel}
        onKeyDown={onKeyDown}
      >
        <div className="ca-drawer__head">
          <h2 id={`${id}-title`} className="ca-drawer__title">
            {title}
          </h2>
          <button type="button" className="ca-drawer__close" aria-label="Close filters" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="ca-drawer__body">{children}</div>
        <div className="ca-drawer__foot">
          <Button variant="quiet" onClick={onClear}>
            Clear all
          </Button>
          <Button onClick={onClose}>{apply}</Button>
        </div>
      </div>
    </>
  );
}
