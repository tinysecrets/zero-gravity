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
  const [domainInput, setDomainInput] = useState("example.com");
  const [nicheInput, setNicheInput] = useState("Example only");
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [copiedRemediation, setCopiedRemediation] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [dealAdded, setDealAdded] = useState(false);

  // Dead Lead Simulator States
  const [deadLeadsCount, setDeadLeadsCount] = useState<number>(0);
  const [avgTicketSize, setAvgTicketSize] = useState<number>(0);
  const [replyRate, setReplyRate] = useState<number>(0);
  const [closeRate, setCloseRate] = useState<number>(0);
  const [revSharePercent, setRevSharePercent] = useState<number>(0);

  // Micro-Sponsorship Calculator States
  const [subscribers, setSubscribers] = useState<number>(0);
  const [openRate, setOpenRate] = useState<number>(0);
  const [cpmRate, setCpmRate] = useState<number>(0);
  const [brokerCommissionRate, setBrokerCommissionRate] = useState<number>(0);

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

  const handleCreateDraftOpportunity = async () => {
    if (!auditResult) return;
    try {
      await onAddDealFromAudit({
        title: `${auditResult.domain} - Public DNS Review (Draft)`,
        vector: "technical_leak_audit",
        targetCompany: "Unverified domain research draft",
        targetContact: "",
        targetEmail: null,
        targetNiche: nicheInput || "B2B Services",
        status: "audited",
        potentialValue: "0.00",
        operatorFeePercent: "0.00",
        grossTransactionValue: "0.00",
        realizedRevenue: "0.00",
        capitalSpent: "0.00",
        outreachMessage: auditResult.readyOutreachCopy,
        contractTerms: "No fee, scope, or customer agreement has been established. Agree to terms in writing before any paid work.",
        notes: `Public DNS observations only. The check does not establish inbox placement, lost revenue, or a customer engagement.`,
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
            Technical Checks &amp; Scenario Models
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Public DNS checks and editable scenario arithmetic. Outputs do not establish customer demand, business impact, or earnings.
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
            Public DNS Record Check
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
            Inquiry Follow-up Scenario
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
            Sponsorship Scenario
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
                  Public domain to inspect (only with an appropriate basis)
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
                      Checking public DNS...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      Run public DNS check
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
                  setDomainInput("example.com");
                  setNicheInput("Example only");
                }}
                className="underline hover:text-cyan-300 cursor-pointer"
              >
                example.com
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setDomainInput("example.org");
                  setNicheInput("Example only");
                }}
                className="underline hover:text-cyan-300 cursor-pointer"
              >
                example.org
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setDomainInput("example.net");
                  setNicheInput("Example only");
                }}
                className="underline hover:text-cyan-300 cursor-pointer"
              >
                example.net
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
                    <span className="text-zinc-400 text-xs font-mono block">Record-presence checklist</span>
                    <span className="text-base font-bold text-white">
                      Completeness {auditResult.score}/100 · not a risk or deliverability rating
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] font-mono block uppercase">Financial impact</span>
                  <span className="text-lg font-bold text-red-400 font-mono">
                    Unknown
                  </span>
                  <span className="text-[10px] text-zinc-400">Cannot be determined from public DNS</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] font-mono block uppercase">Customer fee</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    Not set
                  </span>
                  <span className="text-[10px] text-zinc-400">No quote or agreement exists</span>
                </div>

                <div>
                  <button
                    onClick={handleCreateDraftOpportunity}
                    disabled={dealAdded}
                    className={`w-full py-2.5 px-3 rounded-xl font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      dealAdded
                        ? "bg-emerald-900 text-emerald-300 border border-emerald-700"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
                    }`}
                  >
                    {dealAdded ? (
                      <>
                        <Check className="w-4 h-4" /> Draft opportunity saved
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" /> Save zero-value draft
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Technical Findings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
                    Observed DNS records
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
                          {f.severity === "Critical" ? "Review" : f.severity === "Warning" ? "Note" : "Observed"}
                        </span>
                      </div>
                      <p className="text-zinc-300 text-[11px] leading-relaxed mb-2">{f.description}</p>
                      <div className="text-[10px] font-mono opacity-80 border-t border-zinc-800/40 pt-1.5">
                        Limit: {f.impact}
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
                        Review notes (no changes performed)
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
                        Outreach draft (review and verify before use)
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
              <h4 className="text-sm font-semibold text-zinc-400">No DNS check displayed</h4>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Enter a public domain to review observed DNS records. A missing or inconclusive record does not prove lost revenue, inbox placement, or a specific remediation need.
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
              Illustrative scenario calculator
            </span>
            <h3 className="text-lg md:text-xl font-bold text-white mt-1">
              Inquiry follow-up scenario
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
              Arithmetic only. Enter sourced assumptions if available; these controls do not use actual lead data, measure outcomes, or forecast revenue. Costs and results are not guaranteed.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sliders Column */}
            <div className="lg:col-span-7 space-y-5 bg-zinc-900/60 p-6 rounded-xl border border-zinc-800 font-mono text-xs">
              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Illustrative inquiry count (not actual client data)</span>
                  <span className="font-bold text-emerald-400">{deadLeadsCount.toLocaleString()} leads</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="100"
                  value={deadLeadsCount}
                  onChange={(e) => setDeadLeadsCount(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <span className="text-[10px] text-zinc-500">Enter a verified count; zero is the default.</span>
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Assumed customer contract value</span>
                  <span className="font-bold text-cyan-400">${avgTicketSize.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25000"
                  step="500"
                  value={avgTicketSize}
                  onChange={(e) => setAvgTicketSize(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-[10px] text-zinc-500">Enter a sourced value; no industry average is assumed.</span>
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Assumed reply rate (not measured)</span>
                  <span className="font-bold text-purple-400">{replyRate}% (~{estimatedReplies} warm replies)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8.0"
                  step="0.5"
                  value={replyRate}
                  onChange={(e) => setReplyRate(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Assumed close rate (not measured)</span>
                  <span className="font-bold text-amber-400">{closeRate}% (~{estimatedClosed} closed jobs)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  value={closeRate}
                  onChange={(e) => setCloseRate(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Example fee rate (must be agreed)</span>
                  <span className="font-bold text-emerald-400">{revSharePercent}% Contingency</span>
                </div>
                <input
                  type="range"
                  min="0"
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
                  Illustrative arithmetic — not a forecast
                </span>

                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <span className="text-zinc-400 text-xs font-mono block">Modeled fee under these assumptions:</span>
                  <span className="text-3xl font-black text-emerald-400 font-mono mt-1 block">
                    ${simOperatorCash.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-zinc-400 mt-1 block">
                    Before costs and taxes; only if work is agreed, completed, and paid.
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono text-zinc-300 pt-2 border-t border-zinc-800">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Modeled gross sales (not verified):</span>
                    <span className="font-bold text-cyan-400">${simGrossRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Modeled amount after fee (not profit):</span>
                    <span className="font-bold text-white">${(simGrossRevenue - simOperatorCash).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Starting capital:</span>
                    <span className="font-bold text-emerald-400">Not tracked</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Delivery time:</span>
                    <span className="font-bold text-purple-400">Not estimated</span>
                  </div>
                </div>
              </div>

              {/* Pitch Summary */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 space-y-1">
                <span className="font-bold text-white font-mono block">Neutral discussion prompt:</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  “If this is relevant, we can first discuss the evidence, permissions, scope, costs, and terms. No business outcome or revenue is promised.”
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tool 3: Sponsorship Scenario */}
      {activeTool === "sponsorship_calc" && (
        <div className="p-6 md:p-8 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl space-y-8">
          <div>
            <span className="text-xs font-mono text-purple-400 font-semibold uppercase">
              Scenario calculator
            </span>
            <h3 className="text-lg md:text-xl font-bold text-white mt-1">
              Sponsorship scenario arithmetic
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
              Enter assumptions to model simple arithmetic. Audience figures, market prices, sponsor demand, and payment are not verified by this tool.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sliders */}
            <div className="lg:col-span-7 space-y-5 bg-zinc-900/60 p-6 rounded-xl border border-zinc-800 font-mono text-xs">
              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Illustrative subscriber count (not verified)</span>
                  <span className="font-bold text-purple-400">{subscribers.toLocaleString()} subscribers</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25000"
                  step="200"
                  value={subscribers}
                  onChange={(e) => setSubscribers(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Assumed open rate (verify with publisher)</span>
                  <span className="font-bold text-emerald-400">{openRate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="75"
                  step="1"
                  value={openRate}
                  onChange={(e) => setOpenRate(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Assumed price per 1,000 readers (not a benchmark)</span>
                  <span className="font-bold text-cyan-400">${cpmRate} CPM</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  step="5"
                  value={cpmRate}
                  onChange={(e) => setCpmRate(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-[10px] text-zinc-500">Use a current, sourced rate; no market benchmark is supplied.</span>
              </div>

              <div>
                <div className="flex justify-between text-zinc-300 mb-1.5">
                  <span>Example fee rate (must be agreed)</span>
                  <span className="font-bold text-purple-400">{brokerCommissionRate}% assumed</span>
                </div>
                <input
                  type="range"
                  min="0"
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
                  Illustrative placement arithmetic
                </span>

                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <span className="text-zinc-400 text-xs font-mono block">Modeled broker fee before costs:</span>
                  <span className="text-3xl font-black text-purple-400 font-mono mt-1 block">
                    ${sponsorshipBrokerCut.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-zinc-400 mt-1 block">
                    Only if terms are agreed and the sponsor pays; not a forecast or payout.
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono text-zinc-300 pt-2 border-t border-zinc-800">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Modeled price per issue:</span>
                    <span className="font-bold text-cyan-400">${adPricePerIssue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Modeled four-issue total:</span>
                    <span className="font-bold text-white">${monthlyPackageValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Modeled publisher share (not paid by app):</span>
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
