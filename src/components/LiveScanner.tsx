"use client";

import React, { useState } from "react";
import { 
  Search, 
  Activity, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2,
  Zap, 
  DollarSign, 
  Copy, 
  Check, 
  PlusCircle, 
  Sliders, 
  Calculator, 
  ArrowRight,
  Terminal,
  RefreshCw
} from "lucide-react";
import { AuditResult } from "@/lib/audit-engine";
import { Opportunity } from "@/types";

interface LiveScannerProps {
  onAddDealFromAudit: (deal: Partial<Opportunity>) => Promise<void>;
}

export function LiveScanner({ onAddDealFromAudit }: LiveScannerProps) {
  const [activeTool, setActiveTool] = useState<"dns_scanner" | "lead_sim" | "sponsorship_calc">("dns_scanner");

  // Domain Scanner States
  const [domainInput, setDomainInput] = useState("apexroofingatx.com");
  const [nicheInput, setNicheInput] = useState("Residential Roofing");
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [copiedRemediation, setCopiedRemediation] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [dealAdded, setDealAdded] = useState(false);

  // Dead Lead Simulator States
  const [deadLeadsCount, setDeadLeadsCount] = useState<number>(1200);
  const [avgTicketSize, setAvgTicketSize] = useState<number>(7500);
  const [replyRate, setReplyRate] = useState<number>(3.5);
  const [closeRate, setCloseRate] = useState<number>(22);
  const [revSharePercent, setRevSharePercent] = useState<number>(25);

  // Micro-Sponsorship Calculator States
  const [subscribers, setSubscribers] = useState<number>(4500);
  const [openRate, setOpenRate] = useState<number>(54);
  const [cpmRate, setCpmRate] = useState<number>(85);
  const [brokerCommissionRate, setBrokerCommissionRate] = useState<number>(30);

  const handleRunAudit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!domainInput.trim()) return;

    setIsAuditing(true);
    setDealAdded(false);
    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainInput, niche: nicheInput }),
      });
      const data = await res.json();
      if (data.success) {
        setAuditResult(data.audit);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleCreateBountyDeal = async () => {
    if (!auditResult) return;
    try {
      await onAddDealFromAudit({
        title: `${auditResult.domain} - Deliverability & DMARC Bounty`,
        vector: "technical_leak_audit",
        targetCompany: auditResult.domain,
        targetContact: "Owner / Head of Growth",
        targetEmail: `contact@${auditResult.domain}`,
        targetNiche: nicheInput || "B2B Services",
        status: "audited",
        potentialValue: String(auditResult.recommendedFixBounty),
        operatorFeePercent: "100.00",
        grossTransactionValue: String(auditResult.recommendedFixBounty),
        realizedRevenue: "0.00",
        capitalSpent: "0.00",
        outreachMessage: auditResult.readyOutreachCopy,
        contractTerms: `Fixed one-time remediation fee: $${auditResult.recommendedFixBounty}. 100% satisfaction guarantee.`,
        notes: `Automated DNS audit performed. Score: ${auditResult.score}/100. Estimated monthly client leakage: $${auditResult.estimatedMonthlyLeakage}.`,
        auditData: JSON.stringify({
          score: auditResult.score,
          dmarcPresent: auditResult.dmarcPresent,
          dmarcPolicy: auditResult.dmarcPolicy,
          spfPresent: auditResult.spfPresent,
          estimatedMonthlyLeakage: auditResult.estimatedMonthlyLeakage,
        }),
      });
      setDealAdded(true);
    } catch (err) {
      console.error(err);
    }
  };

  const copyText = (text: string, type: "remediation" | "pitch") => {
    navigator.clipboard.writeText(text);
    if (type === "remediation") {
      setCopiedRemediation(true);
      setTimeout(() => setCopiedRemediation(false), 2000);
    } else {
      setCopiedPitch(true);
      setTimeout(() => setCopiedPitch(false), 2000);
    }
  };

  // Lead Sim Math
  const estimatedReplies = Math.round(deadLeadsCount * (replyRate / 100));
  const estimatedClosed = Math.round(estimatedReplies * (closeRate / 100));
  const simGrossRevenue = estimatedClosed * avgTicketSize;
  const simOperatorCash = Math.round(simGrossRevenue * (revSharePercent / 100));

  // Sponsorship Math
  const adPricePerIssue = Math.round((subscribers / 1000) * cpmRate);
  const monthlyPackageValue = adPricePerIssue * 4;
  const sponsorshipBrokerCut = Math.round(monthlyPackageValue * (brokerCommissionRate / 100));
  const creatorPayout = monthlyPackageValue - sponsorshipBrokerCut;

  return (
    <div className="space-y-8 pb-16">
      {/* Tool Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Live Diagnostic Engine &amp; Free Tool Arsenal
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real zero-cost diagnostic instruments for uncovering, auditing, and pricing opportunities.
          </p>
        </div>

        <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs font-mono">
          <button
            onClick={() => setActiveTool("dns_scanner")}
            className={`px-3 py-1.5 rounded-md cursor-pointer transition flex items-center gap-1.5 ${
              activeTool === "dns_scanner"
                ? "bg-zinc-800 text-cyan-300 font-bold border border-cyan-800/40"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            DNS &amp; Deliverability Scanner
          </button>

          <button
            onClick={() => setActiveTool("lead_sim")}
            className={`px-3 py-1.5 rounded-md cursor-pointer transition flex items-center gap-1.5 ${
              activeTool === "lead_sim"
                ? "bg-zinc-800 text-emerald-300 font-bold border border-emerald-800/40"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Dead-Lead Rev-Share Model
          </button>

          <button
            onClick={() => setActiveTool("sponsorship_calc")}
            className={`px-3 py-1.5 rounded-md cursor-pointer transition flex items-center gap-1.5 ${
              activeTool === "sponsorship_calc"
                ? "bg-zinc-800 text-purple-300 font-bold border border-purple-800/40"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Micro-Sponsorship Valuator
          </button>
        </div>
      </div>

      {/* Tool 1: Live DNS Scanner */}
      {activeTool === "dns_scanner" && (
        <div className="space-y-6">
          {/* Search Box */}
          <form onSubmit={handleRunAudit} className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-6">
                <label className="block text-zinc-400 font-mono text-[11px] mb-1">
                  Target Company Domain (e.g. apexroofingatx.com, techfirm.io)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="examplecompany.com"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="block text-zinc-400 font-mono text-[11px] mb-1">
                  Industry / Niche
                </label>
                <input
                  type="text"
                  placeholder="e.g. Roofing, Dental, B2B SaaS"
                  value={nicheInput}
                  onChange={(e) => setNicheInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="md:col-span-3 md:self-end">
                <button
                  type="submit"
                  disabled={isAuditing}
                  className="w-full py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20 disabled:opacity-50"
                >
                  {isAuditing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Scanning Live DNS...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      Run Live Diagnostic
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Suggestions */}
            <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-zinc-400 flex-wrap">
              <span className="text-zinc-500">Quick Test Domains:</span>
              <button
                type="button"
                onClick={() => {
                  setDomainInput("apexroofingatx.com");
                  setNicheInput("Residential Roofing");
                }}
                className="underline hover:text-cyan-300 cursor-pointer"
              >
                apexroofingatx.com
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setDomainInput("vanguardwealth.example.com");
                  setNicheInput("Wealth Management");
                }}
                className="underline hover:text-cyan-300 cursor-pointer"
              >
                vanguardwealth.example.com
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setDomainInput("austindentalcare.com");
                  setNicheInput("Cosmetic Dentistry");
                }}
                className="underline hover:text-cyan-300 cursor-pointer"
              >
                austindentalcare.com
              </button>
            </div>
          </form>

          {/* Audit Results Card */}
          {auditResult ? (
            <div className="space-y-6 animate-fadeIn">
              {/* Score and Overview Banner */}
              <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black font-mono border ${
                    auditResult.score >= 80
                      ? "bg-emerald-950 border-emerald-500 text-emerald-400"
                      : auditResult.score >= 60
                      ? "bg-amber-950 border-amber-500 text-amber-400"
                      : "bg-red-950 border-red-500 text-red-400"
                  }`}>
                    {auditResult.score}
                  </div>
                  <div>
                    <span className="text-zinc-400 text-xs font-mono block">Deliverability Score</span>
                    <span className="text-base font-bold text-white">
                      Grade: {auditResult.grade} ({auditResult.score >= 70 ? "Needs Patch" : "Critical Failure"})
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] font-mono block uppercase">Monthly Revenue Leak</span>
                  <span className="text-lg font-bold text-red-400 font-mono">
                    -${auditResult.estimatedMonthlyLeakage.toLocaleString()}/mo
                  </span>
                  <span className="text-[10px] text-zinc-400">Lost to spam folder filters</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] font-mono block uppercase">Recommended Fix Bounty</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    ${auditResult.recommendedFixBounty}.00
                  </span>
                  <span className="text-[10px] text-zinc-400">15-minute resolution rate</span>
                </div>

                <div>
                  <button
                    onClick={handleCreateBountyDeal}
                    disabled={dealAdded}
                    className={`w-full py-2.5 px-3 rounded-xl font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      dealAdded
                        ? "bg-emerald-900 text-emerald-300 border border-emerald-700"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
                    }`}
                  >
                    {dealAdded ? (
                      <>
                        <Check className="w-4 h-4" /> Added to Live Pipeline!
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" /> Add as $350 Bounty Deal
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Technical Findings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
                    Diagnostic Vulnerability Findings
                  </h3>
                  {auditResult.findings.map((f, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border text-xs ${
                        f.severity === "Critical"
                          ? "bg-red-950/20 border-red-800/40 text-red-200"
                          : f.severity === "Warning"
                          ? "bg-amber-950/20 border-amber-800/40 text-amber-200"
                          : "bg-emerald-950/20 border-emerald-800/40 text-emerald-200"
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono font-bold mb-1">
                        <span className="flex items-center gap-1.5">
                          {f.severity === "Critical" ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          ) : f.severity === "Warning" ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          {f.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold">
                          {f.severity}
                        </span>
                      </div>
                      <p className="text-zinc-300 text-[11px] leading-relaxed mb-2">{f.description}</p>
                      <div className="text-[10px] font-mono opacity-80 border-t border-zinc-800/40 pt-1.5">
                        Impact: {f.impact}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Remediation Spec & Pitch */}
                <div className="space-y-4">
                  {/* Copyable DNS Patch */}
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1">
                        <Terminal className="w-3.5 h-3.5" />
                        Exact DNS Fix Spec (15-Min Implementation)
                      </span>
                      <button
                        onClick={() => copyText(auditResult.remediationSnippet, "remediation")}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-400 transition cursor-pointer flex items-center gap-1"
                      >
                        {copiedRemediation ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedRemediation ? "Copied" : "Copy Spec"}
                      </button>
                    </div>
                    <pre className="p-3 rounded bg-zinc-950 text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-zinc-800">
                      {auditResult.remediationSnippet}
                    </pre>
                  </div>

                  {/* Ready Outreach Pitch */}
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" />
                        Ready-to-Send Outreach Pitch (High Conversion)
                      </span>
                      <button
                        onClick={() => copyText(auditResult.readyOutreachCopy, "pitch")}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-400 transition cursor-pointer flex items-center gap-1"
                      >
                        {copiedPitch ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedPitch ? "Copied" : "Copy Script"}
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={6}
                      value={auditResult.readyOutreachCopy}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-[11px] font-mono text-zinc-300 leading-relaxed resize-none focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl border border-dashed border-zinc-800 text-center space-y-2">
              <ShieldAlert className="w-8 h-8 text-zinc-600 mx-auto" />
              <h4 className="text-sm font-semibold text-zinc-400">No Active Audit Displayed</h4>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Type a domain above to run real DNS lookups and uncover missing DMARC/SPF authentication vulnerabilities that cost businesses thousands per month.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tool 2: Dead Lead Revival Simulator */}
      {activeTool === "lead_sim" && (
        <div className="p-6 md:p-8 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl space-y-8">
          <div>
            <span className="text-xs font-mono text-emerald-400 font-semibold uppercase">
              Mathematical Pipeline Simulator
            </span>
            <h3 className="text-lg md:text-xl font-bold text-white mt-1">
              Ghost Pipeline Revival: Dead-Lead Unit Economics
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
              Model the exact financial yield of executing a 72-hour reactivation sprint on a contractor's inactive CRM inquiries with zero advertising budget.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sliders Column */}
            <div className="lg:col-span-7 space-y-5 bg-zinc-900/60 p-6 rounded-xl border border-zinc-800 font-mono text-xs">
              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Dormant Inactive Leads in Client's CRM</span>
                  <span className="font-bold text-emerald-400">{deadLeadsCount.toLocaleString()} leads</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="5000"
                  step="100"
                  value={deadLeadsCount}
                  onChange={(e) => setDeadLeadsCount(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <span className="text-[10px] text-zinc-500">Typical 12-month inquiry list for local contractor</span>
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Average Service Ticket / Contract Size</span>
                  <span className="font-bold text-cyan-400">${avgTicketSize.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="25000"
                  step="500"
                  value={avgTicketSize}
                  onChange={(e) => setAvgTicketSize(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-[10px] text-zinc-500">e.g. Roofing ($8k), Dental ($5k), HVAC ($9k)</span>
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Reactivation Reply Rate (3-Touch Sequence)</span>
                  <span className="font-bold text-purple-400">{replyRate}% (~{estimatedReplies} warm replies)</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="8.0"
                  step="0.5"
                  value={replyRate}
                  onChange={(e) => setReplyRate(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Sales Conversion Rate from Warm Replies</span>
                  <span className="font-bold text-amber-400">{closeRate}% (~{estimatedClosed} closed jobs)</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="1"
                  value={closeRate}
                  onChange={(e) => setCloseRate(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Your Contingency Rev-Share Fee Rate</span>
                  <span className="font-bold text-emerald-400">{revSharePercent}% Contingency</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="35"
                  step="1"
                  value={revSharePercent}
                  onChange={(e) => setRevSharePercent(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Results Column */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 rounded-2xl bg-gradient-to-b from-emerald-950/40 to-zinc-900 border border-emerald-800/60 shadow-xl space-y-4">
                <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                  Projected Financial Realization
                </span>

                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <span className="text-zinc-400 text-xs font-mono block">Your Net Operator Cash:</span>
                  <span className="text-3xl font-black text-emerald-400 font-mono mt-1 block">
                    ${simOperatorCash.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-zinc-400 mt-1 block">
                    Paid directly via wire / Stripe within 48h of client closing
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono text-zinc-300 pt-2 border-t border-zinc-800">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total Client GTV Generated:</span>
                    <span className="font-bold text-cyan-400">${simGrossRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Client Net Profit Retained (75%):</span>
                    <span className="font-bold text-white">${(simGrossRevenue - simOperatorCash).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Starting Capital Required:</span>
                    <span className="font-bold text-emerald-400">$0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Sprint Execution Time:</span>
                    <span className="font-bold text-purple-400">3 - 4 Hours</span>
                  </div>
                </div>
              </div>

              {/* Pitch Summary */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 space-y-1">
                <span className="font-bold text-white font-mono block">Why the Client Says Yes:</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  "You make ${ (simGrossRevenue - simOperatorCash).toLocaleString() } in brand-new revenue from people you already paid to acquire. If we generate $0, you owe $0."
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tool 3: Micro-Sponsorship Valuator */}
      {activeTool === "sponsorship_calc" && (
        <div className="p-6 md:p-8 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl space-y-8">
          <div>
            <span className="text-xs font-mono text-purple-400 font-semibold uppercase">
              Micro-Media Brokerage Engine
            </span>
            <h3 className="text-lg md:text-xl font-bold text-white mt-1">
              B2B Micro-Sponsorship Valuation &amp; Take-Rate Modeler
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
              Calculate placement rate cards and broker commissions for pairing high-engagement technical newsletters with SaaS sponsors.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sliders */}
            <div className="lg:col-span-7 space-y-5 bg-zinc-900/60 p-6 rounded-xl border border-zinc-800 font-mono text-xs">
              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Newsletter Active Subscribers</span>
                  <span className="font-bold text-purple-400">{subscribers.toLocaleString()} subscribers</span>
                </div>
                <input
                  type="range"
                  min="800"
                  max="25000"
                  step="200"
                  value={subscribers}
                  onChange={(e) => setSubscribers(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Verified Average Open Rate</span>
                  <span className="font-bold text-emerald-400">{openRate}%</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="75"
                  step="1"
                  value={openRate}
                  onChange={(e) => setOpenRate(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Industry Benchmark CPM ($ per 1,000 readers)</span>
                  <span className="font-bold text-cyan-400">${cpmRate} CPM</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="150"
                  step="5"
                  value={cpmRate}
                  onChange={(e) => setCpmRate(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-[10px] text-zinc-500">Tech/Dev ($80-$120 CPM), Healthcare ($100 CPM), General ($40 CPM)</span>
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Your Broker Representation Fee (%)</span>
                  <span className="font-bold text-purple-400">{brokerCommissionRate}% Take Rate</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="40"
                  step="5"
                  value={brokerCommissionRate}
                  onChange={(e) => setBrokerCommissionRate(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Calculations Card */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 rounded-2xl bg-gradient-to-b from-purple-950/40 to-zinc-900 border border-purple-800/60 shadow-xl space-y-4">
                <span className="text-[11px] font-mono text-purple-400 font-bold uppercase tracking-wider block">
                  Package Economics (4-Issue Bundle)
                </span>

                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <span className="text-zinc-400 text-xs font-mono block">Your Monthly Broker Commission:</span>
                  <span className="text-3xl font-black text-purple-400 font-mono mt-1 block">
                    ${sponsorshipBrokerCut.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-zinc-400 mt-1 block">
                    Zero inventory held. Paid upon sponsor invoice clearance.
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono text-zinc-300 pt-2 border-t border-zinc-800">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Single Issue Rate Card:</span>
                    <span className="font-bold text-cyan-400">${adPricePerIssue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total 4-Issue Package Price:</span>
                    <span className="font-bold text-white">${monthlyPackageValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Creator Direct Payout (70%):</span>
                    <span className="font-bold text-emerald-400">${creatorPayout.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
