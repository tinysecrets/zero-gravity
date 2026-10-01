"use client";

import React, { useState } from "react";
import { Opportunity, DealStatus } from "@/types";
import { 
  X, 
  DollarSign, 
  CheckCircle2, 
  Send, 
  FileText, 
  Copy, 
  Check, 
  Trash2, 
  Save, 
  Clock, 
  ExternalLink,
  ShieldCheck,
  Zap,
  Building2,
  User,
  Mail,
  Phone
} from "lucide-react";

interface DealModalProps {
  deal: Opportunity | null;
  onClose: () => void;
  onUpdate: (updatedDeal: Partial<Opportunity>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const ALL_STATUSES: { id: DealStatus; label: string }[] = [
  { id: "discovered", label: "1. Discovered" },
  { id: "audited", label: "2. Research recorded" },
  { id: "outreach_sent", label: "3. Outreach Sent" },
  { id: "contract_signed", label: "4. Terms agreed" },
  { id: "in_execution", label: "5. In Execution" },
  { id: "completed_invoiced", label: "6. Invoice prepared" },
  { id: "revenue_collected", label: "7. Verified receipt" },
];

export function DealModal({ deal, onClose, onUpdate, onDelete }: DealModalProps) {
  if (!deal) return null;

  const [status, setStatus] = useState<DealStatus>(deal.status);
  const [potentialValue, setPotentialValue] = useState(deal.potentialValue);
  const [operatorFeePercent, setOperatorFeePercent] = useState(deal.operatorFeePercent);
  const [grossTransactionValue, setGrossTransactionValue] = useState(deal.grossTransactionValue);
  const [realizedRevenue, setRealizedRevenue] = useState(deal.realizedRevenue);
  const [notes, setNotes] = useState(deal.notes || "");
  const [outreachMessage, setOutreachMessage] = useState(deal.outreachMessage || "");
  const [contractTerms, setContractTerms] = useState(deal.contractTerms || "");

  const [isSaving, setIsSaving] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedContract, setCopiedContract] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "pitch" | "contract" | "notes">("overview");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        id: deal.id,
        status,
        potentialValue,
        operatorFeePercent,
        grossTransactionValue,
        realizedRevenue,
        notes,
        outreachMessage,
        contractTerms,
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Unable to save this deal.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrepareInvoice = () => {
    setStatus("completed_invoiced");
    if (parseFloat(grossTransactionValue) === 0) {
      setGrossTransactionValue(potentialValue);
    }
  };

  const copyToClipboard = (text: string, type: "pitch" | "contract") => {
    navigator.clipboard.writeText(text);
    if (type === "pitch") {
      setCopiedPitch(true);
      setTimeout(() => setCopiedPitch(false), 2000);
    } else {
      setCopiedContract(true);
      setTimeout(() => setCopiedContract(false), 2000);
    }
  };

  let parsedAuditData: any = null;
  try {
    if (deal.auditData) {
      parsedAuditData = JSON.parse(deal.auditData);
    }
  } catch {
    parsedAuditData = null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-start justify-between bg-zinc-900/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                {deal.vector.replace(/_/g, " ").toUpperCase()}
              </span>
              <span className="text-xs text-zinc-400 font-mono">ID: #{deal.id}</span>
            </div>
            <h3 className="text-lg font-bold text-white">{deal.title}</h3>
            <div className="flex items-center gap-4 text-xs text-zinc-400 mt-1 font-mono">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                {deal.targetCompany}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-zinc-500" />
                {deal.targetContact}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/40 px-5 gap-4 text-xs font-mono">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-2.5 border-b-2 cursor-pointer transition ${
              activeTab === "overview" ? "border-emerald-400 text-emerald-400 font-bold" : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Overview &amp; Financials
          </button>
          <button
            onClick={() => setActiveTab("pitch")}
            className={`py-2.5 border-b-2 cursor-pointer transition ${
              activeTab === "pitch" ? "border-emerald-400 text-emerald-400 font-bold" : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Outreach Script
          </button>
          <button
            onClick={() => setActiveTab("contract")}
            className={`py-2.5 border-b-2 cursor-pointer transition ${
              activeTab === "contract" ? "border-emerald-400 text-emerald-400 font-bold" : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Contingency Terms
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`py-2.5 border-b-2 cursor-pointer transition ${
              activeTab === "notes" ? "border-emerald-400 text-emerald-400 font-bold" : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Log &amp; Notes
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6 text-xs">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Pipeline Stage Selector */}
              <div>
                <label className="block text-zinc-400 font-mono font-semibold mb-2">
                  Pipeline Stage Progression
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={s.id === "revenue_collected" && deal.status !== "revenue_collected"}
                      onClick={() => setStatus(s.id)}
                      className={`p-2 rounded-lg border text-left font-mono text-[11px] transition ${
                        s.id === "revenue_collected" && deal.status !== "revenue_collected"
                          ? "cursor-not-allowed bg-zinc-950 border-zinc-900 text-zinc-600"
                          : status === s.id
                          ? "cursor-pointer bg-emerald-950 border-emerald-500 text-emerald-300 font-bold shadow"
                          : "cursor-pointer bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Financial Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div>
                  <label className="block text-zinc-400 font-mono text-[11px] mb-1">
                    Opportunity estimate ($)
                  </label>
                  <input
                    type="number"
                    value={potentialValue}
                    onChange={(e) => setPotentialValue(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-mono text-[11px] mb-1">
                    Proposed fee rate (%)
                  </label>
                  <input
                    type="number"
                    value={operatorFeePercent}
                    onChange={(e) => setOperatorFeePercent(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-purple-400 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-mono text-[11px] mb-1">
                    Recorded gross value ($)
                  </label>
                  <input
                    type="number"
                    value={grossTransactionValue}
                    onChange={(e) => setGrossTransactionValue(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-cyan-400 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-mono text-[11px] mb-1">
                    Verified gross receipts ($)
                  </label>
                  <input
                    type="number"
                    value={realizedRevenue}
                    readOnly
                    title="Updated only after a verified live settlement or authorized reconciliation."
                    className="w-full cursor-not-allowed bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-emerald-400 font-mono font-bold text-xs outline-none"
                  />
                </div>
              </div>

              {/* One-click Action: Prepare an Invoice */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-cyan-950/25 border border-cyan-800/50">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  <div>
                    <span className="font-semibold text-cyan-200 block">
                      Prepare Secure Checkout
                    </span>
                    <span className="text-zinc-400 text-[11px]">
                      Save the opportunity as invoice-preparation work, then create a voluntary Stripe Checkout request. No payment is recorded until a verified live settlement.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePrepareInvoice}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-semibold text-xs shadow-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Prepare Invoice</span>
                </button>
              </div>

              {/* Diagnostic / Audit Data (if available) */}
              {parsedAuditData && (
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <h4 className="font-mono text-zinc-300 font-semibold mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    Audit &amp; Diagnostic Metadata
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {Object.entries(parsedAuditData).map(([k, v]) => (
                      <div key={k} className="p-2 rounded bg-zinc-950 border border-zinc-800">
                        <span className="text-zinc-500 text-[10px] block uppercase">{k}</span>
                        <span className="text-zinc-200">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "pitch" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-mono">
                  Outreach draft (review facts and permissions before sending)
                </span>
                <button
                  onClick={() => copyToClipboard(outreachMessage, "pitch")}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-mono transition cursor-pointer"
                >
                  {copiedPitch ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPitch ? "Copied!" : "Copy Pitch"}
                </button>
              </div>

              <textarea
                rows={10}
                value={outreachMessage}
                onChange={(e) => setOutreachMessage(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-200 font-mono text-xs focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>
          )}

          {activeTab === "contract" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-mono">
                  Pure Performance / Contingency Agreement Terms
                </span>
                <button
                  onClick={() => copyToClipboard(contractTerms, "contract")}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-purple-400 font-mono transition cursor-pointer"
                >
                  {copiedContract ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedContract ? "Copied!" : "Copy Agreement"}
                </button>
              </div>

              <textarea
                rows={8}
                value={contractTerms}
                onChange={(e) => setContractTerms(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-200 font-mono text-xs focus:outline-none focus:border-purple-500 leading-relaxed"
              />
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-4">
              <label className="block text-zinc-400 font-mono">
                Operator Action Log &amp; Timeline Notes
              </label>
              <textarea
                rows={8}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Record timeline events, customer phone calls, dates of payments..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-200 text-xs focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (confirm("Are you sure you want to delete this deal?")) {
                onDelete(deal.id);
                onClose();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 text-xs font-mono transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Deal</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold shadow transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
