import type { ComponentProps } from "react";
import { cx } from "./cx";
import { Icon } from "./Icon";

type SearchFieldProps = {
  /** Accessible name. Default 'Search'. */
  label?: string;
  className?: string;
} & Omit<ComponentProps<"input">, "type" | "className">;

export function SearchField({ label = "Search", placeholder = "Search shops, roasters and areas", className, ...rest }: SearchFieldProps) {
  return (
    <div className={cx("ca-search", className)}>
      <Icon name="search" />
      <input type="search" className="ca-search__input" placeholder={placeholder} aria-label={label} {...rest} />
    </div>
  );
}
