"use client";

import { useEffect, useState } from "react";
import { cx } from "./cx";
import { Icon } from "./Icon";

/**
 * Shares a page: the phone's share sheet where there is one, otherwise the
 * link is copied. 'round' is the icon button on a card, beside the Maps
 * button; 'button' is a secondary button with words.
 */
export function ShareButton({ href, title, variant = "button", className }: { href: string; title: string; variant?: "round" | "button"; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  async function share() {
    const url = new URL(href, window.location.origin).href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        // Closing the share sheet is not an error; anything else falls back to copying.
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // No clipboard access: nothing more to do.
    }
  }

  const status = (
    <span className="ca-share__status" role="status">
      {copied ? "Link copied" : ""}
    </span>
  );

  if (variant === "round") {
    return (
      <button type="button" className={cx("ca-share", className)} onClick={share} aria-label={`Share ${title}`}>
        <Icon name={copied ? "check" : "share"} />
        {status}
      </button>
    );
  }
  return (
    <button type="button" className={cx("ca-btn", "ca-btn--secondary", "ca-btn--md", className)} onClick={share}>
      <Icon name={copied ? "check" : "share"} size={16} /> {copied ? "Link copied" : "Share"}
      {status}
    </button>
  );
}
