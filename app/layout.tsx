import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sovereign Portal",
  description: "Reference portal for the Sovereign Module Framework.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
