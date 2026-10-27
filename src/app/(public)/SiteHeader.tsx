"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { Button, Icon } from "@/components/ui";
import { brand } from "@/lib/brand";

const LINKS = [
  { href: "/roasters", label: "Roasters" },
  { href: "/about", label: "About" },
];

/** The site header: links in a row from 720px up; on a phone, behind a menu button that opens them below the header. */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && open) {
      close();
      toggle.current?.focus();
    }
  }

  return (
    <header className="site" onKeyDown={onKeyDown}>
      <div className="wrap site__in">
        <Link className="brand" href="/" onClick={close}>
          {brand.name}
        </Link>
        <nav className="nav" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} className="nav__link" href={l.href}>
              {l.label}
            </Link>
          ))}
          <Button variant="secondary" href="/submit">
            Submit a shop
          </Button>
        </nav>
        <button
          ref={toggle}
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label="Menu"
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name={open ? "close" : "menu"} size={20} />
        </button>
      </div>
      {open ? (
        <nav id="site-menu" className="wrap menu" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} className="menu__link" href={l.href} onClick={close}>
              {l.label}
            </Link>
          ))}
          <Link className="ca-btn ca-btn--secondary ca-btn--md" href="/submit" onClick={close}>
            Submit a shop
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
