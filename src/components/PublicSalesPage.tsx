"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";

type FormState = { name: string; email: string; domain: string; message: string; website: string };
const empty: FormState = { name: "", email: "", domain: "", message: "", website: "" };

export function PublicSalesPage() {
  const [order, setOrder] = useState<FormState>(empty);
  const [inquiry, setInquiry] = useState<FormState>(empty);
  const [busyOrder, setBusyOrder] = useState(false);
  const [busyInquiry, setBusyInquiry] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [orderError, setOrderError] = useState(false);
  const [inquiryError, setInquiryError] = useState(false);
  const update = (setter: typeof setOrder, key: keyof FormState, value: string) => setter((v) => ({ ...v, [key]: value }));
  async function submitOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusyOrder(true); setOrderMessage(""); setOrderError(false);
    try {
      const r = await fetch("/api/public/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(order) });
      const d = await r.json();
      if (!r.ok || !d.success || !d.checkoutUrl) throw new Error(d.error || "Checkout could not be started. Please use the inquiry form.");
      window.location.assign(d.checkoutUrl);
    } catch (e) { setOrderError(true); setOrderMessage(e instanceof Error ? e.message : "Checkout is temporarily unavailable."); }
    finally { setBusyOrder(false); }
  }
  async function submitInquiry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusyInquiry(true); setInquiryMessage(""); setInquiryError(false);
    try {
      const r = await fetch("/api/public/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(inquiry) });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || "Your inquiry could not be saved.");
      setInquiry(empty); setInquiryMessage("Inquiry saved. The details will be used to respond to this request.");
    } catch (e) { setInquiryError(true); setInquiryMessage(e instanceof Error ? e.message : "Unable to submit right now."); }
    finally { setBusyInquiry(false); }
  }
  const input = "mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-teal-300/70";
  const label = "block text-sm font-medium text-zinc-300";
  const notice = (bad: boolean) => "rounded-xl border px-3 py-2 text-sm " + (bad ? "border-rose-400/20 text-rose-200" : "border-teal-300/20 text-teal-100");
  return <main className="min-h-screen overflow-hidden bg-[#07090d] text-zinc-100">
    <div className="pointer-events-none fixed inset-0 opacity-60" aria-hidden="true"><div className="absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl"/><div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl"/></div>
    <div className="relative">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-8">
        <Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-200/30 bg-teal-300/10 text-teal-200"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="8.5"/><ellipse cx="12" cy="12" rx="4" ry="8.5" transform="rotate(48 12 12)"/><path d="M4 12h16"/></svg></span><span><span className="block text-sm font-semibold tracking-[0.22em]">ZERO GRAVITY</span><span className="block text-[10px] tracking-[0.18em] text-zinc-500">TECHNICAL CLARITY</span></span></Link>
        <nav className="flex items-center gap-4"><a href="#scope" className="hidden text-sm text-zinc-400 hover:text-white sm:inline">What&apos;s included</a><a href="/dashboard" className="rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-300 hover:border-teal-200/40">Operator sign-in</a></nav>
      </header>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-10 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:pb-24 md:pt-16">
        <div><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200/20 bg-teal-200/[0.06] px-3 py-1.5 text-xs text-teal-100"><span className="h-1.5 w-1.5 rounded-full bg-teal-300"/>A focused review of public DNS configuration</div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">Know what your email domain is telling the world.</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">Get a human-reviewed snapshot of your domain&apos;s public email-authentication records and a clear, prioritized checklist of what to investigate next.</p>
          <div className="mt-8 flex flex-wrap items-center gap-4"><a href="#review" className="rounded-full bg-teal-200 px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-teal-100">Request a domain review ↗</a><span className="text-sm text-zinc-500">One domain · one-time fee · no subscription</span></div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3 border-t border-white/10 pt-5">{[["SPF","Sender policy"],["DKIM","Signing records"],["DMARC","Policy alignment"]].map(([a,b])=><div key={a}><p className="text-lg font-semibold">{a}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{b}</p></div>)}</div>
        </div>
        <div className="relative"><div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-teal-300/10 via-transparent to-violet-400/10 blur-2xl"/><div className="relative rounded-[1.75rem] border border-white/10 bg-[#10151c]/90 p-6 shadow-2xl shadow-black/40 sm:p-8">
          <p className="text-xs tracking-[0.2em] text-teal-200">FIXED-SCOPE SERVICE</p><h2 className="mt-3 text-2xl font-semibold">Domain Signals Review</h2><p className="mt-2 text-sm text-zinc-400">An actionable report for one authorized domain.</p>
          <div className="mt-7 flex items-end gap-2"><span className="text-5xl font-semibold tracking-tight">$149</span><span className="pb-1 text-sm text-zinc-500">USD · one-time</span></div><div className="my-6 h-px bg-white/10"/>
          <ul className="space-y-4 text-sm text-zinc-300">{["Public SPF, DKIM, DMARC and MX observations","Prioritized written findings and next steps","Plain-language handoff","No DNS changes made"].map((s)=><li key={s} className="flex gap-3"><span className="text-teal-200">✓</span>{s}</li>)}</ul>
          <a href="#review" className="mt-8 flex w-full justify-center rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-zinc-950 hover:bg-teal-100">Continue to secure checkout</a><p className="mt-3 text-center text-xs leading-5 text-zinc-500">Stripe-hosted checkout. No charge until you confirm payment.</p>
        </div></div>
      </section>
      <section id="scope" className="border-y border-white/10 bg-white/[0.025]"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-3 md:px-8 md:py-16">
        <div><p className="text-xs tracking-[0.18em] text-teal-200">01 / OBSERVE</p><h3 className="mt-3 text-lg font-semibold">Public records only</h3><p className="mt-2 text-sm leading-6 text-zinc-400">We report visible DNS configuration and explain what those observations cannot establish.</p></div>
        <div><p className="text-xs tracking-[0.18em] text-teal-200">02 / EXPLAIN</p><h3 className="mt-3 text-lg font-semibold">Practical priorities</h3><p className="mt-2 text-sm leading-6 text-zinc-400">Get a written checklist separating observed facts, potential concerns and items requiring confirmation.</p></div>
        <div><p className="text-xs tracking-[0.18em] text-teal-200">03 / DECIDE</p><h3 className="mt-3 text-lg font-semibold">You stay in control</h3><p className="mt-2 text-sm leading-6 text-zinc-400">No DNS changes are made. Implementation work requires separate scope and authorization.</p></div>
      </div></section>
      <section id="review" className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-2 md:px-8 md:py-24">
        <div><p className="text-xs tracking-[0.2em] text-teal-200">START HERE</p><h2 className="mt-4 text-3xl font-semibold tracking-tight">Order your review</h2><p className="mt-4 max-w-lg text-sm leading-6 text-zinc-400">Enter a domain you own or are authorized to assess. Your details pre-fill the secure checkout and are saved so your order can be followed through.</p>
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5"><h3 className="font-medium">Clear limits</h3><p className="mt-2 text-sm leading-6 text-zinc-400">A DNS snapshot cannot prove inbox placement, lost sales, compromise or regulatory compliance. No guaranteed deliverability, DNS changes or remediation are included.</p></div>
        </div>
        <form onSubmit={submitOrder} className="rounded-2xl border border-white/10 bg-[#10151c]/90 p-5 sm:p-7"><h3 className="text-lg font-semibold">Secure checkout · $149</h3><p className="mt-1 text-sm text-zinc-500">One authorized domain, one-time payment.</p>
          <label className={label+" mt-5"}>Your name<input className={input} autoComplete="name" required maxLength={120} value={order.name} onChange={(e)=>update(setOrder,"name",e.target.value)} placeholder="Name"/></label>
          <label className={label+" mt-4"}>Email for the order<input className={input} type="email" autoComplete="email" required maxLength={254} value={order.email} onChange={(e)=>update(setOrder,"email",e.target.value)} placeholder="you@company.com"/></label>
          <label className={label+" mt-4"}>Domain to review<input className={input} required maxLength={253} value={order.domain} onChange={(e)=>update(setOrder,"domain",e.target.value)} placeholder="example.com"/></label>
          <label className="hidden" aria-hidden="true">Leave empty<input tabIndex={-1} autoComplete="off" value={order.website} onChange={(e)=>update(setOrder,"website",e.target.value)}/></label>
          {orderMessage&&<p role="alert" className={notice(orderError)+" mt-4"}>{orderMessage}</p>}
          <button type="submit" disabled={busyOrder} className="mt-6 flex w-full justify-center rounded-xl bg-teal-200 px-5 py-3.5 text-sm font-semibold text-zinc-950 hover:bg-teal-100 disabled:opacity-60">{busyOrder?"Preparing checkout…":"Pay $149 securely"}</button><p className="mt-3 text-xs leading-5 text-zinc-500">Stripe handles payment. A checkout link is not a receipt; revenue is recorded only after a verified payment event.</p>
        </form>
      </section>
      <section id="contact" className="border-t border-white/10 bg-white/[0.025]"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-2 md:px-8 md:py-16">
        <div><p className="text-xs tracking-[0.2em] text-violet-200">QUESTIONS FIRST?</p><h2 className="mt-4 text-2xl font-semibold">Ask about fit or scope.</h2><p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">Use this form for questions or custom scope. Your request is saved for follow-up; it does not enroll you in bulk marketing messages.</p></div>
        <form onSubmit={submitInquiry} className="space-y-4">
          <label className={label}>Name<input className={input} autoComplete="name" required maxLength={120} value={inquiry.name} onChange={(e)=>update(setInquiry,"name",e.target.value)}/></label>
          <label className={label}>Email<input className={input} type="email" autoComplete="email" required maxLength={254} value={inquiry.email} onChange={(e)=>update(setInquiry,"email",e.target.value)}/></label>
          <label className={label}>Domain or company<input className={input} required maxLength={253} value={inquiry.domain} onChange={(e)=>update(setInquiry,"domain",e.target.value)} placeholder="example.com"/></label>
          <label className={label}>What would you like to know?<textarea className={input+" min-h-28 resize-y"} required maxLength={2000} value={inquiry.message} onChange={(e)=>update(setInquiry,"message",e.target.value)} placeholder="Tell us what you would like reviewed."/></label>
          <label className="hidden" aria-hidden="true">Leave empty<input tabIndex={-1} autoComplete="off" value={inquiry.website} onChange={(e)=>update(setInquiry,"website",e.target.value)}/></label>
          {inquiryMessage&&<p role="status" className={notice(inquiryError)}>{inquiryMessage}</p>}
          <button type="submit" disabled={busyInquiry} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-medium hover:border-teal-200/50 disabled:opacity-60">{busyInquiry?"Saving inquiry…":"Send inquiry"}</button>
        </form>
      </div></section>
      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between md:px-8"><span>© {new Date().getFullYear()} Zero Gravity · Technical review services</span><span>One-time service · No guaranteed outcomes · Customer-approved payments only</span></footer>
    </div>
  </main>;
}
