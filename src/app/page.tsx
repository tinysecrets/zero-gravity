import type { Metadata } from "next";
import { PublicSalesPage } from "@/components/PublicSalesPage";

const description = "Check public SPF, DMARC and MX records for free. See clear observations before deciding whether to order a human-reviewed domain report.";

export const metadata: Metadata = {
  title: "Free Domain DNS Check & Email Authentication Review",
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website", siteName: "Zero Gravity",
    title: "Zero Gravity | Free Domain DNS Check", description,
    url: "/", images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zero Gravity | Free Domain DNS Check", description,
    images: ["/opengraph-image"],
  },
};
export default function PublicHomePage() { return <PublicSalesPage />; }
