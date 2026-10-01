import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function cleanInput(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/[\r\n\t]+/g, " ").slice(0, 120);
  return cleaned || fallback;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const niche = cleanInput(body.niche, "a service industry");
    const location = cleanInput(body.location, "a location to be selected");

    // This endpoint creates a generic worksheet only. It does not browse, query
    // market data, identify prospects, or calculate revenue assumptions.
    const strategy = {
      title: `Research worksheet: ${niche}`,
      targetProfile: `Proposed research scope: learn whether a specific, authorized ${niche} business in ${location} has a documented need. No business or prospect has been searched for or verified.`,
      researchQuestion: `What primary evidence would show that an identified ${niche} business in ${location} has a current need, is authorized to discuss it, and has agreed to the proposed scope? Public information alone may not answer these questions.`,
      offerBoundary: "Do not quote a result, fee, savings amount, conversion rate, or delivery time until evidence, scope, costs, and responsibilities are reviewed with the customer. Any payment is voluntary and depends on the customer's agreement and completed payment.",
      actionSteps: [
        "Identify a real organization from a reliable source and confirm that the intended contact is authorized to discuss the matter.",
        "Collect primary evidence for the specific need; distinguish observed facts from assumptions and record source dates.",
        "Confirm data rights, privacy requirements, and permission before using personal, CRM, or customer information.",
        "Prepare a draft scope that lists deliverables, exclusions, dependencies, approval steps, costs, and an evidence-based schedule.",
        "Have the customer review the scope, price, and terms in writing. Do not start work or create an invoice based only on this worksheet.",
        "If the customer accepts, use the approved payment method. Count a receipt only after a verified live settlement; reconcile fees, refunds, disputes, and payouts separately.",
      ],
      customOutreachScript: `Subject: Question about {{verified_topic}}\n\nHi {{Name}},\n\nI am researching whether {{Business}} has a current need related to {{verified_topic}}. I have not reviewed your internal records and do not want to assume a problem or result.\n\nIf this is relevant, would you be open to a brief conversation about the evidence, scope, and any applicable requirements? If not, let me know and I will stop contacting you about this.\n\n{{SenderName}}\n{{BusinessAddress}}\n{{OptOutInstructions}}`,
      scopeChecklist: "DISCUSSION CHECKLIST — NOT A CONTRACT OR LEGAL ADVICE\n\nCustomer and authorized representative: [Verify]\nObserved need and evidence source/date: [Document]\nScope and deliverables: [Specify]\nExclusions, dependencies, and acceptance criteria: [Specify]\nCustomer data and permissions: [Document lawful basis, access, retention, and deletion]\nFee, expenses, taxes, payment trigger, and refund terms: [Agree in writing]\nSchedule and customer approvals: [Set from verified constraints]\nTermination, liability, and dispute process: [Have qualified counsel review]\n\nNo customer, engagement, price, result, or payment is implied by this worksheet.",
    };

    return NextResponse.json({ success: true, strategy });
  } catch (error) {
    console.error("Strategy worksheet generation error:", error);
    return NextResponse.json({ success: false, error: "Could not create planning draft." }, { status: 500 });
  }
}
