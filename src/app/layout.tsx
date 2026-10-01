import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "ZERO GRAVITY | Customer Payment Operations",
  description:
    "A workspace for recording opportunities, reviewing public DNS signals, and requesting voluntary customer payments through Stripe Checkout. Figures are not forecasts or payout balances.",
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
