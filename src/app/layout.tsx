import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "ZERO GRAVITY | $0 → Real Revenue Autonomous Engine",
  description:
    "An AI-augmented execution platform turning $0 into real revenue by exploiting structural market asymmetries, zero-risk contingency pipelines, and free software tooling.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased min-h-screen selection:bg-emerald-500 selection:text-black">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
