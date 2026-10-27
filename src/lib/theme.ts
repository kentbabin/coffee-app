// Light or dark, as the visitor chose in this browser. With no choice saved,
// the page follows the device setting (prefers-color-scheme in tokens.css).

export type Theme = "light" | "dark";

export const THEME_KEY = "coffee.theme";

/** Runs in <head> before the first paint, so a saved choice never flashes the other theme first. */
export const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
