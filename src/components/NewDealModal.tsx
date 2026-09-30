"use client";

import React, { useState } from "react";
import { DealVector, DealStatus, Opportunity } from "@/types";
import { X, Plus, Sparkles, Building2, User, Mail, Phone, DollarSign } from "lucide-react";

interface NewDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (deal: Partial<Opportunity>) => Promise<void>;
}

const VECTOR_DEFAULTS: Record<DealVector, {
  potentialValue: string;
  operatorFeePercent: string;
  contractTerms: string;
  outreachMessage: string;
}> = {
  lead_reactivation: {
    potentialValue: "18000.00",
    operatorFeePercent: "25.00",
    contractTerms: "25% Performance-based revenue share on all closed sales from dormant list within 60 days. $0 upfront fee.",
    outreachMessage: "Hi {{OwnerName}}, what are you currently doing with the ~1,000 inquiries from last year who never bought? We do a 3-day reactivation sprint on 100% contingency...",
  },
  technical_leak_audit: {
    potentialValue: "350.00",
    operatorFeePercent: "100.00",
    contractTerms: "Fixed $350 one-time deliverability remediation bounty. 100% pass guarantee.",
    outreachMessage: "Hi {{OwnerName}}, I ran a deliverability check on {{domain}} and noticed your DMARC authentication is missing, routing ~30% of quotes to spam...",
  },
  micro_sponsorship: {
    potentialValue: "2800.00",
    operatorFeePercent: "30.00",
    contractTerms: "Non-exclusive broker representation. 30% commission withheld upon sponsor escrow clearance.",
    outreachMessage: "Hi {{CreatorName}}, I represent B2B SaaS advertisers looking for hyper-targeted niche reach. Can we package 2-3 upcoming slots at 70/30 split?",
  },
  public_micro_purchase: {
    potentialValue: "4500.00",
    operatorFeePercent: "30.00",
    contractTerms: "Public Micro-Purchase Purchase Order under statutory threshold. Back-to-back delivery.",
    outreachMessage: "Official Quotation submitted for micro-purchase solicitation #... Turnaround: 5 business days.",
  },
};

export function NewDealModal({ isOpen, onClose, onCreate }: NewDealModalProps) {
  if (!isOpen) return null;

  const [vector, setVector] = useState<DealVector>("lead_reactivation");
  const [title, setTitle] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [targetContact, setTargetContact] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [targetPhone, setTargetPhone] = useState("");
  const [targetNiche, setTargetNiche] = useState("Residential Roofing");
  const [potentialValue, setPotentialValue] = useState(VECTOR_DEFAULTS.lead_reactivation.potentialValue);
  const [operatorFeePercent, setOperatorFeePercent] = useState(VECTOR_DEFAULTS.lead_reactivation.operatorFeePercent);
  const [outreachMessage, setOutreachMessage] = useState(VECTOR_DEFAULTS.lead_reactivation.outreachMessage);
  const [contractTerms, setContractTerms] = useState(VECTOR_DEFAULTS.lead_reactivation.contractTerms);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVectorChange = (newVector: DealVector) => {
    setVector(newVector);
    const def = VECTOR_DEFAULTS[newVector];
    setPotentialValue(def.potentialValue);
    setOperatorFeePercent(def.operatorFeePercent);
    setOutreachMessage(def.outreachMessage);
    setContractTerms(def.contractTerms);
    if (!targetNiche || targetNiche === "Residential Roofing") {
      if (newVector === "technical_leak_audit") setTargetNiche("B2B SaaS / Financial");
      else if (newVector === "micro_sponsorship") setTargetNiche("Developer Tools Media");
      else if (newVector === "public_micro_purchase") setTargetNiche("Public University / City");
      else setTargetNiche("Residential HVAC / Roofing");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetCompany || !targetContact) {
      alert("Please fill in the Deal Title, Target Company, and Contact Person.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({
        title,
        vector,
        targetCompany,
        targetContact,
        targetEmail,
        targetPhone,
        targetNiche,
        status: "discovered",
        potentialValue,
        operatorFeePercent,
        grossTransactionValue: "0",
        realizedRevenue: "0",
        capitalSpent: "0.00",
        notes,
        outreachMessage,
        contractTerms,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Plus className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Create New $0-Capital Deal</h3>
              <p className="text-xs text-zinc-400">Initialize an opportunity into the live PostgreSQL pipeline.</p>
            </div>
          </div>

          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto space-y-4 text-xs font-mono">
          {/* Vector Selector */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-2">Select Asymmetry Vector</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleVectorChange("lead_reactivation")}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                  vector === "lead_reactivation"
                    ? "bg-emerald-950 border-emerald-500 text-emerald-300 font-bold"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                1. Ghost Lead Revival (25% Rev Share)
              </button>

              <button
                type="button"
                onClick={() => handleVectorChange("technical_leak_audit")}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                  vector === "technical_leak_audit"
                    ? "bg-cyan-950 border-cyan-500 text-cyan-300 font-bold"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                2. Technical DNS / DMARC Bounty ($350)
              </button>

              <button
                type="button"
                onClick={() => handleVectorChange("micro_sponsorship")}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                  vector === "micro_sponsorship"
                    ? "bg-purple-950 border-purple-500 text-purple-300 font-bold"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                3. Micro-Sponsorship Broker (30% Cut)
              </button>

              <button
                type="button"
                onClick={() => handleVectorChange("public_micro_purchase")}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${
                  vector === "public_micro_purchase"
                    ? "bg-amber-950 border-amber-500 text-amber-300 font-bold"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                4. Public Micro-Purchase RFP (Spread)
              </button>
            </div>
          </div>

          {/* Deal Title */}
          <div>
            <label className="block text-zinc-400 mb-1">Deal Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Roofing Austin - Inactive Inquiries Revival"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          {/* Target Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1">Target Company / Media *</label>
              <input
                type="text"
                required
                placeholder="e.g. Paramount HVAC"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Contact Person &amp; Role *</label>
              <input
                type="text"
                required
                placeholder="e.g. Robert Craig (Owner)"
                value={targetContact}
                onChange={(e) => setTargetContact(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1">Target Email</label>
              <input
                type="email"
                placeholder="contact@company.com"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Target Phone</label>
              <input
                type="text"
                placeholder="+1 (555) 000-0000"
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Niche / Industry</label>
              <input
                type="text"
                placeholder="e.g. Commercial Roofing"
                value={targetNiche}
                onChange={(e) => setTargetNiche(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>
          </div>

          {/* Financials */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
            <div>
              <label className="block text-zinc-400 mb-1">Estimated Pipeline Value ($)</label>
              <input
                type="number"
                value={potentialValue}
                onChange={(e) => setPotentialValue(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-cyan-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Operator Fee Rate (%)</label>
              <input
                type="number"
                value={operatorFeePercent}
                onChange={(e) => setOperatorFeePercent(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-purple-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Outreach Script */}
          <div>
            <label className="block text-zinc-400 mb-1">Outreach Script</label>
            <textarea
              rows={4}
              value={outreachMessage}
              onChange={(e) => setOutreachMessage(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-emerald-500 leading-relaxed text-xs"
            />
          </div>

          {/* Initial Notes */}
          <div>
            <label className="block text-zinc-400 mb-1">Notes &amp; Context</label>
            <textarea
              rows={2}
              placeholder="Source, discovery details, initial observations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
