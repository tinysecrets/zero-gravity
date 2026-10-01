"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";

interface PaymentConfirmationClientProps {
  sessionId?: string;
}

interface PaymentStatus {
  referenceCode: string;
  status: string;
  amount: string;
  currency: string;
  serviceDescription: string;
  paidAt: string | null;
  livemode: boolean;
}

export function PaymentConfirmationClient({ sessionId }: PaymentConfirmationClientProps) {
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState(sessionId ? "" : "The Stripe Checkout session reference is missing.");
  const [isChecking, setIsChecking] = useState(Boolean(sessionId));

  useEffect(() => {
    if (!sessionId) return;

    let attempts = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/payments?session_id=${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (cancelled) return;

        if (!data.success) {
          setError(data.error || "The payment request could not be found.");
          setIsChecking(false);
          return;
        }

        setPayment(data.payment);
        if (data.payment.status === "paid" || attempts >= 9) {
          setIsChecking(false);
          return;
        }

        attempts += 1;
        timeout = setTimeout(checkStatus, 2500);
      } catch {
        if (!cancelled) {
          setError("Could not confirm the payment status right now.");
          setIsChecking(false);
        }
      }
    };

    checkStatus();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [sessionId]);

  const isPaid = payment?.status === "paid";

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 py-10 text-zinc-100">
      <section className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/70 p-7 shadow-2xl">
        <div className={`mb-5 inline-flex rounded-xl p-3 ${isPaid ? "bg-emerald-500/15 text-emerald-400" : "bg-cyan-500/15 text-cyan-400"}`}>
          {isPaid ? <CheckCircle2 className="h-7 w-7" /> : <Clock3 className="h-7 w-7" />}
        </div>

        {error ? (
          <>
            <h1 className="text-2xl font-bold text-white">We could not confirm this payment</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{error}</p>
          </>
        ) : isPaid ? (
          <>
            <h1 className="text-2xl font-bold text-white">{payment.livemode ? "Payment confirmed" : "Test payment confirmed"}</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              {payment.livemode
                ? "Stripe’s signed webhook confirmed the customer payment and posted it to the verified ledger. Bank payouts are managed separately in Stripe."
                : "Stripe confirmed a test payment. No real funds were received and no verified revenue was recorded."}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white">Checkout received</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              We are waiting for Stripe’s signed payment event before recording revenue. Do not treat this as paid until the status changes to confirmed.
            </p>
          </>
        )}

        {payment && (
          <div className="mt-6 space-y-2 rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs">
            <div className="flex justify-between gap-4"><span className="text-zinc-500">Reference</span><span className="text-zinc-200">{payment.referenceCode}</span></div>
            <div className="flex justify-between gap-4"><span className="text-zinc-500">Amount</span><span className="font-bold text-emerald-400">${Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {payment.currency.toUpperCase()}</span></div>
            <div className="flex justify-between gap-4"><span className="text-zinc-500">Payment status</span><span className={isPaid ? "font-bold text-emerald-400" : "font-bold text-cyan-400"}>{payment.status.replace(/_/g, " ").toUpperCase()}</span></div>
          </div>
        )}

        {isChecking && (
          <div className="mt-5 flex items-center gap-2 text-xs text-cyan-300"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Checking signed payment status...</div>
        )}

        <Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700">
          <ArrowLeft className="h-4 w-4" /> Return to Zero Gravity
        </Link>
      </section>
    </main>
  );
}
