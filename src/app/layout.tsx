import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://zero-gravity.wah-lah.com"),
  title: {
    default: "Zero Gravity | Free Domain DNS Check & Email Authentication Review",
    template: "%s | Zero Gravity",
  },
  description:
    "Check public SPF, DMARC and MX records for free. Zero Gravity provides transparent, human-reviewed domain signals reports with clear findings and practical next steps.",
  applicationName: "Zero Gravity",
  keywords: [
    "free DNS check", "SPF lookup", "DMARC check", "MX record lookup",
    "email authentication", "domain signals review", "Wah-Lah",
  ],
  openGraph: {
    type: "website",
    siteName: "Zero Gravity",
    title: "Zero Gravity | Free Domain DNS Check",
    description: "See what your domain's public SPF, DMARC and MX records show before you buy a review.",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
    title: "Zero Gravity | Free Domain DNS Check",
    description: "A transparent, read-only check of public SPF, DMARC and MX records.",
  },
  robots: { index: true, follow: true },
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
