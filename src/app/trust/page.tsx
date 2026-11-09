import type { Metadata } from "next";
import Link from "next/link";

const description = "Read exactly what Zero Gravity checks, what the domain review includes, and what public DNS evidence cannot prove.";
export const metadata: Metadata = {
  title: "Trust, Scope & Transparency",
  description,
  alternates: { canonical: "/trust" },
  openGraph: { type: "website", siteName: "Zero Gravity", title: "Trust & Scope | Zero Gravity", description, url: "/trust", images: ["/opengraph-image"] },
  twitter: { card: "summary_large_image", title: "Trust & Scope | Zero Gravity", description, images: ["/opengraph-image"] },
};

const items = [
{title:"What we inspect",body:"A limited, read-only review of publicly observable SPF, DMARC and MX DNS records for one domain you own or are authorized to assess."},
{title:"What we do not claim",body:"Public DNS records do not prove inbox placement, lost revenue, compromise, regulatory compliance or that a specific configuration change is safe."},
{title:"No surprise changes",body:"We do not log in to your registrar, change DNS, send mail as your domain or modify production systems as part of this review."},
{title:"Human review",body:"The paid service is a human-reviewed written report. Automated observations are evidence to review, not a substitute for context or approval."},
{title:"Payment",body:"Checkout is hosted by Stripe. The listed $149 fee is a one-time charge for one authorized domain; it is not a subscription."},
{title:"Your control",body:"You choose whether to order. Questions can be sent before purchase, and any implementation work requires a separate written scope and authorization."},
];
export default function TrustPage(){return <main className="min-h-screen bg-[#07090d] px-5 py-12 text-zinc-100 sm:px-8"><div className="mx-auto max-w-4xl"><Link href="/" className="text-sm text-teal-200 hover:text-white">← Zero Gravity home</Link><p className="mt-10 text-xs tracking-[0.2em] text-teal-200">TRANSPARENCY FIRST</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Trust is earned with evidence.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">Here is exactly what Zero Gravity does, what it does not do, and what you can expect before you spend anything.</p><div className="mt-10 grid gap-4 sm:grid-cols-2">{items.map(item=><section key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><h2 className="text-lg font-semibold">{item.title}</h2><p className="mt-3 text-sm leading-6 text-zinc-400">{item.body}</p></section>)}</div><section className="mt-8 rounded-2xl border border-teal-200/20 bg-teal-200/[0.04] p-6"><h2 className="text-xl font-semibold">See the evidence before you buy.</h2><p className="mt-2 text-sm leading-6 text-zinc-400">Run the free public DNS snapshot first. It requires only a domain name and does not ask for your email, account password or payment details.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/#free-check" className="inline-flex rounded-xl bg-teal-200 px-5 py-3 text-sm font-semibold text-zinc-950">Run free domain check</Link><Link href="/sample-report" className="inline-flex rounded-xl border border-white/15 px-5 py-3 text-sm">View sample report</Link></div></section><p className="mt-8 text-xs leading-6 text-zinc-500">Zero Gravity is an independent service from Wah-Lah, founded and operated by Justin Smith. No certification, affiliation, customer count, review score or performance result is implied by this page.</p></div></main>}
