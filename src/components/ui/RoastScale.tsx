import { ROAST_LABEL, ROAST_SCALE } from "@/lib/labels";
import { cx } from "./cx";

/** Three segments for light, medium and dark; the levels a shop offers are filled and named. */
export function RoastScale({ levels = [], showLabel = true, className }: { levels?: string[]; showLabel?: boolean; className?: string }) {
  const on = new Set(levels);
  const label = ROAST_SCALE.filter((l) => on.has(l))
    .map((l) => ROAST_LABEL[l])
    .join(", ");
  return (
    <span className={cx("ca-roast", className)} role="img" aria-label={`Roast: ${label ? label.toLowerCase() : "not set"}`}>
      <span className="ca-roast__bars" aria-hidden="true">
        {ROAST_SCALE.map((l) => (
          <span key={l} className={cx("ca-roast__bar", `ca-roast__bar--${l}`, on.has(l) && "is-on")} />
        ))}
      </span>
      {showLabel ? (
        <span className="ca-roast__label" aria-hidden="true">
          {label || "Roast not set"}
        </span>
      ) : null}
    </span>
  );
}
