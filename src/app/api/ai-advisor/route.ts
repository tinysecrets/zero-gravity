import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AdvisorStrategy = {
  title: string;
  targetProfile: string;
  researchQuestion: string;
  offerBoundary: string;
  actionSteps: string[];
  customOutreachScript: string;
  scopeChecklist: string;
};

type GenerationMode = "ai" | "template";

function cleanInput(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/[\r\n\t]+/g, " ").slice(0, 120);
  return cleaned || fallback;
}

function boundedText(value: unknown, fallback: string, max = 2400): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/\u0000/g, "").trim().slice(0, max);
  return cleaned || fallback;
}

function boundedSteps(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const steps = value
    .filter((step): step is string => typeof step === "string")
    .map((step) => step.replace(/\u0000/g, "").trim().slice(0, 600))
    .filter(Boolean)
    .slice(0, 8);
  return steps.length > 0 ? steps : fallback;
}

function templateStrategy(niche: string, location: string): AdvisorStrategy {
  return {
    title: `Research worksheet: ${niche}`,
    targetProfile: `Research scope: determine whether a specific, authorized ${niche} business in ${location} has a documented need. No business or prospect has been searched for or verified by this worksheet.`,
    researchQuestion: `What primary evidence would show that an identified ${niche} business in ${location} has a current need, that the intended contact can discuss it, and that the business wants to consider the proposed scope? Public information alone may not answer these questions.`,
    offerBoundary: "Do not quote a result, fee, savings amount, conversion rate, or delivery time until the evidence, scope, costs, and responsibilities are reviewed with the customer. Payment is voluntary and depends on an agreed scope and a verified completed payment.",
    actionSteps: [
      "Identify a real organization from a reliable source and confirm that the intended contact is authorized to discuss the issue.",
      "Collect primary evidence for the specific need; distinguish observed facts from assumptions and record source dates.",
      "For website issues, test only public endpoints and document DNS, TLS, mail, forms, checkout, or uptime observations without inferring lost revenue from a technical signal alone.",
      "Confirm data rights, privacy requirements, and permission before using personal, CRM, or customer information.",
      "Draft a scope that lists deliverables, exclusions, dependencies, approval steps, costs, and a schedule based on the verified work.",
      "Have the customer review the scope, price, and terms in writing. Do not start work or create an invoice based only on this worksheet.",
      "Count a receipt only after a verified live settlement; reconcile fees, refunds, disputes, and payouts separately.",
    ],
    customOutreachScript: "Subject: Question about {{verified_topic}}\n\nHi {{Name}},\n\nI am researching whether {{Business}} has a current need related to {{verified_topic}}. I have not reviewed your internal records and do not want to assume a problem or result.\n\nIf this is relevant, would you be open to a brief conversation about the evidence, scope, and any applicable requirements? If not, let me know and I will stop contacting you about this.\n\n{{SenderName}}\n{{BusinessAddress}}\n{{OptOutInstructions}}",
    scopeChecklist: "DISCUSSION CHECKLIST — NOT A CONTRACT OR LEGAL ADVICE\n\nCustomer and authorized representative: [Verify]\nObserved need and evidence source/date: [Document]\nScope and deliverables: [Specify]\nExclusions, dependencies, and acceptance criteria: [Specify]\nCustomer data and permissions: [Document lawful basis, access, retention, and deletion]\nFee, expenses, taxes, payment trigger, and refund terms: [Agree in writing]\nSchedule and customer approvals: [Set from verified constraints]\nTermination, liability, and dispute process: [Have qualified counsel review]\n\nNo customer, engagement, price, result, or payment is implied by this worksheet.",
  };
}

function mergeStrategy(candidate: unknown, fallback: AdvisorStrategy): AdvisorStrategy | null {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  const value = candidate as Record<string, unknown>;
  return {
    title: boundedText(value.title, fallback.title, 160),
    targetProfile: boundedText(value.targetProfile, fallback.targetProfile, 1800),
    researchQuestion: boundedText(value.researchQuestion, fallback.researchQuestion, 1800),
    offerBoundary: boundedText(value.offerBoundary, fallback.offerBoundary, 1800),
    actionSteps: boundedSteps(value.actionSteps, fallback.actionSteps),
    customOutreachScript: boundedText(value.customOutreachScript, fallback.customOutreachScript, 2600),
    scopeChecklist: boundedText(value.scopeChecklist, fallback.scopeChecklist, 2600),
  };
}

function parseModelJson(text: string): unknown {
  const stripped = text.trim()
    .replace(/^\u0060{3}(?:json)?\s*/i, "")
    .replace(/\s*\u0060{3}\s*$/, "");
  return JSON.parse(stripped);
}

async function generateStrategy(
  niche: string,
  location: string,
  fallback: AdvisorStrategy,
): Promise<{ strategy: AdvisorStrategy; mode: GenerationMode; model?: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return { strategy: fallback, mode: "template" };

  const model = process.env.AI_ADVISOR_MODEL?.trim() || "nvidia/nemotron-3.5-lightning:free";
  const baseUrl = (process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
  const schemaInstruction = [
    "Return only a valid JSON object with these keys:",
    "title, targetProfile, researchQuestion, offerBoundary, actionSteps (array of strings),",
    "customOutreachScript, scopeChecklist.",
    "Create a strong, specific, practical work plan for the requested business niche and location.",
    "Focus on discovering and validating real business problems, including measurable website and revenue-flow issues where relevant.",
    "Do not claim you browsed, tested a site, found a prospect, verified a defect, or measured revenue unless that action and evidence are explicitly supplied in the user message.",
    "Do not invent business names, contacts, prices, conversion rates, revenue losses, customer approvals, or results.",
    "Make the plan action-oriented: research, evidence capture, validation, proposal, owner review, follow-through, and outcome measurement.",
    "The outreach must be a draft for a human to review, include opt-out wording, and use placeholders for unverified facts.",
    "Do not change user-selected models or provider hierarchy. Avoid generic disclaimers; state concrete unknowns and next actions.",
  ].join(" ");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL || "https://zero-gravity-smoky.vercel.app",
      "X-Title": "Wah-Lah Industries Zero Gravity",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: schemaInstruction },
        { role: "user", content: JSON.stringify({ niche, location, requestedOutput: fallback }) },
      ],
      temperature: 0.25,
      max_tokens: 1800,
    }),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });

  if (!response.ok) {
    // Don't log provider body text, prompts, or credential-bearing request details.
    console.warn("AI advisor provider returned a non-success status:", response.status);
    return { strategy: fallback, mode: "template", model };
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  const text = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((part) => typeof part?.text === "string" ? part.text : "").join("\n")
      : "";
  if (!text.trim()) return { strategy: fallback, mode: "template", model };

  try {
    const parsed = parseModelJson(text);
    const strategy = mergeStrategy(parsed, fallback);
    return strategy
      ? { strategy, mode: "ai", model }
      : { strategy: fallback, mode: "template", model };
  } catch {
    console.warn("AI advisor provider returned an unparseable strategy; using the verified template.");
    return { strategy: fallback, mode: "template", model };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const niche = cleanInput(body.niche, "a service industry");
    const location = cleanInput(body.location, "a location to be selected");
    const fallback = templateStrategy(niche, location);
    const result = await generateStrategy(niche, location, fallback);
    return NextResponse.json({
      success: true,
      strategy: result.strategy,
      generation: { mode: result.mode, ...(result.model ? { model: result.model } : {}) },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Strategy worksheet generation error:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ success: false, error: "Could not create planning draft." }, { status: 500 });
  }
}
