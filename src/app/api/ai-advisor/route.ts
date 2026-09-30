import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { niche, location, targetModel, skillFocus } = body;

    const cleanNiche = niche || "Commercial Solar Installation";
    const cleanLocation = location || "National / Remote";

    // Generate dynamic tailor-made strategy
    const generatedStrategy = {
      title: `${cleanNiche} $0-Capital Asymmetry Attack Vector`,
      targetProfile: `High-volume operators in ${cleanNiche} located in ${cleanLocation} with 20+ public reviews and active lead-gen ads.`,
      asymmetryDiscovery: `Operators in ${cleanNiche} spend between $180 - $450 per acquisition lead. Over the preceding 12-18 months, their CRM accumulates 400 to 2,500 qualified prospects who requested quotes but did not convert. These leads represent roughly $80,000 to $350,000 in unharvested pipeline value that the owner currently writes off as $0.`,
      purePerformanceProposition: `Offer a zero-risk revival sprint: 'We re-engage your inactive leads over 72 hours at $0 cost to you. You keep 80%, we take a 20% performance fee only when a client signs and pays you.'`,
      financialProjections: {
        typicalListSize: "850 dormant leads",
        expectedReplyRate: "3.2% (~27 warm responses)",
        qualifiedEstimatesBooked: "8 to 12 booked consultations",
        closedDeals: "2 to 4 completed contracts",
        averageDealValue: "$6,500 - $14,000",
        grossRevenueGenerated: "$19,500 - $42,000",
        operatorNetCommission: "$3,900 - $8,400 (at 20% contingency)",
        capitalRequired: "$0.00",
        fulfillmentTime: "3 to 5 hours",
      },
      actionSteps: [
        `Step 1: Scrape / compile 15 top ${cleanNiche} businesses in ${cleanLocation} using Google Maps and LinkedIn.`,
        "Step 2: Send the 3-sentence 'Found Money' outreach script to the Founder / Operations Director.",
        "Step 3: Once they respond, countersign the standard 1-page Contingency Agreement.",
        "Step 4: Receive export of older unconverted leads (CSV).",
        "Step 5: Run the 3-touch high-converting SMS/Email sequence via Make.com or client's own CRM tool.",
        "Step 6: Route all positive replies to client's scheduling link.",
        "Step 7: Issue invoice for 20% fee upon client closing sales.",
      ],
      customOutreachScript: `Subject: Quick question regarding older ${cleanNiche} inquiries\n\nHi {{OwnerName}},\n\nI noticed your team handles substantial volume in ${cleanLocation}. You've likely invested tens of thousands into advertising over the last year.\n\nWhat is your team currently doing with the 500-1,500 past leads who inquired but didn't end up moving forward?\n\nMost ${cleanNiche} companies leave $30k-$75k on the table in dormant inquiries. We run a 3-day reactivation sprint that books 5-10 qualified estimates directly into your calendar with zero ad spend.\n\nWe work on 100% contingency: we take a 20% fee only AFTER you collect revenue. If you make $0, it costs you $0.\n\nAre you open to reviewing the 3-message sequence we use?`,
      contingencyClause: `CONTINGENCY CLAUSE: Client agrees to remit 20% of gross collected revenue from any customer whose contact information was included in the provided inactive lead registry and who executes a signed agreement within sixty (60) days of campaign deployment. Consultant warrants $0 upfront fee and zero recurring subscription charges.`,
    };

    return NextResponse.json({ success: true, strategy: generatedStrategy });
  } catch (error) {
    console.error("AI Advisor generation error:", error);
    return NextResponse.json({ success: false, error: "Advisor generation failed" }, { status: 500 });
  }
}
