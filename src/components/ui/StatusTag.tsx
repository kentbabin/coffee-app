import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./Icon";

const LABEL = { visible: "Visible", hidden: "Hidden", pending: "Pending" } as const;
const ICON = { visible: "eye", hidden: "eyeOff", pending: "clock" } as const;

/** Whether a shop or submission is visible, hidden or pending. Icon and word together. Admin only. */
export function StatusTag({ kind = "visible", children, className }: { kind?: keyof typeof LABEL; children?: ReactNode; className?: string }) {
  return (
    <span className={cx("ca-status", `ca-status--${kind}`, className)}>
      <Icon name={ICON[kind]} size={14} />
      {children ?? LABEL[kind]}
    </span>
  );
}
