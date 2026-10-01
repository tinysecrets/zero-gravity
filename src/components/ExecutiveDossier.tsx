"use client";

import React from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FinancialMetrics } from "@/types";

interface ExecutiveDossierProps {
  onNavigateTab: (tab: string) => void;
  onOpenScanner: () => void;
  onOpenAdvisor: () => void;
  metrics: FinancialMetrics | null;
}

function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Unavailable";
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ExecutiveDossier({
  onNavigateTab,
  onOpenScanner,
  onOpenAdvisor,
  metrics,
}: ExecutiveDossierProps) {
  const verifiedReceipts = metrics?.totalRealizedRevenue;
  const recordedOpportunityValue = metrics?.grossVolume;
  const opportunityCount = metrics?.activeDealsCount;

  const steps = [
    {
      label: "Technical check",
      detail: "A public DNS observation is not proof of inbox placement, lost revenue, or a security incident.",
    },
    {
      label: "Opportunity record",
      detail: "Stored values may be estimates. A record does not prove a prospect, agreement, or active customer.",
    },
    {
      label: "Payment request",
      detail: "A Stripe Checkout link is an optional request. The customer decides whether to pay.",
    },
    {
      label: "Receipt reporting",
      detail: "A signed live payment event can record a gross receipt; it does not show a Stripe balance or bank payout.",
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      <section className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-black p-6 shadow-2xl md:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-xs font-semibold text-cyan-300">
            <Activity className="h-3.5 w-3.5" />
            CUSTOMER-PAYMENT WORKSPACE · RESULTS NOT IMPLIED
          </div>
          <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-white md:text-4xl">
            A clear record of opportunities, work, and customer receipts
          </h2>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-zinc-300 md:text-base">
            Zero Gravity provides tools for recording opportunities, reviewing public DNS signals, and creating optional customer-initiated Stripe Checkout requests. It does not promise income, client outcomes, conversion rates, payment timing, or zero operating costs. This page also cannot confirm that a production Vercel Cron job or outreach campaign is running.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Verified customer receipts · gross"
              value={formatUsd(verifiedReceipts)}
              caption="App-recorded from verified settlement records; not net proceeds or a payout."
              tone="emerald"
            />
            <MetricCard
              label="Recorded opportunity value"
              value={formatUsd(recordedOpportunityValue)}
              caption="Stored deal values may be estimates; they are not collected revenue."
              tone="cyan"
            />
            <MetricCard
              label="Opportunity records"
              value={opportunityCount === undefined ? "Unavailable" : opportunityCount.toLocaleString()}
              caption="A record count does not establish a prospect or customer relationship."
              tone="purple"
            />
            <MetricCard
              label="Starting capital"
              value="Not tracked"
              caption="The dashboard does not independently verify an initial-capital figure."
              tone="amber"
            />
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-amber-800/70 bg-amber-950/20 p-4 text-xs leading-relaxed text-amber-100/90">
        <strong className="text-amber-200">How to read the money figures:</strong> customer receipts are reported gross, before processor fees and any separate refund or dispute reconciliation. Stripe balance availability and bank payouts are not shown here, and this app does not initiate bank or third-party transfers.
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase text-emerald-400">
              <Search className="h-4 w-4" />
              What the workspace can record
            </div>
            <h3 className="mb-3 text-lg font-bold text-white">Signals and estimates need context</h3>
            <ul className="space-y-3 text-xs leading-relaxed text-zinc-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span><strong>Public DNS checks:</strong> observations about published records only; they do not prove email delivery problems or a revenue loss.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span><strong>Opportunity entries:</strong> operator-entered details and estimates; verify identity, source, permission, and value before relying on them.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span><strong>Outreach drafts:</strong> review every factual statement, recipient, and legal basis before sending. A draft is not evidence of contact or interest.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span><strong>Checkout requests:</strong> customers choose whether to complete payment; creating a link does not create a charge or receipt.</span>
              </li>
            </ul>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-4">
            <span className="text-xs text-zinc-400">Check deployment logs for runtime proof</span>
            <button
              onClick={() => onNavigateTab("autonomous")}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
            >
              Review scheduler controls <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase text-cyan-400">
              <BarChart3 className="h-4 w-4" />
              How to interpret activity
            </div>
            <h3 className="mb-3 text-lg font-bold text-white">A workflow is not a result</h3>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={step.label} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-black/30 p-3 text-xs">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-cyan-800 bg-cyan-950 font-mono font-bold text-cyan-300">
                    {index + 1}
                  </span>
                  <div>
                    <div className="font-semibold text-white">{step.label}</div>
                    <p className="mt-0.5 leading-relaxed text-zinc-400">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-4">
            <span className="text-xs text-zinc-400">Only verified events count as receipts</span>
            <button
              onClick={() => onNavigateTab("ledger")}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300"
            >
              Review receipt ledger <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase text-purple-400">
            <Layers className="h-4 w-4" />
            Customer examples and outcomes
          </div>
          <h3 className="mb-3 text-lg font-bold text-white">No verified case studies are presented here</h3>
          <p className="text-xs leading-relaxed text-zinc-300">
            Previously displayed named-business scenarios were illustrative development examples, not verified customers, engagements, lead counts, contracts, invoices, or results. No scenario or projected amount should be read as proof of a business relationship or expected return. The current receipt figure above is the app-recorded gross total from verified payment records.
          </p>
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-400">
            If you use a planning model, replace its assumptions with sourced inputs and keep the assumptions separate from observed results.
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase text-amber-400">
            <ShieldCheck className="h-4 w-4" />
            Before enabling customer-facing work
          </div>
          <h3 className="mb-3 text-lg font-bold text-white">Use evidence, authorization, and clear terms</h3>
          <ul className="space-y-2.5 text-xs leading-relaxed text-zinc-300">
            <li>Confirm the target, data source, and permission to use any contact or customer information.</li>
            <li>Describe only observed facts; do not infer lost sales, inbox placement, customer intent, or guaranteed outcomes.</li>
            <li>Agree to scope, price, responsibilities, and timing in writing before performing paid work.</li>
            <li>Let the customer decide whether to complete Stripe Checkout; a request is not a receipt.</li>
            <li>Reconcile processor fees, refunds, disputes, taxes, and any bank payout separately.</li>
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-8">
        <h3 className="mb-2 text-xl font-bold text-white">What each status does—and does not—prove</h3>
        <p className="mb-5 text-xs text-zinc-400">
          The dashboard reflects stored records. Production scheduler activity must be verified separately in deployment logs and protected operational status.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <StatusCard title="Dashboard loaded" detail="The web page responded; this alone does not prove a scheduled cycle ran." />
          <StatusCard title="Opportunity or audit saved" detail="A stored record or public DNS observation; not a customer, contract, or identified revenue loss." />
          <StatusCard title="Checkout link created" detail="A payment request. No charge occurs unless the customer chooses to pay." />
          <StatusCard title="Verified live receipt" detail="A provider-confirmed gross customer payment; not net proceeds, an available balance, or a bank payout." />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickLink
          icon={<Activity className="h-5 w-5" />}
          tone="emerald"
          badge="TECHNICAL CHECK"
          title="Review public DNS signals"
          description="Inspect published email-authentication records. Results do not establish inbox delivery or financial impact."
          onClick={onOpenScanner}
        />
        <QuickLink
          icon={<Layers className="h-5 w-5" />}
          tone="cyan"
          badge="RECORDED DATA"
          title="Review opportunities"
          description="See stored records and estimates; confirm all customer, contract, and value details independently."
          onClick={() => onNavigateTab("pipeline")}
        />
        <QuickLink
          icon={<Sparkles className="h-5 w-5" />}
          tone="purple"
          badge="DRAFT ONLY"
          title="Build a research worksheet"
          description="Create a starting point for research. The draft does not browse, verify a market, or predict revenue."
          onClick={onOpenAdvisor}
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption: string;
  tone: "emerald" | "cyan" | "purple" | "amber";
}) {
  const toneClasses = {
    emerald: "text-emerald-400",
    cyan: "text-cyan-400",
    purple: "text-purple-400",
    amber: "text-amber-300",
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
      <span className="block font-mono text-xs text-zinc-400">{label}</span>
      <span className={`mt-1 block font-mono text-xl font-black ${toneClasses[tone]}`}>{value}</span>
      <span className="mt-1 block text-[11px] leading-relaxed text-zinc-500">{caption}</span>
    </div>
  );
}

function StatusCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">{detail}</p>
    </div>
  );
}

function QuickLink({
  icon,
  tone,
  badge,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  tone: "emerald" | "cyan" | "purple";
  badge: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  const toneClasses = {
    emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    cyan: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
    purple: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  };
  const theme = toneClasses[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-left transition hover:border-zinc-700 hover:bg-zinc-900/80"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className={`rounded-lg border p-2 ${theme}`}>{icon}</span>
        <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${theme}`}>{badge}</span>
      </div>
      <h4 className="text-sm font-bold text-white transition group-hover:text-zinc-100">{title}</h4>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">{description}</p>
    </button>
  );
}
