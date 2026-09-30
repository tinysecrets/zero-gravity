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

export const SEED_PLAYBOOKS: SeedPlaybook[] = [
  {
    slug: "dead-lead-revival",
    title: "Ghost Pipeline Revival: Dead-Lead Reactivation Engine",
    vector: "lead_reactivation",
    tagline: "Monetize dormant CRM inquiries for high-ticket local services on a 25% contingency rev-share with $0 ad spend.",
    capitalRequired: "$0.00",
    avgTimeToFirstDollar: "24 to 72 Hours",
    avgDealSize: "$1,200 - $6,500",
    scalabilityRating: "High (Repeatable across 50+ service verticals)",
    barrierToEntry: "Low / Moderate (Requires good pitch & clear contract)",
    coreMechanism: "High-ticket contractors (roofers, HVAC, cosmetic dentistry, foundation repair, solar) spend $150-$300 per lead. They have 800-3,000 old leads who inquired in the last 6-18 months but never bought. You sign a 1-page 25% performance agreement, run a 3-touch high-converting SMS/email re-engagement sequence, book estimates directly into their calendar, and collect 20-25% of closed revenue with zero risk to the owner.",
    stepByStepExecution: [
      "Phase 1 - Target Identification: Search Google Maps for local high-ticket businesses with 30+ reviews (Roofing, HVAC, Cosmetic Dentistry, Kitchen Remodeling, Commercial Flooring).",
      "Phase 2 - The No-Risk Pitch: Contact the owner or GM using the 'Found Money' pitch. Offer 100% contingency: 'If we don't bring you paid jobs, you owe $0.'",
      "Phase 3 - Lead List Extraction: Request their CSV export of past unconverted inquiries (names, phone numbers, email, inquiry date). Sign standard NDA + 25% performance agreement.",
      "Phase 4 - The 9-Word Reactivation Campaign: Use free Google Sheets + free tier email/SMS or client's own portal (GoHighLevel/Mailchimp/Twilio) to send the proven 'Still looking for [Service]?' sequence.",
      "Phase 5 - Booking & Closing: Direct interested replies to the client's estimate booking link or phone dispatch. Log lead in shared Google Sheet.",
      "Phase 6 - Revenue Collection: Once the client closes the job and gets paid, invoice the 25% contingency fee via Stripe / ACH / Bank Wire."
    ],
    freeToolsUsed: "Google Sheets, Google Docs, Notion, Make.com (Free Tier), Client's existing CRM/Twilio/Mailchimp, ChatGPT for hyper-personalized batch copy.",
    scriptsAndTemplates: {
      coldPitch: "Subject: Quick question regarding your older inquiries from last year\n\nHi {{OwnerName}},\n\nI noticed Apex Roofing has great reviews around Austin. You probably spent tens of thousands on ads over the last 18 months.\n\nQuick question: what are you currently doing with the ~1,000 leads who requested a quote last year but didn't close?\n\nMost contractors leave $40k-$80k sitting untouched in that list. I have a 3-day reactivation sprint that generates 4 to 9 booked roof replacements out of dormant leads with zero ad spend.\n\nI work on 100% pure performance: I take a 20% cut of revenue only AFTER your customer pays you. If we generate $0, it costs you $0.\n\nDo you have 5 minutes this Thursday for me to show you the 3 text messages we use?",
      followUp: "Hi {{OwnerName}} - Following up on this. We ran this exact sprint for a contractor last week and revived 7 consultations ($38k pipeline) in 48 hours without spending a dollar on ads.\n\nCan I send over the 1-page contingency terms so you can see how there is literally zero financial risk?",
      contingencyAgreement: "PERFORMANCE-BASED REVENUE SHARE AGREEMENT\n\n1. PARTIES: [Operator Name] ('Consultant') & [Client Business Name] ('Client').\n2. OBJECTIVE: Consultant will execute a reactivation campaign on Client's list of inactive/dormant leads (defined as inquiries older than 30 days that did not convert into a completed sale).\n3. COMPENSATION: Client agrees to pay Consultant twenty-five percent (25%) of gross revenue collected from any revived lead who signs a contract within 60 days of campaign launch.\n4. NO UPFRONT FEES: Client owes $0.00 upfront. If no sales are generated, Client owes nothing.\n5. PAYMENT TERMS: Fees are due within 5 business days of Client receiving customer payment.\n6. CONFIDENTIALITY: Consultant shall not share, sell, or disclose Client customer data to any third party.\n\nSigned: ____________________ Date: _____________",
      deliveryTemplate: "CAMPAIGN SPRINT PROTOCOL:\nMessage 1 (SMS - Day 1, 11:30 AM): 'Hi {{FirstName}}, are you still looking to get your roof inspected/replaced this season? We have 2 discount slots open this week in Austin.'\n\nMessage 2 (Email - Day 2, 2:15 PM): Subject: Quick update on your roofing inquiry\n'Hi {{FirstName}}, reaching back out regarding your inquiry with Apex Roofing. Our lead estimator is in your neighborhood this Friday. Reply YES if you'd like us to lock in a complimentary 15-minute assessment.'\n\nMessage 3 (SMS - Day 4, 10:00 AM): 'Hey {{FirstName}}, just checking in one last time before we close out this month's scheduling. Let me know if you still need help!'"
    },
    riskMitigation: "Zero financial exposure. Always sign the contingency contract before accessing lead data. Never message leads who previously opted out. Use client's own domain/number or verified sender to ensure compliance with TCPA and CAN-SPAM regulations."
  },
  {
    slug: "technical-leak-audit",
    title: "The Broken Pipeline Inspector: Deliverability & Webhook Bounty",
    vector: "technical_leak_audit",
    tagline: "Scan high-ticket domains for fatal DMARC/SPF/Webhook leaks, present undeniable proof, and collect $300-$750 per fix.",
    capitalRequired: "$0.00",
    avgTimeToFirstDollar: "12 to 24 Hours",
    avgDealSize: "$300 - $950",
    scalabilityRating: "Very High (Automated programmatic auditing)",
    barrierToEntry: "Low (Templatized DNS & Webhook fix blueprints)",
    coreMechanism: "Following Google and Yahoo's strict authentication rules, tens of thousands of B2B and high-ticket service companies have misconfigured SPF/DKIM/DMARC records or broken lead webhook endpoints, dumping 30-50% of their customer inquiry responses into spam folders without knowing it. An operator inspects public DNS records in 30 seconds, spots the flaw, sends a video or audit screenshot showing the lost revenue, and offers a guaranteed 15-minute fix for $350 upfront or escrow.",
    stepByStepExecution: [
      "Phase 1 - Rapid Scanning: Use our built-in DNS & Deliverability Scanner (or free terminal dig / MXToolbox) across B2B SaaS, law firms, wealth management, and commercial agencies.",
      "Phase 2 - Leak Quantification: Identify missing DMARC policies (`p=none` or missing record), broken SPF lookups (>10 lookups fail), or unresponsive contact form webhooks.",
      "Phase 3 - Proof-of-Leak Outreach: Email the CTO, Founder, or Marketing VP with a screenshot of their failing DNS authentication and exact calculation of lost inbound inquiries.",
      "Phase 4 - Instant Value Pitch: 'I have written the exact DNS TXT record needed to fix your deliverability. I can apply it to your Cloudflare/GoDaddy/Namecheap in 10 minutes for $350, or I can send instructions to your tech team.'",
      "Phase 5 - Instant Fix Execution: Collect payment via Stripe link, paste the verified SPF/DMARC records, test propagation, and provide a 100% clean audit pass receipt."
    ],
    freeToolsUsed: "DNS Lookup CLI (dig/nslookup), MXToolbox (Free), Google Postmaster Tools, Loom (Free screen recording), Cloudflare DNS docs.",
    scriptsAndTemplates: {
      coldPitch: "Subject: Fatal deliverability flaw detected on {{domain}} (missing DMARC record)\n\nHi {{Name}},\n\nI ran a deliverability check on {{domain}} and noticed your DMARC authentication is currently unconfigured / set to 'p=none'.\n\nBecause of Google and Yahoo's updated mail filtering policies, approximately 28% to 42% of your team's direct sales proposals and customer quote emails are getting silently routed to recipients' Spam/Junk folders.\n\nHere is your domain's live DNS failure report: [Attached Diagnostic Screenshot]\n\nI can fix and verify this across your DNS within 15 minutes today so 100% of your sales emails hit the primary inbox. Fee is a flat $350 one-time.\n\nWould you like me to send over the Stripe link and fix this for you this afternoon?",
      followUp: "Hi {{Name}} - Just wanted to make sure you saw this. Every day this isn't configured, your team is sending emails into spam traps. Let me know if you'd like me to patch this today.",
      contingencyAgreement: "DELIVERABILITY REMEDIATION & SCOPE CONTRACT\n\n1. SCOPE: Consultant will configure valid SPF record, DKIM key alignment, and strict DMARC policy (v=DMARC1; p=quarantine/reject; rua=mailto:...) for {{Domain}}.\n2. GUARANTEE: Consultant guarantees 100% pass status on Google/Yahoo Postmaster deliverability criteria upon completion.\n3. FEE: Flat fixed bounty of $350.00 USD payable upon engagement.\n4. DELIVERY TIME: Within 24 hours of DNS access.",
      deliveryTemplate: "DNS CONFIGURATION SPECIFICATION:\n1. TXT Record @ | v=spf1 include:_spf.google.com include:sendgrid.net ~all\n2. TXT Record _dmarc | v=DMARC1; p=quarantine; sp=quarantine; pct=100; rua=mailto:dmarc-reports@{{domain}}\n3. CNAME records for DKIM selector authentication.\n4. Test via: dig TXT _dmarc.{{domain}} +short -> Verified."
    },
    riskMitigation: "Always backup existing DNS records before adding TXT/CNAME records. Use standard RFC-compliant DMARC syntax to avoid breaking legitimate email flows."
  },
  {
    slug: "micro-sponsorship-arbitrage",
    title: "Niche Media Sponsorship Arbitrage: Zero-Inventory Brokerage",
    vector: "micro_sponsorship",
    tagline: "Broker high-value B2B software sponsorships into targeted micro-newsletters for a 30% take rate.",
    capitalRequired: "$0.00",
    avgTimeToFirstDollar: "48 to 96 Hours",
    avgDealSize: "$800 - $3,500",
    scalabilityRating: "High (Multi-client agency portfolio)",
    barrierToEntry: "Low / Moderate (Clear communication & matchmaking)",
    coreMechanism: "High-value niche creators (e.g., 1,500 Rust developers, 2,200 clinical lab directors, 3,000 Chief Information Security Officers) have astronomical 50-65% open rates. They have no sales team and don't monetize. B2B software companies spend thousands trying to reach these exact buyers. You secure non-exclusive sponsorship representation from the creator for 30% commission, package 4-issue sponsorship slots, pitch relevant B2B marketing leads, and collect 30% upon advertiser payment.",
    stepByStepExecution: [
      "Phase 1 - Creator Sourcing: Find micro-newsletters on Substack, Beehiiv, and Medium with 1,000 - 8,000 subscribers in technical or high-salary B2B niches.",
      "Phase 2 - Representation Agreement: Send the creator a simple representation offer: 'I will bring paying B2B software advertisers to your newsletter. You keep 70%, I take 30% only when they pay.'",
      "Phase 3 - Rate Card & Media Kit Creation: Calculate optimal CPM ($60-$120 CPM for high-income niches). Create a clean 1-page PDF media kit using Canva free.",
      "Phase 4 - B2B Sponsor Matching: Search LinkedIn for 'Demand Gen Lead', 'Head of Growth', or 'Marketing Director' at Series A/B startups selling software to that specific niche.",
      "Phase 5 - Insertion Order & Closing: Send the sponsor a curated package (e.g. 2 primary newsletter placements + 1 dedicated shoutout for $1,600).",
      "Phase 6 - Payout Distribution: Sponsor pays $1,600 -> Creator receives $1,120 -> You retain $480 pure profit."
    ],
    freeToolsUsed: "Substack Explorer, LinkedIn Free Search, Canva (Free Media Kit), Google Docs (Insertion Order), Stripe Invoicing.",
    scriptsAndTemplates: {
      coldPitch: "Subject: Quick sponsorship inquiry for {{NewsletterName}} / B2B software partner\n\nHi {{CreatorName}},\n\nI love your breakdowns on {{NicheTopic}} in {{NewsletterName}}.\n\nI work with several B2B software companies looking to sponsor hyper-targeted publications with engaged technical audiences like yours.\n\nAre you currently accepting paid sponsor placements in your upcoming issues?\n\nIf so, I'd love to represent 2-3 upcoming slots and bring you paying SaaS advertisers. We handle the sponsor outreach, copy drafting, and invoicing, and pass 70% of the gross sponsorship directly to you.\n\nCan I send over a quick rate-card structure to see if you're open to it?",
      followUp: "Hi {{CreatorName}} - Just following up. We have two developer-tool startups asking for targeted newsletter placements this month. Would love to feature {{NewsletterName}} in our sponsor package if you have an open slot in next month's queue.",
      contingencyAgreement: "NON-EXCLUSIVE SPONSORSHIP BROKERAGE AGREEMENT\n\n1. APPOINTMENT: Creator grants Broker non-exclusive right to solicit and facilitate paid sponsorships for {{PublicationName}}.\n2. COMMISSION: Broker shall earn thirty percent (30%) of gross sponsorship fees received from advertisers procured by Broker.\n3. EDITORIAL INTEGRITY: Creator reserves ultimate editorial approval over all sponsor ad copy.\n4. SETTLEMENT: Sponsor payments collected shall be remitted to Creator within 48 hours of receipt, less Broker's 30% commission.",
      deliveryTemplate: "SPONSOR INSERTION ORDER (IO):\n- Advertiser: {{SponsorCompany}}\n- Publication: {{PublicationName}}\n- Placement: Primary Header Banner + 100-word featured blurb\n- Issue Dates: [Date 1], [Date 2]\n- Price: $1,400.00 Net\n- Net Broker Commission (30%): $420.00\n- Creator Payout (70%): $980.00"
    },
    riskMitigation: "Never guarantee clicks to advertisers; sell based on dedicated impressions and verified subscriber counts. Require upfront sponsor payment before ads go live."
  },
  {
    slug: "micro-purchase-procurement",
    title: "Public Micro-Purchase Solicitation Matchmaker",
    vector: "public_micro_purchase",
    tagline: "Arbitrage sub-$10,000 unadvertised government & university micro-purchases to specialized execution freelancers.",
    capitalRequired: "$0.00",
    avgTimeToFirstDollar: "3 to 7 Days",
    avgDealSize: "$1,500 - $7,500",
    scalabilityRating: "High (Federal & Municipal Micro-Purchase thresholds)",
    barrierToEntry: "Moderate (Navigating public procurement portals)",
    coreMechanism: "Federal, State, Municipal agencies, and Public Universities have a statutory 'Micro-Purchase Threshold' ($10,000 federally, up to $25k in many states) allowing buyers to purchase digital services, reports, document formatting, ADA compliance, and translations without complex formal RFPs—simply needing 1 to 3 written quotes. You identify active micro-solicitations, package a compliant quotation, subcontract execution to vetted specialists or use AI tools, and retain a 25-35% facilitation margin.",
    stepByStepExecution: [
      "Phase 1 - Open Solicitation Discovery: Check public university procurement bulletins, city purchasing portals, and Sam.gov small purchase notices.",
      "Phase 2 - Scope Evaluation: Select non-complex digital deliverables (Document ADA PDF accessibility remediation, translation, historical data digitization, audio transcription, web compliance).",
      "Phase 3 - Quotation Compilation: Build a professional, compliant price quote within the buyer's micro-purchase limit.",
      "Phase 4 - Subcontracting / Tooling: Line up an execution partner on Upwork/Fiverr or automate the deliverable using specialized open-source tools.",
      "Phase 5 - Purchase Order Award: Receive the official Government / University Purchase Order (PO) guarantee.",
      "Phase 6 - Delivery & Remittance: Deliver the completed project, submit Invoice with PO reference, receive prompt government ACH payout, and disburse subcontractor portion."
    ],
    freeToolsUsed: "Sam.gov (Free Public Data), State Procurement Bulletin Boards, Google Workspace, Adobe Acrobat Accessibility Checker, Free Invoice Generator.",
    scriptsAndTemplates: {
      coldPitch: "Subject: Official Quotation: Solicitation #{{SolicitationNumber}} - {{ProjectTitle}}\n\nAttn: {{ProcurementOfficerName}},\n\nIn response to the micro-purchase solicitation for {{ProjectTitle}}, please find attached our comprehensive scope of work and formal quotation in compliance with {{AgencyName}} procurement standards.\n\nSummary of Deliverables:\n- 100% Section 508 / WCAG 2.1 AA Compliance\n- Guaranteed delivery within 5 business days\n- Total Fixed Price: $4,250.00 USD (Includes post-delivery revision warranty)\n\nOur DUNS/UEI and W-9 credentials are ready for immediate PO generation.\n\nSincerely,\n[Operator Name]\nAuthorized Purchasing Representative",
      followUp: "Attn: {{ProcurementOfficerName}} - Following up regarding Quotation #{{SolicitationNumber}}. We are holding schedule capacity for {{AgencyName}} to begin work immediately upon PO release.",
      contingencyAgreement: "SUBCONTRACTOR MASTER SERVICES AGREEMENT (BACK-TO-BACK)\n\n1. PURPOSE: Subcontractor agrees to perform technical deliverables for Prime Contractor under Agency PO #{{PONumber}}.\n2. COMPENSATION: Subcontractor shall receive $[Amount] payable within 5 business days of Agency acceptance.\n3. QUALITY GUARANTEE: Subcontractor warrants 100% compliance with Agency technical specifications.",
      deliveryTemplate: "FINAL SUBMISSION PACKAGE:\n1. Completed Project Deliverable Files\n2. Compliance Verification Certificate\n3. Official Vendor Invoice referencing Agency PO Number"
    },
    riskMitigation: "Only accept binding written Purchase Orders (POs) from verified government or university domains before committing contractor resources. Micro-purchases carry sovereign credit guarantees."
  }
];

export const INITIAL_OPPORTUNITIES = [
  {
    title: "Apex Roofing & Solar - Austin, TX (Dead Leads Reactivation)",
    vector: "lead_reactivation",
    targetCompany: "Apex Roofing LLC",
    targetContact: "Marcus Vance (Managing Partner)",
    targetEmail: "marcus@apexroofingatx.com",
    targetPhone: "+1 (512) 555-0192",
    targetNiche: "Residential Roofing & Solar",
    status: "completed_invoiced",
    potentialValue: "24000.00",
    operatorFeePercent: "25.00",
    grossTransactionValue: "28400.00",
    realizedRevenue: "0.00",
    capitalSpent: "0.00",
    notes: "Example scenario: 1,140 dormant inquiries, 41 replies, 11 on-site estimates, and 3 potential roofing projects. Payment is pending authenticated customer settlement.",
    outreachMessage: "Hi Marcus, what are you doing with the ~1,100 quotes from last year who never bought? We do a 3-day revival sprint on 100% contingency...",
    auditData: JSON.stringify({
      deadLeadsCount: 1140,
      avgTicketSize: 9500,
      conversionRateProjected: "2.8%",
      estimatedPipeline: "$30,400",
      sprintDuration: "4 Days"
    }),
    contractTerms: "25% Performance Fee on all closed deals signed within 60 days of reactivation sprint launch. $0 upfront."
  },
  {
    title: "Vanguard Wealth Management - Domain Deliverability & DMARC Bounty",
    vector: "technical_leak_audit",
    targetCompany: "Vanguard Wealth Partners",
    targetContact: "David Sterling (Chief Operating Officer)",
    targetEmail: "dsterling@vanguardwealth.example.com",
    targetPhone: "+1 (415) 555-0341",
    targetNiche: "B2B Financial Advisory",
    status: "completed_invoiced",
    potentialValue: "450.00",
    operatorFeePercent: "100.00",
    grossTransactionValue: "450.00",
    realizedRevenue: "0.00",
    capitalSpent: "0.00",
    notes: "Example scenario: domain audit found missing DMARC and invalid SPF syntax. Technical remediation invoice is awaiting provider-confirmed payment.",
    outreachMessage: "Hi David, your domain fails DMARC authentication, causing ~35% of client advisory proposals to hit spam. Proof report attached...",
    auditData: JSON.stringify({
      spfStatus: "Failed (>10 DNS Lookups)",
      dmarcStatus: "Missing (No Record)",
      estimatedMonthlyLostInquiries: 18,
      riskLevel: "CRITICAL"
    }),
    contractTerms: "Fixed one-time remediation fee: $450. 100% satisfaction guarantee."
  },
  {
    title: "Rust Developers Digest (3,800 Sub) - Q2 SaaS Sponsorship Package",
    vector: "micro_sponsorship",
    targetCompany: "Rust Dev Digest / ByteStream Tech",
    targetContact: "Elena Rostova (Publisher)",
    targetEmail: "elena@rustdigest.example.io",
    targetPhone: "+1 (206) 555-0819",
    targetNiche: "Developer Tools / Systems Engineering",
    status: "completed_invoiced",
    potentialValue: "3600.00",
    operatorFeePercent: "30.00",
    grossTransactionValue: "3600.00",
    realizedRevenue: "0.00",
    capitalSpent: "0.00",
    notes: "Example scenario: 3-issue developer-tool sponsor package with an invoice awaiting authenticated settlement.",
    outreachMessage: "Hi Elena, I represent B2B devtool advertisers looking for hyper-targeted Rust audiences. Can we package 3 upcoming slots at 70/30 split?",
    auditData: JSON.stringify({
      subscriberCount: 3820,
      openRate: "58.4%",
      benchmarkCPM: "$95.00",
      totalPackageValue: "$3,600"
    }),
    contractTerms: "Non-exclusive broker representation. 30% commission withheld upon sponsor escrow clearance."
  },
  {
    title: "State University Library - ADA Document PDF Compliance Micro-Purchase",
    vector: "public_micro_purchase",
    targetCompany: "State Polytechnic University (Procurement Div)",
    targetContact: "Karen Miller (Purchasing Agent)",
    targetEmail: "procurement@statepoly.example.edu",
    targetPhone: "+1 (916) 555-0144",
    targetNiche: "Higher Education / Public Sector",
    status: "completed_invoiced",
    potentialValue: "4200.00",
    operatorFeePercent: "32.00",
    grossTransactionValue: "4200.00",
    realizedRevenue: "0.00",
    capitalSpent: "0.00",
    notes: "Example scenario: Section 508 accessibility remediation invoice is pending settlement under a public micro-purchase order.",
    outreachMessage: "Official Quotation submitted for micro-purchase solicitation #SPU-2025-089. Turnaround: 4 business days.",
    auditData: JSON.stringify({
      solicitationNumber: "SPU-2025-089",
      purchaseThreshold: "$10,000 Micro-Purchase",
      contractorCost: "$2,850",
      netSpread: "$1,350"
    }),
    contractTerms: "Government Purchase Order Net-15 terms."
  },
  {
    title: "PureSmile Orthodontics - Inactive Patient Treatment Plan Revival",
    vector: "lead_reactivation",
    targetCompany: "PureSmile Dental Group",
    targetContact: "Dr. Arthur Vance & Sarah Chen (Practice Mgr)",
    targetEmail: "sarah@puresmiledental.example.com",
    targetPhone: "+1 (602) 555-0728",
    targetNiche: "Orthodontics / Cosmetic Dentistry",
    status: "in_execution",
    potentialValue: "18000.00",
    operatorFeePercent: "20.00",
    grossTransactionValue: "18000.00",
    realizedRevenue: "0.00",
    capitalSpent: "0.00",
    notes: "Executing 3-day SMS sprint for 680 patients who had Invisalign consultations in the last 12 months but didn't proceed. 14 consultations re-booked this week. Estimated 3-4 will start treatment ($5k avg ticket).",
    outreachMessage: "Hi Sarah, what is your reactivation strategy for the ~600 Invisalign consultations who delayed treatment last year?...",
    auditData: JSON.stringify({
      dormantPatients: 680,
      ticketAverage: "$5,200",
      rebookedConsults: 14,
      projectedGross: "$18,000+"
    }),
    contractTerms: "20% Rev share on all treatment contracts started within 45 days."
  },
  {
    title: "CyberPulse Weekly (6,200 SecOps Pros) - B2B Security Tool Placement",
    vector: "micro_sponsorship",
    targetCompany: "CyberPulse Media",
    targetContact: "Tariq Al-Mansoor",
    targetEmail: "tariq@cyberpulse.example.com",
    targetPhone: "+1 (312) 555-0912",
    targetNiche: "Cybersecurity & DevSecOps",
    status: "contract_signed",
    potentialValue: "5200.00",
    operatorFeePercent: "30.00",
    grossTransactionValue: "5200.00",
    realizedRevenue: "0.00",
    capitalSpent: "0.00",
    notes: "Signed broker agreement with Tariq. Pitching 4 Series-B identity security vendors on a 2-month sponsored series ($5,200). 2 sponsor demo calls scheduled.",
    outreachMessage: "Hi Tariq, we have security SaaS sponsors looking for dedicated SecOps reach...",
    auditData: JSON.stringify({
      subscriberCount: 6200,
      openRate: "52.1%",
      cpmBenchmark: "$110",
      targetSponsorsIdentified: 8
    }),
    contractTerms: "30% Net Commission payable upon sponsor wire clearance."
  }
];

