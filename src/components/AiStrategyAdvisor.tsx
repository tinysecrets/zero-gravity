"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Cpu, 
  Zap, 
  DollarSign, 
  Copy, 
  Check, 
  ArrowRight, 
  Target, 
  FileCheck2, 
  Layers, 
  ShieldCheck,
  RefreshCw,
  PlusCircle
} from "lucide-react";
import { Opportunity } from "@/types";

interface AiStrategyAdvisorProps {
  onAddDealFromAdvisor: (deal: Partial<Opportunity>) => Promise<void>;
}

export function AiStrategyAdvisor({ onAddDealFromAdvisor }: AiStrategyAdvisorProps) {
  const [niche, setNiche] = useState("Commercial Solar Installers");
  const [location, setLocation] = useState("Phoenix, AZ / National");
  const [isGenerating, setIsGenerating] = useState(false);
  const [strategy, setStrategy] = useState<any>(null);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedClause, setCopiedClause] = useState(false);
  const [addedDeal, setAddedDeal] = useState(false);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    setAddedDeal(false);

    try {
      const res = await fetch("/api/ai-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, location }),
      });
      const data = await res.json();
      if (data.success) {
        setStrategy(data.strategy);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyText = (text: string, type: "pitch" | "clause") => {
    navigator.clipboard.writeText(text);
    if (type === "pitch") {
      setCopiedPitch(true);
      setTimeout(() => setCopiedPitch(false), 2000);
    } else {
      setCopiedClause(true);
      setTimeout(() => setCopiedClause(false), 2000);
    }
  };

  const handleDeployToPipeline = async () => {
    if (!strategy) return;
    try {
      await onAddDealFromAdvisor({
        title: `${niche} (${location}) - Inactive Lead Revival Sprint`,
        vector: "lead_reactivation",
        targetCompany: `${niche} Target Fleet`,
        targetContact: "Owner / VP Operations",
        targetEmail: `operations@example.com`,
        targetNiche: niche,
        status: "discovered",
        potentialValue: "28000.00",
        operatorFeePercent: "20.00",
        grossTransactionValue: "28000.00",
        realizedRevenue: "0.00",
        capitalSpent: "0.00",
        outreachMessage: strategy.customOutreachScript,
        contractTerms: strategy.contingencyClause,
        notes: `Strategy generated via AI Autonomous Advisor. Target: ${strategy.targetProfile}`,
        auditData: JSON.stringify(strategy.financialProjections),
      });
      setAddedDeal(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Autonomous AI Opportunity &amp; Strategy Engine
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Provide any niche, geography, or industry vertical to synthesize an immediate $0-capital monetization vector.
        </p>
      </div>

      {/* Input Generator Card */}
      <form onSubmit={handleGenerate} className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label className="block text-zinc-400 font-mono text-[11px] mb-1">
              Target High-Ticket Niche / Vertical *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Commercial Roofing, Cosmetic Dentistry, Luxury Kitchens"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-zinc-400 font-mono text-[11px] mb-1">
              Geographic Scope or Platform *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Phoenix, AZ / Substack / Austin, TX"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Synthesizing Attack Vector...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate $0 Attack Plan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 flex-wrap pt-1">
          <span className="text-zinc-500">Popular Niche Presets:</span>
          <button
            type="button"
            onClick={() => {
              setNiche("Cosmetic Dentistry & Orthodontics");
              setLocation("Dallas, TX");
            }}
            className="underline hover:text-purple-300 cursor-pointer"
          >
            Cosmetic Dentistry
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              setNiche("Commercial HVAC & Refrigeration");
              setLocation("Atlanta, GA");
            }}
            className="underline hover:text-purple-300 cursor-pointer"
          >
            Commercial HVAC
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              setNiche("Developer Tools & DevOps Newsletters");
              setLocation("Substack / Beehiiv Remote");
            }}
            className="underline hover:text-purple-300 cursor-pointer"
          >
            DevOps Newsletters
          </button>
        </div>
      </form>

      {/* Generated Strategy View */}
      {strategy ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Strategy Title & Deploy Bar */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-zinc-950 to-zinc-950 border border-purple-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono">
                  AUTONOMOUS VECTOR SYNTHESIS
                </span>
                <span className="text-xs text-emerald-400 font-mono">Capital: $0.00</span>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white">{strategy.title}</h3>
              <p className="text-xs text-zinc-300 mt-1 font-mono">{strategy.targetProfile}</p>
            </div>

            <button
              onClick={handleDeployToPipeline}
              disabled={addedDeal}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                addedDeal
                  ? "bg-emerald-900 text-emerald-300 border border-emerald-700"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
              }`}
            >
              {addedDeal ? (
                <>
                  <Check className="w-4 h-4" /> Deployed to CRM Pipeline!
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" /> Deploy Strategy into Deal CRM
                </>
              )}
            </button>
          </div>

          {/* Economic Asymmetry & Value Proposition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <h4 className="font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                Underlying Economic Inefficiency
              </h4>
              <p className="text-zinc-300 leading-relaxed font-sans">{strategy.asymmetryDiscovery}</p>
            </div>

            <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <h4 className="font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                Pure Performance Offer (Zero Sales Resistance)
              </h4>
              <p className="text-zinc-300 leading-relaxed font-sans">{strategy.purePerformanceProposition}</p>
            </div>
          </div>

          {/* Unit Economics Projections */}
          <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
            <h4 className="font-mono font-bold text-purple-300 uppercase tracking-wider text-xs flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              Mathematical Unit Economics &amp; Operator Yield
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">Typical Inactive Leads</span>
                <span className="text-sm font-bold text-white mt-0.5 block">{strategy.financialProjections.typicalListSize}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">Expected Responses</span>
                <span className="text-sm font-bold text-cyan-400 mt-0.5 block">{strategy.financialProjections.expectedReplyRate}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">Gross Revenue Created</span>
                <span className="text-sm font-bold text-white mt-0.5 block">{strategy.financialProjections.grossRevenueGenerated}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
                <span className="text-emerald-400 text-[10px] block font-bold">Your Net Operator Cash</span>
                <span className="text-base font-black text-emerald-400 mt-0.5 block">
                  {strategy.financialProjections.operatorNetCommission}
                </span>
              </div>
            </div>
          </div>

          {/* Execution Roadmap */}
          <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
            <h4 className="font-mono font-bold text-zinc-300 uppercase tracking-wider text-xs flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              Autonomous Action Roadmap (7-Step Sprint)
            </h4>
            <div className="space-y-2">
              {strategy.actionSteps.map((step: string, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800/80 text-xs text-zinc-300 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-purple-950 border border-purple-800 text-purple-300 font-mono text-[11px] flex items-center justify-center shrink-0 font-bold">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Copyable Custom Scripts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-400">
                  Tailored Outreach Script
                </span>
                <button
                  onClick={() => copyText(strategy.customOutreachScript, "pitch")}
                  className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-400 cursor-pointer flex items-center gap-1"
                >
                  {copiedPitch ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedPitch ? "Copied" : "Copy"}
                </button>
              </div>
              <textarea
                readOnly
                rows={7}
                value={strategy.customOutreachScript}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-[11px] font-mono text-zinc-300 leading-relaxed resize-none focus:outline-none"
              />
            </div>

            <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-purple-400">
                  Binding Contingency Clause
                </span>
                <button
                  onClick={() => copyText(strategy.contingencyClause, "clause")}
                  className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-purple-400 cursor-pointer flex items-center gap-1"
                >
                  {copiedClause ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedClause ? "Copied" : "Copy"}
                </button>
              </div>
              <textarea
                readOnly
                rows={7}
                value={strategy.contingencyClause}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-[11px] font-mono text-zinc-300 leading-relaxed resize-none focus:outline-none"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-2xl border border-dashed border-zinc-800 text-center space-y-2">
          <Sparkles className="w-8 h-8 text-zinc-600 mx-auto" />
          <h4 className="text-sm font-semibold text-zinc-400">AI Strategy Engine Ready</h4>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Click "Generate $0 Attack Plan" above to synthesize customized asymmetry angles, math, and copy scripts.
          </p>
        </div>
      )}
    </div>
  );
}
