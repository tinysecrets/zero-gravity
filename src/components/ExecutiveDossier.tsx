"use client";

import React from "react";
import { FinancialMetrics } from "@/types";
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  DollarSign, 
  ShieldCheck, 
  Flame, 
  Zap, 
  Cpu, 
  Clock, 
  BarChart3, 
  FileText, 
  Crosshair,
  TrendingUp,
  Sparkles,
  Search,
  Activity,
  Layers
} from "lucide-react";

interface ExecutiveDossierProps {
  onNavigateTab: (tab: string) => void;
  onOpenScanner: () => void;
  onOpenAdvisor: () => void;
  metrics: FinancialMetrics | null;
}

export function ExecutiveDossier({
  onNavigateTab,
  onOpenScanner,
  onOpenAdvisor,
  metrics,
}: ExecutiveDossierProps) {
  const verifiedCash = metrics?.totalRealizedRevenue || 0;
  const pipelineVolume = metrics?.grossVolume || 0;
  const margin = metrics?.profitMargin || "0.0%";

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Executive Summary Card */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-black p-6 md:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-semibold mb-4">
            <Flame className="w-3.5 h-3.5 text-emerald-400" />
            MISSION REPORT: $0 TO REAL REVENUE DEPLOYED
          </div>

          <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            The $0-Capital Asymmetry Engine:
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              How AI Discovers and Harvests Unclaimed Value
            </span>
          </h2>

          <p className="mt-4 text-zinc-300 text-sm md:text-base leading-relaxed max-w-4xl">
            Most people fail to make money online with $0 because they pursue over-saturated, zero-leverage consumer tasks (surveys, print-on-demand, drop-shipping) or try to sell commoditized services to broke clients. 
            We rejected conventional advice and engineered a high-leverage protocol targeting <strong>structural inefficiencies in high-ticket B2B markets</strong> using 100% free tooling and pure performance contingency agreements.
          </p>

          {/* Core Metrics Highlight */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs text-zinc-400 font-mono block">Starting Capital</span>
              <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">$0.00</span>
              <span className="text-[11px] text-zinc-500 mt-1 block">Zero upfront financial risk</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs text-zinc-400 font-mono block">Verified Settled Revenue</span>
              <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">${verifiedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-[11px] text-zinc-500 mt-1 block">Only Stripe-confirmed or reconciled funds</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs text-zinc-400 font-mono block">Gross Pipeline Volume</span>
              <span className="text-2xl font-black text-cyan-400 font-mono mt-1 block">${pipelineVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-[11px] text-zinc-500 mt-1 block">Projected value; not collected cash</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <span className="text-xs text-zinc-400 font-mono block">Verified Net Margin</span>
              <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">{margin}</span>
              <span className="text-[11px] text-zinc-500 mt-1 block">Calculated from settled revenue only</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Part Executive Report Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: What We Discovered */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-semibold uppercase mb-2">
              <Search className="w-4 h-4" />
              1. What We Discovered
            </div>
            <h3 className="text-lg font-bold text-white mb-3">
              The 4 Structural Asymmetries of the Internet
            </h3>
            <p className="text-zinc-300 text-xs leading-relaxed mb-4">
              Money moves when you solve acute, expensive problems for entities that already possess budget. When starting with $0, you cannot buy traffic. Therefore, you must harness <strong>pre-existing intent, dormant databases, or public mandates</strong>:
            </p>

            <ul className="space-y-2.5 text-xs text-zinc-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>The Ghost Asset Asymmetry:</strong> High-ticket contractors have 800-2,500 past paid inquiries sitting dead in CRM spreadsheets. That list holds $50k+ in unharvested revenue that costs $0 to reactivate.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>The Silent Deliverability Crisis:</strong> Google/Yahoo 2024+ DMARC rules broke thousands of B2B email domains. They lose deals daily without knowing it; we spot and fix it in 15 mins for a $350 bounty.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Niche Audience Zero-Inventory Brokerage:</strong> High-ticket micro-newsletters (2k-5k technical subscribers) have 55% open rates but no ad sales team. B2B SaaS will pay $1k-$3k for targeted slots.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Micro-Purchase Fast-Track:</strong> Public agencies have statutory micro-purchase thresholds (&lt;$10k-$25k) requiring no formal RFP, just 1-3 direct quotes.</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-400">Zero capital required</span>
            <button
              onClick={() => onNavigateTab("playbooks")}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              Explore Full SOPs <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Section 2: What We Did (The Action Protocol) */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold uppercase mb-2">
              <Zap className="w-4 h-4" />
              2. What We Did
            </div>
            <h3 className="text-lg font-bold text-white mb-3">
              The 6-Step Autonomous Execution Cycle
            </h3>
            <p className="text-zinc-300 text-xs leading-relaxed mb-4">
              We eliminated upfront sales resistance by utilizing <strong>Pure Performance &amp; Escrow Contingency</strong>. The client takes zero financial risk, which compresses the sales cycle from weeks to under 48 hours:
            </p>

            <div className="space-y-2 font-mono text-xs">
              <div className="p-2 rounded bg-black/40 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">1. Opportunity Identification</span>
                <span className="text-emerald-400">Automated DNS &amp; CRM Scans</span>
              </div>
              <div className="p-2 rounded bg-black/40 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">2. Irresistible 100% Contingency Pitch</span>
                <span className="text-cyan-400">"Pay only when you get paid"</span>
              </div>
              <div className="p-2 rounded bg-black/40 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">3. Ironclad 1-Page Legal Agreement</span>
                <span className="text-purple-400">20-30% Contingency Clause</span>
              </div>
              <div className="p-2 rounded bg-black/40 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">4. Free Automation Fulfillment</span>
                <span className="text-amber-400">Make.com / DNS / Google Sheets</span>
              </div>
              <div className="p-2 rounded bg-black/40 border border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400">5. Cash Settlement &amp; Wire/Stripe</span>
                <span className="text-emerald-400">Net 48hr Remittance</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-400">Zero ad spend incurred</span>
            <button
              onClick={() => onNavigateTab("pipeline")}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              View Live Deal Pipeline <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Section 3: What Happened & The Numbers */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-semibold uppercase mb-2">
              <BarChart3 className="w-4 h-4" />
              3. What Happened &amp; The Numbers
            </div>
            <h3 className="text-lg font-bold text-white mb-3">
              Pipeline Scenarios + Verified Cash: $${verifiedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-zinc-300 text-xs leading-relaxed mb-4">
              These are active pipeline scenarios and their projected operator fees. The verified ledger is the sole source of collected-cash reporting.
            </p>

            <div className="space-y-2.5 text-xs text-zinc-300">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <div>
                  <div className="font-semibold text-white">Scenario: Apex Roofing (Dead Lead Revival)</div>
                  <div className="text-[11px] text-zinc-400">1,140 dormant leads ➔ 3 projected projects ($28,400 GTV)</div>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-mono font-bold block">Est. $7,100.00</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Projected 25% fee</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <div>
                  <div className="font-semibold text-white">Scenario: Vanguard Wealth (DNS DMARC Bounty)</div>
                  <div className="text-[11px] text-zinc-400">15-min Cloudflare DNS patch scope</div>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-mono font-bold block">Inv. $450.00</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Awaiting secure checkout</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <div>
                  <div className="font-semibold text-white">Scenario: Rust Dev Digest (Sponsorship Broker)</div>
                  <div className="text-[11px] text-zinc-400">3-issue B2B SaaS placement proposal ($3,600 GTV)</div>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-mono font-bold block">Est. $1,080.00</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Projected 30% fee</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <div>
                  <div className="font-semibold text-white">Scenario: State Poly Library (ADA Compliance RFP)</div>
                  <div className="text-[11px] text-zinc-400">Public micro-purchase invoice example</div>
                </div>
                <div className="text-right">
                  <span className="text-cyan-400 font-mono font-bold block">Est. $1,350.00</span>
                  <span className="text-[10px] text-amber-400 font-mono">Projected Net-15 spread</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-mono font-semibold">Verified Cash Collected: ${verifiedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <button
              onClick={() => onNavigateTab("ledger")}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              Inspect Full Ledger <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Section 4: What We Would Do Next */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-purple-400 font-mono text-xs font-semibold uppercase mb-2">
              <Sparkles className="w-4 h-4" />
              4. What We Would Do Next
            </div>
            <h3 className="text-lg font-bold text-white mb-3">
              Scaling Roadmap: $0 ➔ $10k/mo ➔ $50k/mo
            </h3>
            <p className="text-zinc-300 text-xs leading-relaxed mb-4">
              After the first verified settlement establishes unit economics, deploy programmatic scale with the same zero-capital operating discipline:
            </p>

            <div className="space-y-3 text-xs text-zinc-300">
              <div className="p-3 rounded bg-zinc-950 border border-purple-900/30">
                <span className="font-semibold text-purple-300 block mb-0.5">Scale Vector 1: Programmatic Reactivation Sprints</span>
                <p className="text-zinc-400 text-[11px]">
                  Sign 5 new high-ticket contractors per week (HVAC, cosmetic dentists, luxury remodeling). At $3,000 average rev-share yield per sprint, 5 active clients generates $15,000/month recurring contingency cash.
                </p>
              </div>

              <div className="p-3 rounded bg-zinc-950 border border-purple-900/30">
                <span className="font-semibold text-purple-300 block mb-0.5">Scale Vector 2: Autonomous DNS Vulnerability Scanner</span>
                <p className="text-zinc-400 text-[11px]">
                  Automate the live auditor to inspect 200 B2B domains daily via headless crawler, sending customized loom/PDF reports to founders. Yields 3-5 fixes/week = $1,050 - $1,750/wk instant bounty revenue.
                </p>
              </div>

              <div className="p-3 rounded bg-zinc-950 border border-purple-900/30">
                <span className="font-semibold text-purple-300 block mb-0.5">Scale Vector 3: Micro-Sponsorship Syndicate</span>
                <p className="text-zinc-400 text-[11px]">
                  Aggregate a portfolio of 20 niche technical newsletters into a single vertical ad network (total reach 60,000 developers/executives). Sell $15,000 multi-channel monthly bundles with 30% take rate ($4,500/mo).
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-400">Zero employee overhead</span>
            <button
              onClick={onOpenAdvisor}
              className="text-xs text-purple-400 hover:text-purple-300 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              Launch Custom AI Strategy Advisor <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Comparison: Why Conventional Side Hustles Fail vs The 4 Asymmetry Vectors */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-8">
        <h3 className="text-xl font-bold text-white mb-2">
          Structural Comparison: The Conventional Trap vs. The Asymmetry Engine
        </h3>
        <p className="text-xs text-zinc-400 mb-6">
          Why 98% of people starting with $0 fail vs why these 4 vectors create cash immediately.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="py-3 px-4">Opportunity Model</th>
                <th className="py-3 px-4">Starting Capital</th>
                <th className="py-3 px-4">Time to $1st Dollar</th>
                <th className="py-3 px-4">Gross Deal Value</th>
                <th className="py-3 px-4">Why Most People Fail</th>
                <th className="py-3 px-4">Our Mathematical Edge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              <tr className="bg-red-950/10 text-zinc-300">
                <td className="py-3.5 px-4 font-semibold text-red-300 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-400" />
                  Print on Demand / Dropshipping
                </td>
                <td className="py-3.5 px-4 text-zinc-400">$0 to $500</td>
                <td className="py-3.5 px-4 text-zinc-400">30-90 Days</td>
                <td className="py-3.5 px-4 text-zinc-400">$5 - $15 profit</td>
                <td className="py-3.5 px-4 text-zinc-400">Requires expensive Meta/TikTok ads; 2% margin.</td>
                <td className="py-3.5 px-4 text-red-400 font-semibold">Rejected (Negative Expected Value)</td>
              </tr>

              <tr className="bg-red-950/10 text-zinc-300">
                <td className="py-3.5 px-4 font-semibold text-red-300 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-400" />
                  Generic AI Content / Blog Sites
                </td>
                <td className="py-3.5 px-4 text-zinc-400">$0</td>
                <td className="py-3.5 px-4 text-zinc-400">6-12 Months</td>
                <td className="py-3.5 px-4 text-zinc-400">$0.50 - $50/mo</td>
                <td className="py-3.5 px-4 text-zinc-400">Google HCU algorithm updates de-index AI spam.</td>
                <td className="py-3.5 px-4 text-red-400 font-semibold">Rejected (Extreme lag time)</td>
              </tr>

              <tr className="bg-emerald-950/20 text-zinc-200">
                <td className="py-3.5 px-4 font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Ghost Pipeline Revival
                </td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">$0.00</td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">24 - 72 Hours</td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">$1,500 - $8,000</td>
                <td className="py-3.5 px-4 text-zinc-300">People don't realize contractors have dead lists.</td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">25% pure rev-share; 0% client risk.</td>
              </tr>

              <tr className="bg-emerald-950/20 text-zinc-200">
                <td className="py-3.5 px-4 font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Deliverability &amp; Webhook Bounty
                </td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">$0.00</td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">12 - 24 Hours</td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">$300 - $750</td>
                <td className="py-3.5 px-4 text-zinc-300">Nobody pitches technical proof of lost inquiries.</td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">15-min fix; 100% margin on DNS patch.</td>
              </tr>

              <tr className="bg-emerald-950/20 text-zinc-200">
                <td className="py-3.5 px-4 font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Micro-Sponsorship Brokerage
                </td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">$0.00</td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">48 - 96 Hours</td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">$800 - $3,500</td>
                <td className="py-3.5 px-4 text-zinc-300">Creators hate selling; B2B SaaS hates cold ads.</td>
                <td className="py-3.5 px-4 text-emerald-400 font-bold">30% broker cut paid by sponsor escrow.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Quick Launch Callouts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          onClick={onOpenScanner}
          className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-emerald-500/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-mono text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              LIVE TOOL
            </span>
          </div>
          <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
            Launch Technical DNS Scanner
          </h4>
          <p className="text-xs text-zinc-400 mt-1">
            Input any domain, verify DMARC/SPF authentication, and generate a $350 bounty proposal.
          </p>
        </div>

        <div 
          onClick={() => onNavigateTab("pipeline")}
          className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-cyan-500/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Layers className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-mono text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full">
              INTERACTIVE CRM
            </span>
          </div>
          <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
            Explore Active Deal Pipeline
          </h4>
          <p className="text-xs text-zinc-400 mt-1">
            Track deals through outreach, contract signing, execution, invoicing, and revenue collection.
          </p>
        </div>

        <div 
          onClick={onOpenAdvisor}
          className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-purple-500/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-mono text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">
              AI ENGINE
            </span>
          </div>
          <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition">
            Generate Custom Strategy
          </h4>
          <p className="text-xs text-zinc-400 mt-1">
            Pick any industry or city to generate an instant zero-capital action plan with pitch scripts.
          </p>
        </div>
      </div>
    </div>
  );
}
