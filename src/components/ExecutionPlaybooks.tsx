"use client";

import React, { useState } from "react";
import { Playbook } from "@/types";
import { ArrowRight, BookOpen, Check, Copy, Cpu, Layers } from "lucide-react";
import { SEED_PLAYBOOKS } from "@/lib/seed-data";

interface ExecutionPlaybooksProps {
  onApplyPlaybookToDeal: (vector: string) => void;
}

export function ExecutionPlaybooks({ onApplyPlaybookToDeal }: ExecutionPlaybooksProps) {
  const [selectedPlaybookIndex, setSelectedPlaybookIndex] = useState(0);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedAgreement, setCopiedAgreement] = useState(false);
  const [copiedDelivery, setCopiedDelivery] = useState(false);

  const playbook = SEED_PLAYBOOKS[selectedPlaybookIndex];

  const copyText = (text: string, type: "pitch" | "agreement" | "delivery") => {
    navigator.clipboard.writeText(text);
    if (type === "pitch") {
      setCopiedPitch(true);
      setTimeout(() => setCopiedPitch(false), 2000);
    } else if (type === "agreement") {
      setCopiedAgreement(true);
      setTimeout(() => setCopiedAgreement(false), 2000);
    } else {
      setCopiedDelivery(true);
      setTimeout(() => setCopiedDelivery(false), 2000);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          Planning Templates and Draft Checklists
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Illustrative planning material only. It is not market research, a customer case study, legal advice, or a forecast; verify facts, permissions, costs, and requirements before use.
        </p>
      </div>

      {/* Planning template notice */}
      <div className="rounded-xl border border-amber-800/70 bg-amber-950/20 p-4 text-xs leading-relaxed text-amber-100/90">
        These templates do not establish a real customer, opportunity, market rate, likely result, or zero-cost workflow. Any amount or timing shown as “Not estimated” has not been independently validated. Obtain the needed authority and have terms reviewed before use.
      </div>

      {/* Planning template tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SEED_PLAYBOOKS.map((pb, idx) => {
          const isSelected = selectedPlaybookIndex === idx;
          return (
            <button
              key={pb.slug}
              onClick={() => setSelectedPlaybookIndex(idx)}
              className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "bg-zinc-900 border-emerald-500 shadow-lg shadow-emerald-950/40"
                  : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40"
              }`}
            >
              <div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${
                  isSelected ? "bg-emerald-950 text-emerald-300 border-emerald-800" : "bg-zinc-900 text-zinc-500 border-zinc-800"
                }`}>
                  Vector 0{idx + 1}
                </span>
                <h4 className="text-xs font-bold text-white mt-2 line-clamp-2">
                  {pb.title.split(":")[0]}
                </h4>
                <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                  {pb.tagline}
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">Estimate:</span>
                <span className="text-emerald-400 font-bold">{pb.avgDealSize}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Playbook Detail View */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-8 space-y-8 shadow-2xl">
        {/* Top Playbook Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                {playbook.vector.replace(/_/g, " ").toUpperCase()}
              </span>
              <span className="text-xs text-zinc-500 font-mono">Capital: {playbook.capitalRequired}</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-white">{playbook.title}</h3>
            <p className="text-xs text-zinc-300 mt-1 max-w-3xl leading-relaxed">{playbook.tagline}</p>
          </div>

          <button
            onClick={() => onApplyPlaybookToDeal(playbook.vector)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold shadow transition cursor-pointer flex items-center gap-2 whitespace-nowrap"
          >
            <span>Open opportunity form</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Core Specs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block uppercase">Time to first payment</span>
            <span className="text-sm font-bold text-white mt-0.5 block">{playbook.avgTimeToFirstDollar}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block uppercase">Deal amount estimate</span>
            <span className="text-sm font-bold text-emerald-400 mt-0.5 block">{playbook.avgDealSize}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block uppercase">Scalability</span>
            <span className="text-sm font-bold text-cyan-400 mt-0.5 block">{playbook.scalabilityRating}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block uppercase">Tools / access</span>
            <span className="text-sm font-bold text-purple-400 mt-0.5 block truncate" title={playbook.freeToolsUsed}>
              Verify access and cost
            </span>
          </div>
        </div>

        {/* Mechanism Deep Dive */}
        <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
          <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4" />
            Planning consideration
          </h4>
          <p className="text-xs text-zinc-300 leading-relaxed font-sans">{playbook.coreMechanism}</p>
        </div>

        {/* Step-by-Step SOP */}
        <div className="space-y-4">
          <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Draft checklist — verify before use
          </h4>

          <div className="space-y-2.5">
            {playbook.stepByStepExecution.map((step, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-start gap-3 text-xs"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-950 border border-emerald-800/60 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs">
                  {idx + 1}
                </div>
                <div className="text-zinc-200 leading-relaxed">{step}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Templates (Pitch, Contract, Delivery) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-zinc-800">
          {/* Cold Pitch Script */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-300">
                1. Outreach draft (review before use)
              </span>
              <button
                onClick={() => copyText(playbook.scriptsAndTemplates.coldPitch, "pitch")}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-400 transition cursor-pointer flex items-center gap-1"
              >
                {copiedPitch ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedPitch ? "Copied" : "Copy"}
              </button>
            </div>
            <textarea
              readOnly
              rows={12}
              value={playbook.scriptsAndTemplates.coldPitch}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[11px] font-mono text-zinc-300 leading-relaxed resize-none focus:outline-none"
            />
          </div>

          {/* Legal Contingency Contract */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-300">
                2. Scope and fee draft (not legal advice)
              </span>
              <button
                onClick={() => copyText(playbook.scriptsAndTemplates.contingencyAgreement, "agreement")}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-purple-400 transition cursor-pointer flex items-center gap-1"
              >
                {copiedAgreement ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedAgreement ? "Copied" : "Copy"}
              </button>
            </div>
            <textarea
              readOnly
              rows={12}
              value={playbook.scriptsAndTemplates.contingencyAgreement}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[11px] font-mono text-zinc-300 leading-relaxed resize-none focus:outline-none"
            />
          </div>

          {/* Delivery & Fulfillment Protocol */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-300">
                3. Delivery and evidence log
              </span>
              <button
                onClick={() => copyText(playbook.scriptsAndTemplates.deliveryTemplate, "delivery")}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-400 transition cursor-pointer flex items-center gap-1"
              >
                {copiedDelivery ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedDelivery ? "Copied" : "Copy"}
              </button>
            </div>
            <textarea
              readOnly
              rows={12}
              value={playbook.scriptsAndTemplates.deliveryTemplate}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[11px] font-mono text-zinc-300 leading-relaxed resize-none focus:outline-none"
            />
          </div>
        </div>

        {/* Free Tools Breakdown */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-zinc-500 font-mono block text-[10px] uppercase">Tools and access to evaluate</span>
            <span className="text-zinc-300 font-mono font-semibold">{playbook.freeToolsUsed}</span>
          </div>
          <div className="text-emerald-400 font-mono font-bold text-right">
            Cost depends on scope and selected services
          </div>
        </div>
      </div>
    </div>
  );
}
