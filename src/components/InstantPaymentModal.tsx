"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  DollarSign,
  Zap,
  CreditCard,
  Check,
  Copy,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Building2,
  Lock,
  AlertTriangle,
  Settings2,
} from "lucide-react";
import { Opportunity } from "@/types";

interface InstantPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  deals: Opportunity[];
  onPaymentRequestCreated: () => Promise<void>;
  defaultDeal?: Opportunity | null;
}

interface PaymentRequestResponse {
  referenceCode: string;
  status: string;
  amount: string;
  checkoutUrl?: string;
}

export function InstantPaymentModal({
  isOpen,
  onClose,
  deals,
  onPaymentRequestCreated,
  defaultDeal,
}: InstantPaymentModalProps) {
  if (!isOpen) return null;
  return (
    <InstantPaymentModalInner
      onClose={onClose}
      deals={deals}
      onPaymentRequestCreated={onPaymentRequestCreated}
      defaultDeal={defaultDeal}
    />
  );
}

function InstantPaymentModalInner({
  onClose,
  deals,
  onPaymentRequestCreated,
  defaultDeal,
}: {
  onClose: () => void;
  deals: Opportunity[];
  onPaymentRequestCreated: () => Promise<void>;
  defaultDeal?: Opportunity | null;
}) {
  const initialDeal = useMemo(
    () => defaultDeal || deals.find((deal) => deal.status !== "revenue_collected") || deals[0] || null,
    [defaultDeal, deals]
  );
  const [selectedDealId, setSelectedDealId] = useState(initialDeal ? String(initialDeal.id) : "");
  const [clientName, setClientName] = useState(initialDeal?.targetCompany || "");
  const [serviceType, setServiceType] = useState(initialDeal?.title || "Professional services");
  const [amount, setAmount] = useState(
    initialDeal
      ? String(
          Math.max(
            1,
            Math.round(
              parseFloat(initialDeal.potentialValue || "0") *
                (parseFloat(initialDeal.operatorFeePercent || "25") / 100)
            )
          )
        )
      : ""
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    paymentRequest: PaymentRequestResponse;
    providerConfigured: boolean;
    message: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDispatch, setCopiedDispatch] = useState(false);

  const handleDealSelectChange = (dealId: string) => {
    setSelectedDealId(dealId);
    const deal = deals.find((item) => String(item.id) === dealId);
    if (!deal) return;
    setClientName(deal.targetCompany);
    setServiceType(deal.title);
    setAmount(
      String(
        Math.max(
          1,
          Math.round(
            parseFloat(deal.potentialValue || "0") *
              (parseFloat(deal.operatorFeePercent || "25") / 100)
          )
        )
      )
    );
  };

  const handleCreateCheckout = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsProcessing(true);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: selectedDealId || null,
          amount,
          clientName,
          serviceType,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Checkout session could not be created.");
      }

      setResult({
        paymentRequest: data.paymentRequest,
        providerConfigured: data.providerConfigured,
        message: data.message,
      });
      await onPaymentRequestCreated();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Checkout session could not be created.");
    } finally {
      setIsProcessing(false);
    }
  };

  const dispatchText = result
    ? `Invoice ${result.paymentRequest.referenceCode}\n${serviceType}\nAmount due: $${Number(result.paymentRequest.amount).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} USD\n\nPay securely by card using this Stripe Checkout link:\n${result.paymentRequest.checkoutUrl || "[Stripe is not configured yet]"}\n\nThank you.`
    : "";

  const copyText = (text: string, type: "link" | "dispatch") => {
    navigator.clipboard.writeText(text);
    if (type === "link") {
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedDispatch(true);
      window.setTimeout(() => setCopiedDispatch(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md">
      <div className="my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 p-2 text-emerald-400">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                Secure Checkout Dispatch
                <span className="rounded border border-cyan-800 bg-cyan-950 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                  STRIPE-HOSTED
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Create a Stripe Checkout request. Gross receipts are recorded only after a signed live payment event.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          <div className="space-y-5 p-6 font-mono text-xs">
            {result.providerConfigured ? (
              <>
                <div className="space-y-3 rounded-2xl border border-cyan-800/80 bg-cyan-950/25 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-cyan-200">
                      <ShieldCheck className="h-5 w-5 text-cyan-400" />
                      Secure Checkout Generated
                    </div>
                    <span className="rounded bg-cyan-900 px-2.5 py-0.5 text-[11px] font-bold text-cyan-100">
                      {result.paymentRequest.referenceCode}
                    </span>
                  </div>
                  <div className="border-t border-cyan-900/60 pt-3 text-zinc-300">
                    <span className="text-zinc-500">Amount requested: </span>
                    <span className="text-xl font-black text-white">
                      ${Number(result.paymentRequest.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-cyan-100/75">
                    This is an unpaid checkout request—not a cash receipt. The CRM and ledger will update only after Stripe confirms payment through the webhook.
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-bold text-zinc-300">
                      <CreditCard className="h-4 w-4 text-cyan-400" />
                      Stripe Checkout URL
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyText(result.paymentRequest.checkoutUrl || "", "link")}
                        className="flex cursor-pointer items-center gap-1 rounded bg-zinc-800 px-2.5 py-1 text-[11px] text-cyan-300 transition hover:bg-zinc-700"
                      >
                        {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedLink ? "Copied" : "Copy"}
                      </button>
                      <a
                        href={result.paymentRequest.checkoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 rounded bg-cyan-600 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-cyan-500"
                      >
                        Open <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                  <div className="break-all rounded border border-zinc-800 bg-zinc-950 p-2.5 text-[11px] text-cyan-300">
                    {result.paymentRequest.checkoutUrl}
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-bold text-zinc-300">
                      <Building2 className="h-4 w-4 text-emerald-400" />
                      Client Dispatch Message
                    </span>
                    <button
                      onClick={() => copyText(dispatchText, "dispatch")}
                      className="flex cursor-pointer items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-emerald-500"
                    >
                      {copiedDispatch ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedDispatch ? "Copied" : "Copy Message"}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    rows={7}
                    value={dispatchText}
                    className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-[11px] leading-relaxed text-zinc-300 outline-none"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-4 rounded-2xl border border-amber-800/80 bg-amber-950/25 p-5">
                <div className="flex items-center gap-2 text-amber-300">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm font-bold">Stripe Connection Required</span>
                </div>
                <p className="leading-relaxed text-amber-100/80">{result.message}</p>
                <div className="rounded-lg border border-amber-900/60 bg-zinc-950 p-3 text-zinc-400">
                  Request {result.paymentRequest.referenceCode} is saved as a draft. No link was sent, no charge was created, and no revenue was recorded.
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-[11px] leading-relaxed text-zinc-400">
                  Deployment configuration: set <code className="text-amber-300">STRIPE_SECRET_KEY</code>, <code className="text-amber-300">STRIPE_WEBHOOK_SECRET</code>, and optionally <code className="text-amber-300">NEXT_PUBLIC_APP_URL</code>. Point the Stripe webhook endpoint to <code className="text-amber-300">/api/payments/webhook</code>.
                </div>
              </div>
            )}

            <div className="flex justify-end border-t border-zinc-800 pt-4">
              <button onClick={onClose} className="cursor-pointer rounded-lg bg-zinc-800 px-4 py-2 font-bold text-white transition hover:bg-zinc-700">
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateCheckout} className="space-y-5 p-6 font-mono text-xs">
            <div>
              <label className="mb-1 block font-bold text-zinc-400">Link to opportunity (optional)</label>
              <select
                value={selectedDealId}
                onChange={(event) => handleDealSelectChange(event.target.value)}
                className="w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-sans text-zinc-200 outline-none focus:border-emerald-500"
              >
                <option value="">Standalone invoice</option>
                {deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    #{deal.id} · {deal.targetCompany} · {deal.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-bold text-zinc-400">Client / entity *</label>
                <input
                  required
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="Client company"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-sans text-white outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-zinc-400">Amount due (USD) *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                  <input
                    required
                    type="number"
                    min="0.01"
                    max="999999.99"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="350.00"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 pl-8 pr-3 text-sm font-bold text-emerald-400 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-bold text-zinc-400">Service / deliverable *</label>
              <input
                required
                value={serviceType}
                onChange={(event) => setServiceType(event.target.value)}
                placeholder="Deliverability remediation"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-sans text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-3 text-[11px] leading-relaxed text-zinc-300">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
              <p>
                The client pays on Stripe’s hosted checkout page. A Checkout Session is only an invoice request; this app records revenue after a verified Stripe webhook, not when a link is generated.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <button type="button" onClick={onClose} className="cursor-pointer rounded-lg bg-zinc-800 px-4 py-2 font-bold text-zinc-300 transition hover:bg-zinc-700">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? "Creating secure checkout..." : "Generate secure checkout"}
                {!isProcessing && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
