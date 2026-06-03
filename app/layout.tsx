import "./globals.css";
import type { Metadata } from "next";
import { ThemeProvider, THEME_BOOT_SCRIPT } from "../lib/ThemeProvider";

export const metadata: Metadata = {
  title: "Sovereign Portal",
  description: "Reference portal for the Sovereign Module Framework.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Inline boot script to set data-theme before first paint and avoid FOUC. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
