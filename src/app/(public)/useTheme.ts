import { useLayoutEffect, useSyncExternalStore } from "react";
import { THEME_KEY, type Theme } from "@/lib/theme";

// The theme on screen is a data-theme attribute on <html>: set before the
// first paint by the root layout's script, and here when the visitor switches.

const CHANGED = "coffee:theme-changed";
const DEVICE_DARK = "(prefers-color-scheme: dark)";

function saved(): Theme | null {
  try {
    const t = window.localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

function apply(theme: Theme | null) {
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}

function current(): Theme {
  const t = document.documentElement.dataset.theme;
  if (t === "light" || t === "dark") return t;
  return window.matchMedia(DEVICE_DARK).matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const device = window.matchMedia(DEVICE_DARK);
  // A choice made in another tab applies here too.
  const onStorage = () => {
    apply(saved());
    onChange();
  };
  device.addEventListener("change", onChange);
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    device.removeEventListener("change", onChange);
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** The theme on screen (null while rendering on the server), and a switch to the other one that's remembered here. */
export function useTheme(): [Theme | null, () => void] {
  const theme = useSyncExternalStore(subscribe, current, () => null);

  // In development React resets <html>'s attributes when it remounts; put the choice back.
  useLayoutEffect(() => {
    const s = saved();
    if (s) apply(s);
  }, []);

  function toggle() {
    const next = current() === "dark" ? "light" : "dark";
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage blocked: the choice lasts until the page is reloaded.
    }
    // Switch in one step, without every button fading through grey on its own transition.
    const still = document.createElement("style");
    still.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.appendChild(still);
    apply(next);
    // Reading a style makes the browser apply the new theme before transitions come back.
    void getComputedStyle(document.body).backgroundColor;
    setTimeout(() => still.remove());
    window.dispatchEvent(new Event(CHANGED));
  }

  return [theme, toggle];
}
