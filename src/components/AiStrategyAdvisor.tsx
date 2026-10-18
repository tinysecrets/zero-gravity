"use client";

import React, { useState } from "react";
import { Check, Copy, FileCheck2, Layers, RefreshCw, Sparkles, Target, Globe, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { WebsiteReliabilityAudit } from "@/lib/website-audit";

interface StrategyDraft {
  title: string;
  targetProfile: string;
  researchQuestion: string;
  offerBoundary: string;
  actionSteps: string[];
  customOutreachScript: string;
  scopeChecklist: string;
}

export function AiStrategyAdvisor() {
  const [niche, setNiche] = useState("Commercial solar installers");
  const [location, setLocation] = useState("Phoenix, AZ");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [strategy, setStrategy] = useState<StrategyDraft | null>(null);
  const [websiteAudit, setWebsiteAudit] = useState<WebsiteReliabilityAudit | null>(null);
  const [advisorError, setAdvisorError] = useState<string | null>(null);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedScope, setCopiedScope] = useState(false);

  const handleGenerate = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setIsGenerating(true);
    setCopiedPitch(false);
    setCopiedScope(false);
    setAdvisorError(null);
    setStrategy(null);
    setWebsiteAudit(null);

    try {
      const response = await fetch("/api/ai-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, location, websiteUrl: websiteUrl.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Draft generation failed.");
      setStrategy(data.strategy as StrategyDraft);
      setWebsiteAudit((data.audit as WebsiteReliabilityAudit | null) ?? null);
    } catch (error) {
      setAdvisorError(error instanceof Error ? error.message : "Could not create the evidence-based plan.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyText = async (text: string, type: "pitch" | "scope") => {
    await navigator.clipboard.writeText(text);
    if (type === "pitch") setCopiedPitch(true);
    else setCopiedScope(true);
    window.setTimeout(() => {
      if (type === "pitch") setCopiedPitch(false);
      else setCopiedScope(false);
    }, 2000);
  };

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-white">
          <Sparkles className="h-5 w-5 text-purple-400" />
          Strategy Planning Worksheet
        </h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-400">
          Add a public website URL to run a real read-only DNS/HTTPS/redirect/HTTP/timing audit and use its evidence in the plan. Without a URL, the advisor produces a planning draft only. It never submits forms, touches checkout, or changes a site.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="mb-1 block font-mono text-[11px] text-zinc-400">Industry or service to research</label>
            <input
              type="text"
              required
              maxLength={120}
              value={niche}
              onChange={(event) => setNiche(event.target.value)}
              placeholder="e.g. Commercial roofing"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-white focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div className="md:col-span-4">
            <label className="mb-1 block font-mono text-[11px] text-zinc-400">Location or scope</label>
            <input
              type="text"
              required
              maxLength={120}
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="e.g. Montgomery, Alabama"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-white focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={isGenerating}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-700 to-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {isGenerating ? "Preparing draft…" : "Create planning draft"}
            </button>
          </div>
        </div>
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <label className="mb-1 block font-mono text-[11px] text-zinc-400">
            Optional website to audit before planning
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="url"
                maxLength={2048}
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://your-site.com"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 pl-9 pr-3 font-mono text-xs text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <span className="self-center text-[10px] text-zinc-500">Public page only · query parameters removed · no transactions</span>
          </div>
        </div>
      </form>

      {advisorError && (
        <div role="alert" className="rounded-xl border border-red-800/60 bg-red-950/30 p-4 text-xs text-red-200">
          <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Advisor request failed</div>
          <p className="mt-1">{advisorError}</p>
        </div>
      )}

      {strategy ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-purple-800/60 bg-gradient-to-r from-purple-950/40 via-zinc-950 to-zinc-950 p-6">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 font-mono text-xs text-purple-300">
              {websiteAudit ? "READ-ONLY AUDIT ATTACHED · HUMAN-REVIEWED PLAN" : "DRAFT ONLY · NO WEB RESEARCH PERFORMED"}
            </div>
            <h3 className="text-lg font-bold text-white md:text-xl">{strategy.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300">{strategy.targetProfile}</p>
          </section>

          {websiteAudit && (
            <section className="space-y-4 rounded-2xl border border-cyan-900/60 bg-zinc-950 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-300">
                    <Globe className="h-4 w-4" /> Actual read-only website evidence
                  </div>
                  <h4 className="mt-1 break-all text-base font-bold text-white">{websiteAudit.pageTitle || websiteAudit.hostname}</h4>
                  <p className="mt-1 break-all text-[11px] text-zinc-400">{websiteAudit.finalUrl}</p>
                </div>
                <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs text-white">
                  {websiteAudit.result === "complete" ? `HTTP ${websiteAudit.httpStatus}` : "INCONCLUSIVE"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ["DNS lookup", websiteAudit.dnsLookupMs === null ? "Not resolved" : `${websiteAudit.dnsLookupMs} ms`],
                  ["Time to first byte", websiteAudit.timeToFirstByteMs === null ? "No response" : `${websiteAudit.timeToFirstByteMs} ms`],
                  ["TLS", websiteAudit.tls.status === "valid" ? "Validated" : websiteAudit.tls.status],
                  ["Total check", `${websiteAudit.totalElapsedMs} ms`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    <div className="text-[10px] font-mono uppercase text-zinc-500">{label}</div>
                    <div className="mt-1 break-words text-sm font-semibold text-white">{value}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-white">Observed findings</h5>
                {websiteAudit.findings.slice(0, 6).map((finding, index) => (
                  <div key={finding.title + index} className={`rounded-lg border p-3 ${
                    finding.severity === "critical" ? "border-red-800/60 bg-red-950/20" :
                    finding.severity === "warning" ? "border-amber-800/60 bg-amber-950/20" :
                    finding.severity === "pass" ? "border-emerald-800/50 bg-emerald-950/20" : "border-zinc-800 bg-zinc-900/50"
                  }`}>
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      {finding.severity === "critical" || finding.severity === "warning"
                        ? <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                        : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />}
                      {finding.title}
                      <span className="ml-auto text-[9px] font-mono uppercase text-zinc-400">{finding.severity}</span>
                    </div>
                    <p className="mt-1 break-words text-[11px] text-zinc-300">{finding.evidence}</p>
                    <p className="mt-1 text-[11px] text-cyan-200">Next: {finding.recommendedFix}</p>
                  </div>
                ))}
              </div>
              <p className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-[11px] text-zinc-400">
                Revenue impact is not estimated. One synthetic server-side check does not establish global availability, checkout success, or lost revenue. Checked {new Date(websiteAudit.checkedAt).toLocaleString()}.
              </p>
            </section>
          )}

          <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
            <InfoCard icon={<Target className="h-4 w-4" />} title="Question to investigate" tone="cyan">
              {strategy.researchQuestion}
            </InfoCard>
            <InfoCard icon={<FileCheck2 className="h-4 w-4" />} title="Offer boundary" tone="emerald">
              {strategy.offerBoundary}
            </InfoCard>
          </div>

          <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h4 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan-300">
              <Layers className="h-4 w-4" />
              Research checklist
            </h4>
            <div className="space-y-2">
              {strategy.actionSteps.map((step, index) => (
                <div key={`${index}-${step}`} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-purple-800 bg-purple-950 font-mono text-[11px] font-bold text-purple-300">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DraftTextarea
              title="Neutral outreach draft — verify before use"
              value={strategy.customOutreachScript}
              rows={9}
              copied={copiedPitch}
              onCopy={() => copyText(strategy.customOutreachScript, "pitch")}
            />
            <DraftTextarea
              title="Scope checklist — not legal advice"
              value={strategy.scopeChecklist}
              rows={9}
              copied={copiedScope}
              onCopy={() => copyText(strategy.scopeChecklist, "scope")}
            />
          </div>

          <p className="rounded-xl border border-amber-800/70 bg-amber-950/20 p-4 text-xs leading-relaxed text-amber-100/90">
            {websiteAudit
              ? "This plan is grounded in one real, read-only observation, not a comprehensive audit. Confirm the finding from independent infrastructure evidence and collect visitor, conversion, checkout, and order-value data before estimating financial impact."
              : "No lead counts, response rates, contract values, fees, timelines, or revenue projections are provided. Collect sourced inputs and verify a real target before adding an opportunity to the CRM."}
          </p>
        </div>
      ) : (
        <div className="space-y-2 rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-zinc-600" />
          <h4 className="text-sm font-semibold text-zinc-400">No strategy draft yet</h4>
          <p className="mx-auto max-w-md text-xs text-zinc-500">
            Enter a research area to generate a generic checklist and neutral draft language. The output is not a prospect search, researched strategy, or forecast.
          </p>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  icon,
  title,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: "cyan" | "emerald";
  children: React.ReactNode;
}) {
  const toneClass = tone === "cyan" ? "text-cyan-400" : "text-emerald-400";
  return (
    <section className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <h4 className={`flex items-center gap-1.5 font-mono font-bold uppercase tracking-wider ${toneClass}`}>
        {icon}
        {title}
      </h4>
      <p className="leading-relaxed text-zinc-300">{children}</p>
    </section>
  );
}

function DraftTextarea({
  title,
  value,
  rows,
  copied,
  onCopy,
}: {
  title: string;
  value: string;
  rows: number;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <section className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-mono text-xs font-bold text-zinc-300">{title}</h4>
        <button
          type="button"
          onClick={onCopy}
          className="flex cursor-pointer items-center gap-1 rounded bg-zinc-800 px-2 py-1 font-mono text-[11px] text-zinc-300 hover:bg-zinc-700"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <textarea
        readOnly
        rows={rows}
        value={value}
        className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900 p-3 font-mono text-[11px] leading-relaxed text-zinc-300 focus:outline-none"
      />
    </section>
  );
}
