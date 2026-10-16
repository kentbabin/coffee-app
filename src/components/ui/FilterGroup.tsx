import type { ReactNode } from "react";
import { cx } from "./cx";

/** One named set of filter chips. The label is the fieldset legend, so screen readers announce the group. */
export function FilterGroup({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cx("ca-fgroup", className)}>
      <legend className="ca-fgroup__label">{label}</legend>
      <div className="ca-fgroup__chips">{children}</div>
    </fieldset>
  );
}
