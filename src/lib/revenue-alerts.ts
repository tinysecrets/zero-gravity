export async function sendRevenueAlert(input: {
  amount: string;
  currency: string;
  opportunityId: number | null;
  referenceCode?: string;
  clientName?: string;
  serviceDescription?: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  const recipient = process.env.REVENUE_ALERT_EMAIL;
  if (!key || !from || !recipient) return { sent: false, reason: "Revenue alert email is not configured." };
  if (!/^\S+@\S+\.\S+$/.test(from) || !/^\S+@\S+\.\S+$/.test(recipient)) {
    return { sent: false, reason: "Revenue alert addresses are invalid." };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(8_000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: `Payment verified: $${input.amount} ${input.currency.toUpperCase()}`,
        text: [
          "Zero Gravity payment verified.",
          `Amount: $${input.amount} ${input.currency.toUpperCase()}`,
          `Opportunity: ${input.opportunityId ?? "direct payment"}`,
          input.clientName ? `Client: ${input.clientName}` : "",
          input.serviceDescription ? `Service: ${input.serviceDescription}` : "",
          input.referenceCode ? `Reference: ${input.referenceCode}` : "",
          "Stripe has authenticated the payment event. This is customer payment, not a bank payout.",
        ].filter(Boolean).join("\n"),
      }),
    });
    if (!response.ok) return { sent: false, reason: `Alert provider returned ${response.status}.` };
    return { sent: true };
  } catch {
    return { sent: false, reason: "Revenue alert delivery failed; payment remains recorded." };
  }
}
