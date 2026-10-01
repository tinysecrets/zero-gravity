"use client";

import React, { useState } from "react";
import { Opportunity, DealVector, DealStatus } from "@/types";
import { Filter, Plus, Search } from "lucide-react";

interface PipelineCrmProps {
  deals: Opportunity[];
  onSelectDeal: (deal: Opportunity) => void;
  onOpenNewDeal: () => void;
  isLoading: boolean;
}

const STAGES: { id: DealStatus; label: string; color: string }[] = [
  { id: "discovered", label: "1. Discovered", color: "border-zinc-700 bg-zinc-900/50 text-zinc-300" },
  { id: "audited", label: "2. Research recorded", color: "border-blue-900/60 bg-blue-950/20 text-blue-300" },
  { id: "outreach_sent", label: "3. Outreach Sent", color: "border-amber-900/60 bg-amber-950/20 text-amber-300" },
  { id: "contract_signed", label: "4. Terms agreed", color: "border-purple-900/60 bg-purple-950/20 text-purple-300" },
  { id: "in_execution", label: "5. In Execution", color: "border-indigo-900/60 bg-indigo-950/20 text-indigo-300" },
  { id: "completed_invoiced", label: "6. Invoice prepared", color: "border-cyan-900/60 bg-cyan-950/20 text-cyan-300" },
  { id: "revenue_collected", label: "7. Verified receipt", color: "border-emerald-700 bg-emerald-950/40 text-emerald-300" },
];

const VECTOR_BADGES: Record<DealVector, { label: string; bg: string; text: string }> = {
  lead_reactivation: { label: "Inquiry follow-up", bg: "bg-emerald-950/60 border-emerald-800/60", text: "text-emerald-300" },
  technical_leak_audit: { label: "Technical review", bg: "bg-cyan-950/60 border-cyan-800/60", text: "text-cyan-300" },
  micro_sponsorship: { label: "Sponsorship", bg: "bg-purple-950/60 border-purple-800/60", text: "text-purple-300" },
  public_micro_purchase: { label: "Procurement research", bg: "bg-amber-950/60 border-amber-800/60", text: "text-amber-300" },
};

export function PipelineCrm({ deals, onSelectDeal, onOpenNewDeal, isLoading }: PipelineCrmProps) {
  const [selectedVector, setSelectedVector] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  const filteredDeals = deals.filter((deal) => {
    const matchesVector = selectedVector === "all" || deal.vector === selectedVector;
    const matchesSearch =
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.targetCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.targetNiche.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesVector && matchesSearch;
  });

  const totalRealized = filteredDeals.reduce((sum, d) => sum + parseFloat(d.realizedRevenue || "0"), 0);
  const totalPipeline = filteredDeals.reduce((sum, d) => sum + parseFloat(d.potentialValue || "0"), 0);
  const verifiedReceiptDeals = filteredDeals.filter((deal) => deal.status === "revenue_collected").length;

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search company, niche, deal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 w-52 md:w-64"
            />
          </div>

          {/* Vector Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={selectedVector}
              onChange={(e) => setSelectedVector(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All categories</option>
              <option value="lead_reactivation">Lead Reactivation</option>
              <option value="technical_leak_audit">Technical review</option>
              <option value="micro_sponsorship">Sponsorship</option>
              <option value="public_micro_purchase">Procurement research</option>
            </select>
          </div>
        </div>

        {/* View Switcher & Action */}
        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1 rounded-md cursor-pointer transition ${
                viewMode === "kanban" ? "bg-zinc-800 text-white font-medium" : "text-zinc-400 hover:text-white"
              }`}
            >
              Pipeline Board
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 rounded-md cursor-pointer transition ${
                viewMode === "table" ? "bg-zinc-800 text-white font-medium" : "text-zinc-400 hover:text-white"
              }`}
            >
              Table View
            </button>
          </div>

          <button
            onClick={onOpenNewDeal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add opportunity</span>
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800">
          <span className="text-[11px] text-zinc-400 font-mono">Stored opportunity records</span>
          <span className="text-lg font-bold text-white font-mono block mt-0.5">{filteredDeals.length}</span>
        </div>
        <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800">
          <span className="text-[11px] text-zinc-400 font-mono">Recorded opportunity estimates</span>
          <span className="text-lg font-bold text-cyan-400 font-mono block mt-0.5">
            ${totalPipeline.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="mt-1 block text-[10px] leading-relaxed text-zinc-500">Stored estimates; not commitments or collected revenue.</span>
        </div>
        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40">
          <span className="text-[11px] text-emerald-400 font-mono">App-recorded gross receipts</span>
          <span className="text-lg font-bold text-emerald-400 font-mono block mt-0.5">
            ${totalRealized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="mt-1 block text-[10px] leading-relaxed text-zinc-500">Gross verified amounts; fees and payouts are not shown.</span>
        </div>
        <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800">
          <span className="text-[11px] text-zinc-400 font-mono">Records in verified-receipt stage</span>
          <span className="text-lg font-bold text-purple-400 font-mono block mt-0.5">{verifiedReceiptDeals}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-zinc-500 font-mono text-xs">
          <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          Syncing PostgreSQL Pipeline Deals...
        </div>
      ) : viewMode === "kanban" ? (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 items-start overflow-x-auto pb-6">
          {STAGES.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.status === stage.id);
            return (
              <div
                key={stage.id}
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-2.5 min-w-[240px] flex flex-col min-h-[420px]"
              >
                {/* Column Header */}
                <div className={`p-2 rounded-lg border text-xs font-mono font-bold mb-3 flex items-center justify-between ${stage.color}`}>
                  <span className="truncate">{stage.label}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px]">
                    {stageDeals.length}
                  </span>
                </div>

                {/* Deal Cards */}
                <div className="space-y-2.5 flex-1">
                  {stageDeals.map((deal) => {
                    const badge = VECTOR_BADGES[deal.vector] || {
                      label: deal.vector,
                      bg: "bg-zinc-800",
                      text: "text-zinc-300",
                    };
                    return (
                      <div
                        key={deal.id}
                        onClick={() => onSelectDeal(deal)}
                        className="group p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-emerald-500/60 hover:bg-zinc-850 transition cursor-pointer shadow-sm relative overflow-hidden"
                      >
                        {deal.status === "revenue_collected" && (
                          <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-bl-sm"></div>
                        )}

                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </div>

                        <h4 className="text-xs font-semibold text-white group-hover:text-emerald-300 transition line-clamp-2">
                          {deal.title}
                        </h4>

                        <div className="text-[11px] text-zinc-400 mt-1 truncate">
                          {deal.targetCompany}
                        </div>

                        {/* Financial figures */}
                        <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between font-mono text-[11px]">
                          <div>
                            <span className="text-zinc-500 block text-[9px]">Recorded estimate</span>
                            <span className="text-zinc-300">${parseFloat(deal.potentialValue).toLocaleString()}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-zinc-500 block text-[9px]">Verified gross</span>
                            <span className={`font-bold ${parseFloat(deal.realizedRevenue) > 0 ? "text-emerald-400" : "text-zinc-500"}`}>
                              ${parseFloat(deal.realizedRevenue).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {stageDeals.length === 0 && (
                    <div className="h-28 rounded-lg border border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 text-[11px] font-mono">
                      No deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Deal / Target Company</th>
                  <th className="py-3 px-4">Vector</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Recorded estimate</th>
                  <th className="py-3 px-4">Proposed fee</th>
                  <th className="py-3 px-4">Gross recorded value</th>
                  <th className="py-3 px-4">Verified gross</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                {filteredDeals.map((deal) => {
                  const badge = VECTOR_BADGES[deal.vector] || { label: deal.vector, bg: "bg-zinc-800", text: "text-zinc-300" };
                  const stage = STAGES.find((s) => s.id === deal.status);
                  return (
                    <tr
                      key={deal.id}
                      onClick={() => onSelectDeal(deal)}
                      className="hover:bg-zinc-800/40 transition cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white font-sans">{deal.title}</div>
                        <div className="text-[11px] text-zinc-400 font-sans">{deal.targetCompany} • {deal.targetContact}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${stage?.color || "border-zinc-700 text-zinc-400"}`}>
                          {stage?.label || deal.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        ${parseFloat(deal.potentialValue).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-purple-400">
                        {deal.operatorFeePercent}%
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        ${parseFloat(deal.grossTransactionValue).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${parseFloat(deal.realizedRevenue) > 0 ? "text-emerald-400" : "text-zinc-500"}`}>
                          ${parseFloat(deal.realizedRevenue).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDeal(deal);
                          }}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-300 text-[11px] transition cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
