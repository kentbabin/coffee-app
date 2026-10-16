import type { Metadata } from "next";
import "./admin.css";

// Admin pages read the session on every request; they don't need a static shell.
export const instant = false;

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
