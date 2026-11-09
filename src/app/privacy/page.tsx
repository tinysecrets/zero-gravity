import type { Metadata } from "next";
import Link from "next/link";

const description = "Learn what information Zero Gravity collects for free DNS previews, orders and inquiries, and how service providers are used.";
export const metadata: Metadata = {
  title: "Privacy Notice",
  description,
  alternates: { canonical: "/privacy" },
  openGraph: { type: "website", siteName: "Zero Gravity", title: "Privacy Notice | Zero Gravity", description, url: "/privacy", images: ["/opengraph-image"] },
  twitter: { card: "summary_large_image", title: "Privacy Notice | Zero Gravity", description, images: ["/opengraph-image"] },
};

export default function PrivacyPage() {
  return <main className="min-h-screen bg-[#07090d] px-5 py-12 text-zinc-100 sm:px-8">
    <div className="mx-auto max-w-3xl">
      <Link href="/" className="text-sm text-teal-200 hover:text-white">← Zero Gravity home</Link>
      <p className="mt-10 text-xs tracking-[0.2em] text-teal-200">PRIVACY</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">How information is handled.</h1>
      <p className="mt-5 text-sm leading-7 text-zinc-400">This notice describes the information used by the current Zero Gravity service. It is a plain-language summary, not legal advice.</p>
      <div className="mt-8 space-y-6 text-sm leading-7 text-zinc-300">
        <section><h2 className="text-lg font-semibold text-white">Free DNS preview</h2><p className="mt-2 text-zinc-400">The free preview accepts a domain name and queries public DNS records through Cloudflare DNS-over-HTTPS service. The preview does not ask for your name, email address, account password or payment details, and the preview result is not saved to the customer lead database by this route.</p></section>
        <section><h2 className="text-lg font-semibold text-white">Orders and inquiries</h2><p className="mt-2 text-zinc-400">When you submit an order or inquiry, the service collects the name, email address, domain and message fields you provide. Order and inquiry records are stored in the service database so the request can be handled and payment status can be reconciled. Do not submit passwords, private keys, mailbox contents or other sensitive credentials.</p></section>
        <section><h2 className="text-lg font-semibold text-white">Payments and service providers</h2><p className="mt-2 text-zinc-400">Payment checkout is provided by Stripe. Zero Gravity receives payment and checkout references needed to reconcile an order; card details are entered on Stripe-hosted checkout. The site is hosted on Vercel and uses Vercel Analytics. If inquiry notifications are configured, Resend may process notification email. Public DNS previews use Cloudflare DNS-over-HTTPS.</p></section>
        <section><h2 className="text-lg font-semibold text-white">How information is used</h2><p className="mt-2 text-zinc-400">Information is used to respond to inquiries, create and fulfill requested reviews, communicate about an order, prevent abuse, maintain service security and reconcile payments. Submitting an inquiry does not enroll you in a bulk marketing list.</p></section>
        <section><h2 className="text-lg font-semibold text-white">Retention and requests</h2><p className="mt-2 text-zinc-400">Order and payment records may need to be retained for accounting, dispute handling, security and legal obligations. This deployment does not publish a fixed deletion schedule. To ask about access, correction or deletion of inquiry information, use the contact form on the home page and identify the email address and domain associated with your request.</p></section>
        <section><h2 className="text-lg font-semibold text-white">Contact</h2><p className="mt-2 text-zinc-400">Zero Gravity is operated by Wah-Lah, founded and operated by Justin Smith. Use the <Link href="/#contact" className="text-teal-200 hover:text-white">contact form</Link> for privacy questions.</p></section>
      </div>
      <p className="mt-10 text-xs text-zinc-500">Last updated: November 8, 2026.</p>
    </div>
  </main>;
}
