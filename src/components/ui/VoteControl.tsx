"use client";

import { cx } from "./cx";
import { Icon } from "./Icon";

export type Vote = 1 | -1 | 0;

type VoteControlProps = {
  /** Total thumbs up, including this visitor's own vote. */
  up: number;
  /** Total thumbs down, including this visitor's own vote. */
  down: number;
  /** This visitor's current vote. */
  value: Vote;
  /** Called with the new vote: tapping the active thumb again sends 0. */
  onVote: (value: Vote) => void;
  disabled?: boolean;
  className?: string;
};

/** Thumbs up and down with counts, shown once above 0. Controlled: the caller owns the counts (see ShopVote). */
export function VoteControl({ up, down, value, onVote, disabled, className }: VoteControlProps) {
  function button(v: 1 | -1, count: number) {
    const isUp = v === 1;
    const on = value === v;
    return (
      <button
        type="button"
        className={cx("ca-vote__btn", isUp ? "ca-vote__btn--up" : "ca-vote__btn--down", on && "is-on")}
        aria-pressed={on}
        aria-label={`${isUp ? "Thumbs up" : "Thumbs down"}, ${count}`}
        disabled={disabled}
        onClick={() => onVote(on ? 0 : v)}
      >
        <Icon name={isUp ? "up" : "down"} fill={on} />
        {/* A row of zeros reads as empty: the count appears with the first vote. */}
        {count > 0 ? <span className="ca-vote__n">{count}</span> : null}
      </button>
    );
  }
  return (
    <div className={cx("ca-vote", className)} role="group" aria-label="Vote">
      {button(1, up)}
      {button(-1, down)}
    </div>
  );
}
