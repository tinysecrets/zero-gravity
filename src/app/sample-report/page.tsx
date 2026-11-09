import type { Metadata } from "next";
import Link from "next/link";

const description = "See a real, limited public DNS snapshot for example.com and understand the evidence, findings and limitations in a Zero Gravity review.";

export const metadata: Metadata = {
  title: "Sample Domain Signals Report",
  description,
  alternates: { canonical: "/sample-report" },
  openGraph: {
    type: "website", siteName: "Zero Gravity",
    title: "Sample Domain Signals Report | Zero Gravity",
    description, url: "/sample-report", images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sample Domain Signals Report | Zero Gravity",
    description, images: ["/opengraph-image"],
  },
};

const findings = [
  { severity: "Passed", title: "DMARC policy: reject", detail: "A public DMARC enforcement policy was found." },
  { severity: "Passed", title: "SPF record present", detail: "Published SPF value observed: v=spf1 -all" },
];

export default function SampleReportPage() {
  return <main className="min-h-screen bg-[#07090d] px-5 py-12 text-zinc-100 sm:px-8">
    <div className="mx-auto max-w-4xl">
      <Link href="/" className="text-sm text-teal-200 hover:text-white">← Zero Gravity home</Link>
      <p className="mt-10 text-xs tracking-[0.2em] text-teal-200">TRANSPARENT EXAMPLE</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">See what the evidence looks like.</h1>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400">This is a real, limited public DNS snapshot of the reserved example.com domain, captured during launch validation. It is not a customer report, and public DNS records can change.</p>

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs text-zinc-500">ILLUSTRATIVE PUBLIC DNS SNAPSHOT</p><h2 className="mt-1 text-2xl font-semibold">example.com</h2></div>
          <span className="rounded-full border border-teal-200/20 px-3 py-1 text-xs text-teal-100">Read-only observation</span>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[["SPF","Observed","v=spf1 -all"],["DMARC","Observed","Policy: reject"],["MX","Observed","Mail exchange present"]].map(([name,status,value])=><div key={name} className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-zinc-500">{name}</p><p className="mt-2 text-sm font-semibold text-teal-200">{status}</p><p className="mt-1 break-words text-xs text-zinc-400">{value}</p></div>)}
        </div>
        <div className="mt-7"><h3 className="text-lg font-semibold">Observed findings</h3><div className="mt-3 space-y-3">{findings.map((finding)=><div key={finding.title} className="rounded-xl border border-white/10 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{finding.title}</p><span className="rounded-full border border-teal-200/20 px-2 py-1 text-[11px] text-teal-200">{finding.severity}</span></div><p className="mt-2 text-sm leading-6 text-zinc-400">{finding.detail}</p></div>)}</div></div>
        <div className="mt-7 border-t border-white/10 pt-5"><h3 className="text-lg font-semibold">What this snapshot does not establish</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-400"><li>It does not test inbox placement or message delivery.</li><li>It does not discover every DKIM selector or inspect real sent messages.</li><li>It does not confirm every authorized sender or prove regulatory compliance.</li><li>It does not calculate lost revenue or make DNS changes.</li></ul></div>
      </section>

      <section className="mt-8 rounded-2xl border border-teal-200/20 bg-teal-200/[0.04] p-6">
        <p className="text-xs tracking-[0.18em] text-teal-200">THE PAID REVIEW</p>
        <h2 className="mt-2 text-2xl font-semibold">A person reviews the evidence with you in mind.</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">The one-time Domain Signals Review adds human interpretation, prioritized findings, practical next steps and a written report for one domain you own or are authorized to assess. It does not make changes to your DNS.</p>
        <p className="mt-4 text-sm font-semibold text-white">$149 · one-time · no subscription</p>
        <div className="mt-5 flex flex-wrap gap-3"><Link href="/#free-check" className="rounded-xl bg-teal-200 px-5 py-3 text-sm font-semibold text-zinc-950">Run your free check</Link><Link href="/trust" className="rounded-xl border border-white/15 px-5 py-3 text-sm">Read our trust commitments</Link></div>
      </section>
      <p className="mt-8 text-xs leading-6 text-zinc-500">Sample source: public DNS lookup for example.com during release validation. This sample is illustrative and should not be treated as a current security or deliverability certification.</p>
    </div>
  </main>;
}
