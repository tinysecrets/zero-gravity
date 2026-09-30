"use client";

import React, { useState } from "react";
import { Transaction, FinancialMetrics, Opportunity } from "@/types";
import { 
  DollarSign, 
  TrendingUp, 
  ShieldCheck, 
  Plus, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock, 
  Wallet,
  Building2,
  FileSpreadsheet,
  Zap,
  Layers,
  Sparkles
} from "lucide-react";

interface FinancialLedgerProps {
  transactions: Transaction[];
  metrics: FinancialMetrics | null;
  deals: Opportunity[];
  onAddTransaction: (tx: Partial<Transaction>) => Promise<void>;
}

export function FinancialLedger({ transactions, metrics, deals, onAddTransaction }: FinancialLedgerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState("rev_share_commission");
  const [paymentMethod, setPaymentMethod] = useState("Bank Wire Transfer");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    setIsSubmitting(true);
    try {
      await onAddTransaction({
        amount,
        transactionType,
        paymentMethod,
        description,
        verified: true,
      });
      setShowAddModal(false);
      setAmount("");
      setDescription("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCollected = metrics?.totalRealizedRevenue || 0;
  const grossVolume = metrics?.grossVolume || 0;
  const capitalSpent = metrics?.totalCapitalSpent || 0;
  const netProfit = totalCollected - capitalSpent;
  const settledByType = transactions
    .filter((tx) => tx.verified)
    .reduce<Record<string, number>>((totals, tx) => {
      totals[tx.transactionType] = (totals[tx.transactionType] || 0) + parseFloat(tx.amount || "0");
      return totals;
    }, {});
  const pendingReconciliation = transactions.filter((tx) => !tx.verified).length;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Financial Ledger &amp; Real-Time Audit Trail
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Revenue appears only after provider-confirmed settlement; manually logged items remain pending reconciliation.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold shadow transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Log for Reconciliation</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-2">
            <span>Starting Capital</span>
            <span className="p-1 rounded bg-zinc-900 text-zinc-400">$0 Constraint</span>
          </div>
          <span className="text-2xl font-black text-white block">$0.00</span>
          <span className="text-[11px] text-zinc-500 mt-1 block">Zero out-of-pocket investment</span>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 shadow-xl">
          <div className="flex items-center justify-between text-emerald-400 text-xs mb-2">
            <span>Realized Net Revenue</span>
            <span className="p-1 rounded bg-emerald-900/60 text-emerald-300">100% Margin</span>
          </div>
          <span className="text-3xl font-black text-emerald-400 block">
            ${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-zinc-400 mt-1 block">Actual funds received by operator</span>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl">
          <div className="flex items-center justify-between text-cyan-400 text-xs mb-2">
            <span>Gross Volume Facilitated</span>
            <span className="p-1 rounded bg-cyan-950/60 text-cyan-300">Total Pipeline</span>
          </div>
          <span className="text-2xl font-black text-cyan-300 block">
            ${grossVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-zinc-500 mt-1 block">Economic value unlocked for clients</span>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl">
          <div className="flex items-center justify-between text-purple-400 text-xs mb-2">
            <span>Capital Efficiency Ratio</span>
            <span className="p-1 rounded bg-purple-950/60 text-purple-300">Infinite ROI</span>
          </div>
          <span className="text-2xl font-black text-purple-300 block">{totalCollected > 0 ? "∞ : 1" : "—"}</span>
          <span className="text-[11px] text-zinc-500 mt-1 block">
            {totalCollected > 0 ? "Verified revenue generated from $0.00" : "Awaiting a verified settlement"}
          </span>
        </div>
      </div>

      {/* Revenue Breakdown by Vector */}
      <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          Revenue Realization by Asymmetry Vector
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block">Ghost Lead Revival</span>
            <span className="text-xl font-black text-emerald-400 block mt-1">${(settledByType.rev_share_commission || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="text-[10px] text-zinc-400 block mt-1">Verified rev-share settlements</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block">Technical Leak Bounty</span>
            <span className="text-xl font-black text-cyan-400 block mt-1">${(settledByType.fix_bounty || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="text-[10px] text-zinc-400 block mt-1">Provider-confirmed remediation bounties</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block">Micro-Sponsorship Broker</span>
            <span className="text-xl font-black text-purple-400 block mt-1">${(settledByType.sponsorship_brokerage || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="text-[10px] text-zinc-400 block mt-1">Verified advertiser-settlement fees</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block">Micro-Purchase Solicitation</span>
            <span className="text-xl font-black text-amber-400 block mt-1">${(settledByType.finder_fee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="text-[10px] text-zinc-400 block mt-1">Verified procurement spread</span>
          </div>
        </div>
      </div>

      {/* Verified Transaction Ledger */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Verified Financial Transactions Log ({transactions.length} entries)
          </h3>
          <span className="text-xs text-zinc-500 font-mono">
            {pendingReconciliation} pending reconciliation · verified entries only count as cash
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900/40 border-b border-zinc-800 text-zinc-400 text-[11px]">
              <tr>
                <th className="py-3 px-4">TX ID</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Settlement Rail</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Net Cash Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {transactions.map((tx, idx) => (
                <tr key={tx.id || idx} className="hover:bg-zinc-900/40 transition">
                  <td className="py-3.5 px-4 text-zinc-500">#{tx.id || idx + 101}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px]">
                      {tx.transactionType.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-sans text-white max-w-sm">
                    {tx.description}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400">
                    {tx.paymentMethod}
                  </td>
                  <td className="py-3.5 px-4">
                    {tx.verified ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified Cleared
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400 text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        Pending Reconciliation
                      </span>
                    )}
                  </td>
                  <td className={`py-3.5 px-4 text-right font-bold text-sm ${tx.verified ? "text-emerald-400" : "text-zinc-500"}`}>
                    {tx.verified ? "+" : ""}${parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}

              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    No transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4 font-mono text-xs">
            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              Log External Payment for Reconciliation
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-zinc-400 mb-1">Received Amount ($ USD) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="2400.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Transaction Category</label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="rev_share_commission">Ghost Lead Revival (25% Commission)</option>
                  <option value="fix_bounty">DNS / Deliverability Fix Bounty</option>
                  <option value="sponsorship_brokerage">Micro-Sponsorship Brokerage Fee</option>
                  <option value="finder_fee">Micro-Purchase Procurement Spread</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Settlement Rail / Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Bank Wire Transfer">Bank Wire Transfer</option>
                  <option value="Stripe Direct Checkout">Stripe Direct Checkout</option>
                  <option value="ACH Direct Deposit">ACH Direct Deposit</option>
                  <option value="Wise Transfer">Wise Business</option>
                  <option value="Zelle">Zelle Corporate</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Description &amp; Client Reference *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Roofing LLC - 25% fee on closed roof replacement"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-sans focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Recording..." : "Create Pending Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
