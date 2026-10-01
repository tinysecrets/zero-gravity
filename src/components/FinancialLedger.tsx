"use client";

import React, { useState } from "react";
import { Transaction, FinancialMetrics, Opportunity } from "@/types";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  FileSpreadsheet,
  Layers,
  Plus,
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
  const [paymentMethod, setPaymentMethod] = useState("External customer payment");
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

  const totalCollected = metrics?.totalRealizedRevenue;
  const grossVolume = metrics?.grossVolume;
  const capitalSpent = metrics?.totalCapitalSpent;
  const formatUsd = (value: number | undefined) => value === undefined
    ? "Unavailable"
    : `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
            Receipt Ledger &amp; Reconciliation
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manual entries stay pending until reconciled; only verified records contribute to the gross receipt total.
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

      <div className="rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-4 text-xs leading-relaxed text-cyan-100/90">
        <strong className="text-cyan-200">Receipt scope:</strong> the total below is gross customer payments from verified records. It is not net income, an available Stripe balance, or a bank payout. Processor fees, refunds, disputes, taxes, and payouts require separate reconciliation.
      </div>

      {/* Stored financial figures */}
      <div className="grid grid-cols-1 gap-4 font-mono sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-emerald-800/60 bg-emerald-950/30 p-5 shadow-xl">
          <div className="mb-2 text-xs text-emerald-400">Verified gross customer receipts</div>
          <span className="block text-3xl font-black text-emerald-400">{formatUsd(totalCollected)}</span>
          <span className="mt-1 block text-[11px] text-zinc-400">Provider-confirmed or reconciled records; not a payout balance.</span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
          <div className="mb-2 text-xs text-cyan-400">Recorded gross opportunity value</div>
          <span className="block text-2xl font-black text-cyan-300">{formatUsd(grossVolume)}</span>
          <span className="mt-1 block text-[11px] text-zinc-500">Stored deal amounts may be estimates; they do not show value delivered or revenue earned.</span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
          <div className="mb-2 text-xs text-amber-300">Spend recorded on opportunities</div>
          <span className="block text-2xl font-black text-amber-300">{formatUsd(capitalSpent)}</span>
          <span className="mt-1 block text-[11px] text-zinc-500">Not a complete expense report or a measure of starting capital.</span>
        </div>
      </div>

      {/* Verified receipts by category */}
      <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h3 className="flex items-center gap-2 text-sm font-mono font-bold uppercase tracking-wider text-white">
          <Layers className="h-4 w-4 text-emerald-400" />
          Verified gross receipts by recorded category
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block">Lead re-engagement</span>
            <span className="text-xl font-black text-emerald-400 block mt-1">${(settledByType.rev_share_commission || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="text-[10px] text-zinc-400 block mt-1">Gross receipts in this category</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block">Technical review</span>
            <span className="text-xl font-black text-cyan-400 block mt-1">${(settledByType.fix_bounty || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="text-[10px] text-zinc-400 block mt-1">Gross receipts in this category</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block">Sponsorship</span>
            <span className="text-xl font-black text-purple-400 block mt-1">${(settledByType.sponsorship_brokerage || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="text-[10px] text-zinc-400 block mt-1">Gross receipts in this category</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block">Procurement</span>
            <span className="text-xl font-black text-amber-400 block mt-1">${(settledByType.finder_fee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="text-[10px] text-zinc-400 block mt-1">Gross receipts in this category</span>
          </div>
        </div>
      </div>

      {/* Verified Transaction Ledger */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Receipt records ({transactions.length} entries)
          </h3>
          <span className="text-xs text-zinc-500 font-mono">
            {pendingReconciliation} pending reconciliation · totals are gross receipts, not payouts
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
                <th className="py-3 px-4 text-right">Gross Amount</th>
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
                        Verified record
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
              Log an External Customer Payment
            </h3>

            <p className="text-[11px] leading-relaxed text-zinc-400">Manual entries are saved as pending and do not count as verified receipts until reconciled.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-zinc-400 mb-1">Received Amount ($ USD) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="0.00"
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
                  <option value="rev_share_commission">Lead re-engagement service</option>
                  <option value="fix_bounty">Technical review service</option>
                  <option value="sponsorship_brokerage">Sponsorship service</option>
                  <option value="finder_fee">Procurement support service</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Inbound payment method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="External customer payment">External customer payment</option>
                  <option value="Bank Wire Transfer">External bank transfer received</option>
                  <option value="Stripe Direct Checkout">Stripe Checkout received</option>
                  <option value="ACH Direct Deposit">ACH received</option>
                  <option value="Wise Transfer">Other external payment</option>
                  <option value="Zelle">Other external payment method</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Description &amp; Client Reference *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Customer invoice receipt — reference only"
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
