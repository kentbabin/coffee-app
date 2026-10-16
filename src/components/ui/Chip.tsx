import type { MouseEventHandler, ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./Icon";

type ChipProps = {
  children: ReactNode;
  className?: string;
} & (
  | { /** A non-interactive attribute label, as on a shop card. */ static: true }
  | { /** An applied filter: shows an x. */ onRemove: MouseEventHandler<HTMLButtonElement>; /** Spoken name, e.g. 'light roast'. */ removeLabel: string }
  | { selected: boolean; onToggle: MouseEventHandler<HTMLButtonElement> }
);

/** A pill for filtering, for an applied filter, or for labelling an attribute. */
export function Chip(props: ChipProps) {
  if ("static" in props) {
    return <span className={cx("ca-chip", "ca-chip--static", props.className)}>{props.children}</span>;
  }
  if ("onRemove" in props) {
    return (
      <button
        type="button"
        className={cx("ca-chip", "ca-chip--on", props.className)}
        aria-label={`Remove filter ${props.removeLabel}`}
        onClick={props.onRemove}
      >
        {props.children}
        <Icon name="close" size={14} />
      </button>
    );
  }
  return (
    <button
      type="button"
      className={cx("ca-chip", props.selected && "ca-chip--on", props.className)}
      aria-pressed={props.selected}
      onClick={props.onToggle}
    >
      {props.selected ? <Icon name="check" size={14} /> : null}
      {props.children}
    </button>
  );
}
