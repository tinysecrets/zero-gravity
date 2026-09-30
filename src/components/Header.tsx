"use client";

import React from "react";
import { 
  Zap, 
  DollarSign, 
  TrendingUp, 
  ShieldCheck, 
  Layers, 
  Terminal, 
  Sparkles, 
  BookOpen, 
  Activity,
  PlusCircle,
  Cpu
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
    { id: "dossier", label: "Executive Dossier", icon: Terminal, badge: "Discovery" },
    { id: "pipeline", label: "Live Deal Room", icon: Layers, badge: `${metrics?.activeDealsCount || 6} Deals` },
    { id: "scanner", label: "Live Diagnostic Tool", icon: Activity, badge: "Free Stack" },
    { id: "playbooks", label: "Execution SOPs & Contracts", icon: BookOpen, badge: "4 Vectors" },
    { id: "ledger", label: "Financial Ledger", icon: DollarSign, badge: `$${(metrics?.totalRealizedRevenue || 0).toLocaleString()}` },
    { id: "advisor", label: "AI Attack Strategy", icon: Sparkles, badge: "Autonomous" },
  ];

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Protocol Status Bar */}
      <div className="border-b border-zinc-800/80 bg-black/60 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-zinc-300 font-semibold tracking-wider uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              PROJECT ZERO-CAPITAL PROTOCOL
            </span>
            <span className="hidden md:inline-block text-zinc-600">|</span>
            <span className="hidden md:inline-flex items-center gap-1 text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              100% Legal & Verified Asymmetry
            </span>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 px-2.5 py-1 rounded-md">
              <span className="text-zinc-500">Starting Cap:</span>
              <span className="text-emerald-400 font-bold">$0.00</span>
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 px-2.5 py-1 rounded-md">
              <span className="text-zinc-500">Realized Rev:</span>
              <span className="text-emerald-400 font-bold">
                ${(metrics?.totalRealizedRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 px-2.5 py-1 rounded-md">
              <span className="text-zinc-500">Gross Value:</span>
              <span className="text-cyan-400 font-bold">
                ${(metrics?.grossVolume || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-md">
              <span className="text-emerald-300">Margin:</span>
              <span className="text-emerald-400 font-bold">{metrics?.profitMargin || "100.0%"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header / Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                ZERO GRAVITY
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-medium">
                $0 → REVENUE ENGINE
              </span>
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real market arbitrage, zero-risk contingency pipelines, and free autonomous tool orchestration.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenPayment}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs shadow-lg shadow-emerald-950/40 transition cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            <span>Request Secure Payment</span>
          </button>
          <button
            onClick={onOpenNewDeal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs border border-zinc-700 transition cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-zinc-400" />
            <span>+ New Opportunity</span>
          </button>
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs border border-zinc-700 transition cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Run Live Audit</span>
          </button>
          <button
            onClick={onOpenAdvisor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-900/40 to-indigo-900/40 hover:from-purple-900/60 hover:to-indigo-900/60 text-purple-200 border border-purple-700/50 text-xs font-medium transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>AI Strategy Advisor</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto no-scrollbar gap-1 border-t border-zinc-900 pt-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-t-lg transition whitespace-nowrap cursor-pointer border-b-2 ${
                isActive
                  ? "bg-zinc-900 text-white border-emerald-400 font-semibold shadow-inner"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 border-transparent"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : "text-zinc-500"}`} />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800/50"
                    : "bg-zinc-800/80 text-zinc-400"
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
