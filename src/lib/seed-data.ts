export interface SeedPlaybook {
  slug: string;
  title: string;
  vector: string;
  tagline: string;
  capitalRequired: string;
  avgTimeToFirstDollar: string;
  avgDealSize: string;
  scalabilityRating: string;
  barrierToEntry: string;
  coreMechanism: string;
  stepByStepExecution: string[];
  freeToolsUsed: string;
  scriptsAndTemplates: {
    coldPitch: string;
    followUp: string;
    contingencyAgreement: string;
    deliveryTemplate: string;
  };
  riskMitigation: string;
}

const NOT_ESTIMATED = "Not estimated";

export const SEED_PLAYBOOKS: SeedPlaybook[] = [
  {
    slug: "dead-lead-revival",
    title: "Client-Authorized Inquiry Re-engagement",
    vector: "lead_reactivation",
    tagline: "A planning checklist for evaluating a permission-based follow-up project. It does not imply a client, lead list, or expected result.",
    capitalRequired: "Varies by scope; not verified",
    avgTimeToFirstDollar: NOT_ESTIMATED,
    avgDealSize: NOT_ESTIMATED,
    scalabilityRating: "Depends on authorization, data quality, and capacity",
    barrierToEntry: "Requires client authority, lawful data use, and written scope",
    coreMechanism: "A business may choose to contact people who previously inquired, but eligibility, consent, retention rules, contact details, and current intent must be verified by the data owner. A lead count does not establish likely sales or revenue. Any service fee and success criteria must be agreed in writing; no outcome or timing is assured.",
    stepByStepExecution: [
      "Confirm the business identity and speak with an authorized decision-maker; do not imply that a CRM or customer list has been reviewed.",
      "Ask the data owner to document the source, lawful basis, consent or other applicable permission, retention period, and any suppression or opt-out records.",
      "Agree in writing on the permitted data fields, access method, campaign scope, responsibilities, fee, and stop conditions before receiving personal data.",
      "Have the client review each message for factual accuracy and applicable email, privacy, and telemarketing requirements before any contact is made.",
      "Use only the client's approved systems and approved recipients; honor opt-outs and stop requests promptly.",
      "Report observed replies and completed work accurately. Record revenue only after the customer's own payment is independently confirmed.",
    ],
    freeToolsUsed: "Use the client's approved CRM and communication tools where authorized. Pricing and access terms vary; no free-tier availability is assumed.",
    scriptsAndTemplates: {
      coldPitch: "Subject: Question about customer follow-up\n\nHi {{Name}},\n\nI am exploring whether a permission-based follow-up project could be useful for {{Business}}. I have not reviewed your customer records and cannot estimate a result from public information.\n\nIf this is relevant, we could first discuss your data permissions, scope, responsibilities, and fee in writing. There is no promised outcome or timeline.\n\nWould you be open to a short conversation?\n\n{{SenderName}}\n{{BusinessAddress}}\n{{OptOutInstructions}}",
      followUp: "Hi {{Name}},\n\nI am following up once on my note about a possible customer follow-up project. If it is not relevant, no reply is needed and I will not contact you again about it.\n\n{{SenderName}}",
      contingencyAgreement: "DISCUSSION DRAFT — NOT LEGAL ADVICE\n\nParties: [Consultant] and [Client]\nScope: [Describe the authorized work and systems]\nData authority and permitted use: [Document the client's authority, lawful basis, allowed fields, retention, security, and deletion instructions]\nFee and payment trigger: [Define the fee, calculation, evidence, and due date]\nResponsibilities and exclusions: [Define review, approvals, stop conditions, and work not included]\nTerm and termination: [Define]\n\nHave qualified counsel review and adapt this document before signing. No customer result is guaranteed.",
      deliveryTemplate: "CLIENT-APPROVED WORK LOG\n\nProject and written authorization: [Reference]\nApproved data source and permitted fields: [Reference]\nMessages approved by client: [Reference]\nSuppression / opt-out checks completed: [Describe]\nWork performed and dates: [Describe]\nObserved replies or outcomes: [Report only what was observed]\nCustomer payments: [Record only provider-confirmed or reconciled amounts]\nOpen issues and deletion date: [Describe]",
    },
    riskMitigation: "Do not obtain, export, or contact people using customer data without documented authority and a valid lawful basis. Follow applicable privacy, email, telemarketing, and opt-out rules. This template is not legal advice.",
  },
  {
    slug: "technical-leak-audit",
    title: "Public DNS Configuration Review",
    vector: "technical_leak_audit",
    tagline: "Review selected public DNS records and document their limits. DNS observations alone do not prove a deliverability problem or lost sales.",
    capitalRequired: "Varies by scope; not verified",
    avgTimeToFirstDollar: NOT_ESTIMATED,
    avgDealSize: NOT_ESTIMATED,
    scalabilityRating: "Depends on verification, technical review, and capacity",
    barrierToEntry: "Requires careful interpretation and owner authorization for changes",
    coreMechanism: "Public DNS lookups can show whether selected SPF, DKIM, DMARC, or MX records are published. They cannot establish actual inbox placement, authorized sending systems, customer impact, or revenue losses. Any remediation requires a separate review of the domain owner's systems and explicit approval.",
    stepByStepExecution: [
      "Confirm the domain spelling and the intended scope of a public-record check.",
      "Record the DNS provider, query time, response, and any lookup failures; treat inconclusive responses as unknown rather than missing records.",
      "Describe observed records without claiming that messages are being filtered, that revenue is being lost, or that a specific fix is required.",
      "Ask the domain owner to identify authorized senders and consult provider documentation before proposing a change.",
      "Agree in writing on scope, fee, access, backups, approval, testing, and rollback before any configuration change.",
      "Verify only the approved change and document remaining limitations. Do not promise inbox placement or a particular financial result.",
    ],
    freeToolsUsed: "Public DNS lookup tools and provider documentation may help with initial review. Tool availability, terms, and costs vary.",
    scriptsAndTemplates: {
      coldPitch: "Subject: Public DNS observations for {{Domain}}\n\nHi {{Name}},\n\nI reviewed selected public DNS records for {{Domain}} on {{Date}}. The observations are: {{List only observed records and lookup limitations}}.\n\nThese checks do not establish inbox placement, lost inquiries, revenue impact, or the correct configuration for your systems. If useful, I can discuss a scoped review after confirming your authorized senders. No changes have been made.\n\n{{SenderName}}\n{{BusinessAddress}}\n{{OptOutInstructions}}",
      followUp: "Hi {{Name}},\n\nFollowing up once on the public DNS observations I sent for {{Domain}}. The check is informational only; no configuration changes were made. If you would rather not receive another note, let me know and I will stop.\n\n{{SenderName}}",
      contingencyAgreement: "TECHNICAL REVIEW SCOPE — DISCUSSION DRAFT, NOT LEGAL ADVICE\n\nDomain and authorized owner: [Identify]\nRecords and systems included: [Specify]\nExcluded systems and testing: [Specify]\nFee and payment terms: [Agree in writing]\nAccess and change approval: No changes without explicit written authorization from an authorized domain owner.\nTesting, rollback, and limitations: [Specify]\n\nThis review does not guarantee deliverability, security, revenue, or a particular outcome. Have qualified counsel review contract terms.",
      deliveryTemplate: "PUBLIC DNS REVIEW\n\nDomain: {{Domain}}\nQuery time and source: {{DateAndSource}}\nObserved SPF: {{ObservedValueOrUnknown}}\nObserved DKIM: {{ObservedValueOrUnknown}}\nObserved DMARC: {{ObservedValueOrUnknown}}\nObserved MX: {{ObservedValueOrUnknown}}\nLimitations: Public DNS alone cannot establish inbox placement, sender authorization, loss, or customer impact.\nAuthorized changes performed: {{NoneOrDocumentWrittenApproval}}",
    },
    riskMitigation: "Do not publish DNS changes or access accounts without documented authority, an agreed scope, backups, and a rollback plan. Avoid claims about lost revenue, guaranteed inbox placement, or fixed resolution times.",
  },
  {
    slug: "micro-sponsorship-arbitrage",
    title: "Newsletter Sponsorship Planning Worksheet",
    vector: "micro_sponsorship",
    tagline: "A checklist for exploring a potential sponsorship only after the publisher and advertiser verify audience data and terms.",
    capitalRequired: "Varies by scope; not verified",
    avgTimeToFirstDollar: NOT_ESTIMATED,
    avgDealSize: NOT_ESTIMATED,
    scalabilityRating: "Depends on publisher approval, audience evidence, and advertiser demand",
    barrierToEntry: "Requires accurate audience evidence and written permissions",
    coreMechanism: "A publisher may choose to sell sponsorship inventory. Subscriber counts, delivery, engagement, pricing, advertiser demand, and permissions must be verified with the publisher and advertiser. A modelled rate card is not a booking, an invoice, or a payment. This app does not distribute sponsor payments or publisher payouts.",
    stepByStepExecution: [
      "Obtain the publisher's permission to discuss or represent specific inventory; do not claim to represent a publication without written authority.",
      "Verify audience and engagement metrics from current, publisher-supplied records and disclose how they were measured.",
      "Ask the advertiser to confirm campaign goals, audience fit, creative requirements, exclusions, and budget.",
      "Document placements, dates, cancellation rules, approval rights, fees, and payment responsibilities in writing.",
      "Obtain editorial approval for final creative and clearly identify advertising or sponsored content to readers.",
      "Report delivery using the publisher's records. Reconcile sponsor receipts and any publisher payment separately; this app does not send payouts.",
    ],
    freeToolsUsed: "Use publisher-provided analytics and approved planning documents. Advertising, analytics, and payment service costs vary.",
    scriptsAndTemplates: {
      coldPitch: "Subject: Sponsorship availability inquiry for {{PublicationName}}\n\nHi {{Name}},\n\nAre you currently considering sponsorship inquiries for {{PublicationName}}? I have not verified audience metrics or reserved any placement.\n\nIf you are interested, we can discuss current audience evidence, editorial approval, inventory, terms, and any representation permission before making an offer to an advertiser. No placement or result is promised.\n\n{{SenderName}}\n{{BusinessAddress}}\n{{OptOutInstructions}}",
      followUp: "Hi {{Name}},\n\nFollowing up once on my sponsorship inquiry. If you are not interested, no reply is needed and I will not follow up again.\n\n{{SenderName}}",
      contingencyAgreement: "SPONSORSHIP TERMS — DISCUSSION DRAFT, NOT LEGAL ADVICE\n\nPublisher and advertiser: [Identify]\nRepresentation authority: [Document, if applicable]\nInventory, dates, and creative approvals: [Specify]\nAudience metrics and measurement source: [Specify and verify]\nPrice, fee, taxes, cancellation, and payment trigger: [Agree in writing]\nPayment handling and responsibilities: [Specify; do not imply this app distributes funds]\n\nHave qualified counsel review before signing. No delivery or performance result is guaranteed.",
      deliveryTemplate: "SPONSORSHIP DELIVERY RECORD\n\nPublisher approval: [Reference]\nAdvertiser approval: [Reference]\nPlacement and dates: [Record]\nCreative and disclosure approved: [Reference]\nPublisher-reported delivery evidence: [Source and period]\nInvoice and receipt status: [Record separately]\nAny discrepancy or refund: [Record]",
    },
    riskMitigation: "Never invent subscriber, open-rate, or CPM figures. Obtain publisher authorization and current evidence; obtain advertiser approval; disclose sponsorship clearly; set payment responsibilities in writing. No third-party payout is handled here.",
  },
  {
    slug: "micro-purchase-procurement",
    title: "Public Procurement Research Checklist",
    vector: "public_micro_purchase",
    tagline: "A research checklist for reviewing a public solicitation. Thresholds, eligibility, quoting rules, and payment terms vary by buyer and must be verified.",
    capitalRequired: "Varies by scope; not verified",
    avgTimeToFirstDollar: NOT_ESTIMATED,
    avgDealSize: NOT_ESTIMATED,
    scalabilityRating: "Depends on the solicitation, eligibility, and delivery resources",
    barrierToEntry: "Requires current buyer-specific rules and accurate vendor qualifications",
    coreMechanism: "Public procurement requirements differ across agencies, jurisdictions, and purchases. A threshold or simplified process does not guarantee an award, payment, or exemption from competition. Verify current buyer instructions, vendor eligibility, conflicts, and written terms directly with the procurement authority.",
    stepByStepExecution: [
      "Locate the current solicitation or procurement notice on an official buyer source and record its date and reference number.",
      "Verify the buyer's current thresholds, quotation rules, eligibility, required registrations, insurance, and submission instructions.",
      "Confirm that the proposed vendor is qualified and authorized to make each statement in a quote; do not imply government endorsement or award.",
      "Prepare a scope, price, schedule, and assumptions that match the actual solicitation; do not insert unsupported guarantees.",
      "Submit only through the buyer's stated process and retain the exact submitted version and acknowledgment.",
      "Start work only after the authorized buyer issues an executed agreement or purchase order; follow acceptance and invoice terms.",
    ],
    freeToolsUsed: "Use official buyer procurement portals and current agency instructions. Registration, compliance, delivery, and subcontracting costs may apply.",
    scriptsAndTemplates: {
      coldPitch: "Subject: Question about {{SolicitationOrProjectReference}}\n\nHello {{ProcurementContact}},\n\nI am reviewing the published notice for {{ProjectTitle}}. Could you please confirm the applicable submission instructions, vendor eligibility requirements, and current terms at {{OfficialNoticeURL}}?\n\nI will not represent that I am an authorized purchasing representative or that an award is assured.\n\n{{SenderName}}\n{{BusinessContactInformation}}",
      followUp: "Hello {{ProcurementContact}},\n\nI am following up on my clarification question regarding {{SolicitationOrProjectReference}}. Please let me know if it should be directed elsewhere. I will follow the timeline and communication rules in the official notice.\n\n{{SenderName}}",
      contingencyAgreement: "PROCUREMENT DELIVERY TERMS — DISCUSSION DRAFT, NOT LEGAL ADVICE\n\nBuyer and vendor: [Identify]\nSolicitation or purchase-order reference: [Verify]\nScope and acceptance criteria: [Quote the authorized terms]\nPrice, schedule, invoice requirements, and payment terms: [Verify in writing]\nSubcontractors and required approvals: [Specify]\n\nNo purchase order, award, payment, or legal compliance is implied by this worksheet. Have qualified counsel review as appropriate.",
      deliveryTemplate: "PROCUREMENT SUBMISSION / DELIVERY CHECKLIST\n\nOfficial notice and version: [Reference]\nEligibility and registration verified: [Source and date]\nSubmission method and deadline: [Record]\nAuthorized quote and assumptions: [Reference]\nBuyer acknowledgment / executed agreement: [Reference]\nAcceptance evidence and invoice status: [Record]\nOpen issues: [Record]",
    },
    riskMitigation: "Verify the current notice and rules directly with the buyer. Do not fabricate vendor credentials, solicitations, purchase orders, timelines, or government approval. Do not start work before written authorization.",
  },
];

// Used only when an operator explicitly enables local demo data outside Vercel.
// It is a generic zero-value fixture, not a real prospect, client, or outcome.
export const INITIAL_OPPORTUNITIES = [
  {
    title: "DEMO ONLY — Example business opportunity",
    vector: "technical_leak_audit",
    targetCompany: "Example Business (Demo)",
    targetContact: "Demo contact",
    targetEmail: "demo@example.invalid",
    targetPhone: null,
    targetNiche: "Demo only",
    status: "discovered",
    potentialValue: "0.00",
    operatorFeePercent: "0.00",
    grossTransactionValue: "0.00",
    realizedRevenue: "0.00",
    capitalSpent: "0.00",
    notes: "Fictional local-development fixture only. No real customer, contact, audit, contract, invoice, or payment is represented.",
    outreachMessage: null,
    auditData: null,
    contractTerms: null,
    offerTier: null,
    monthlyPrice: null,
    acquisitionSource: "local_demo_fixture",
  },
];
