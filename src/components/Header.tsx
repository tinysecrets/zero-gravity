"use client";

import React from "react";
import {
  Activity,
  BookOpen,
  Cpu,
  DollarSign,
  Layers,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import { FinancialMetrics } from "@/types";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  metrics: FinancialMetrics | null;
  onOpenNewDeal: () => void;
  onOpenScanner: () => void;
  onOpenAdvisor: () => void;
  onOpenPayment: () => void;
}

function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function Header({
  activeTab,
  setActiveTab,
  metrics,
  onOpenNewDeal,
  onOpenScanner,
  onOpenAdvisor,
  onOpenPayment,
}: HeaderProps) {
  const tabs = [
    { id: "dossier", label: "Overview", icon: Terminal, badge: "Reporting" },
    { id: "pipeline", label: "Opportunities", icon: Layers, badge: `${metrics?.activeDealsCount ?? "—"} records` },
    { id: "autonomous", label: "Scheduler", icon: Cpu, badge: "Controls" },
    { id: "scanner", label: "DNS Check", icon: Activity, badge: "Technical" },
    { id: "playbooks", label: "Planning Templates", icon: BookOpen, badge: "Drafts" },
    { id: "ledger", label: "Receipt Ledger", icon: DollarSign, badge: formatUsd(metrics?.totalRealizedRevenue) },
    { id: "advisor", label: "Strategy Worksheet", icon: Sparkles, badge: "Draft only" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
      <div className="border-b border-zinc-800/80 bg-black/60 px-4 py-2 text-xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-zinc-400">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono font-semibold uppercase tracking-wider text-zinc-300">
              ZERO GRAVITY · OPERATIONS WORKSPACE
            </span>
            <span className="hidden text-zinc-600 md:inline-block">|</span>
            <span className="hidden items-center gap-1 text-zinc-400 md:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              Gross receipt reporting · payouts not tracked
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/90 px-2.5 py-1">
              <span className="text-zinc-500">Verified gross receipts:</span>
              <span className="font-bold text-emerald-400">{formatUsd(metrics?.totalRealizedRevenue)}</span>
            </div>
            <div className="hidden items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/90 px-2.5 py-1 sm:flex">
              <span className="text-zinc-500">Recorded opportunity value:</span>
              <span className="font-bold text-cyan-400">{formatUsd(metrics?.grossVolume)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-white md:text-2xl">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                ZERO GRAVITY
              </span>
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-xs font-medium text-cyan-300">
                CUSTOMER PAYMENT WORKFLOW
              </span>
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Recorded opportunities, technical checks, and optional customer-initiated Stripe Checkout. Amounts are not payouts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenPayment}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 px-3.5 py-1.5 font-mono text-xs font-bold text-white shadow-lg shadow-emerald-950/40 transition hover:from-emerald-600 hover:to-teal-600"
          >
            <DollarSign className="h-4 w-4" />
            <span>Create payment request</span>
          </button>
          <button
            onClick={onOpenNewDeal}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700"
          >
            <PlusCircle className="h-3.5 w-3.5 text-zinc-400" />
            <span>Add opportunity</span>
          </button>
          <button
            onClick={onOpenScanner}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700"
          >
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            <span>Run DNS check</span>
          </button>
          <button
            onClick={onOpenAdvisor}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-purple-700/50 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 px-3 py-1.5 text-xs font-medium text-purple-200 transition hover:from-purple-900/60 hover:to-indigo-900/60"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-300" />
            <span>Draft strategy</span>
          </button>
        </div>
      </div>

      <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto border-t border-zinc-900 px-4 pt-1 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-t-lg border-b-2 px-3.5 py-2.5 text-xs transition ${
                isActive
                  ? "border-emerald-400 bg-zinc-900 font-semibold text-white shadow-inner"
                  : "border-transparent text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-emerald-400" : "text-zinc-500"}`} />
              <span>{tab.label}</span>
              <span className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${isActive ? "border border-emerald-800/50 bg-emerald-950 text-emerald-300" : "bg-zinc-800/80 text-zinc-400"}`}>
                {tab.badge}
              </span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
