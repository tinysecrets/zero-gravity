export interface AuditResult {
  domain: string;
  niche?: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  dmarcPresent: boolean;
  dmarcPolicy: string;
  spfPresent: boolean;
  spfRecord: string;
  mxPresent: boolean;
  mxRecords: string[];
  findings: Array<{
    category: "Deliverability" | "Lead Capture" | "Security" | "Conversion";
    severity: "Critical" | "Warning" | "Passed";
    title: string;
    description: string;
    impact: string;
  }>;
  estimatedMonthlyLeakage: number;
  recommendedFixBounty: number;
  remediationSnippet: string;
  readyOutreachCopy: string;
}

interface DnsResponse { Status: number; Answer?: Array<{ data?: string; type?: number }> }

async function lookup(name: string, type: string): Promise<DnsResponse> {
  const query = new URLSearchParams({ name, type });
  const response = await fetch(`https://cloudflare-dns.com/dns-query?${query}`, {
    headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(3500),
  });
  if (!response.ok) throw new Error("DNS provider is unavailable.");
  const data = await response.json() as DnsResponse;
  if (data.Status !== 0 && data.Status !== 3) throw new Error("DNS query could not be resolved reliably.");
  return data;
}

export async function runDomainAudit(domainInput: string, nicheInput?: string): Promise<AuditResult> {
  const domain = domainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain) || domain.length > 253) {
    throw new Error("A public domain name is required.");
  }
  // A timeout is not proof of a missing record. Do not fabricate offers from a
  // network failure, assumed inbox placement, or untested internal webhooks.
  const [dmarcData, spfData, mxData] = await Promise.all([
    lookup(`_dmarc.${domain}`, "TXT"), lookup(domain, "TXT"), lookup(domain, "MX"),
  ]);
  if (spfData.Status === 3 && mxData.Status === 3) throw new Error("Domain does not resolve.");
  const texts = (data: DnsResponse) => (data.Answer || []).filter((a) => a.type === 16).map((a) => (a.data || "").replace(/"/g, ""));
  const dmarc = texts(dmarcData).find((record) => /^v=DMARC1\s*;/i.test(record)) || "";
  const dmarcPresent = Boolean(dmarc);
  const dmarcPolicy = dmarc.match(/(?:^|;)\s*p=(none|quarantine|reject)(?:\s*;|\s*$)/i)?.[1]?.toLowerCase() || "none";
  const spfRecord = texts(spfData).find((record) => /^v=spf1(?:\s|$)/i.test(record)) || "";
  const spfPresent = Boolean(spfRecord);
  const mxRecords = (mxData.Answer || []).filter((a) => a.type === 15 && a.data).map((a) => a.data!);
  const findings: AuditResult["findings"] = [];
  let score = 100;
  if (!dmarcPresent) {
    score -= 35;
    findings.push({ category: "Deliverability", severity: "Warning", title: "DMARC record not found",
      description: "The public DNS response did not contain a DMARC policy record.", impact: "Email authentication and spoofing protection need review; inbox placement cannot be inferred from DNS alone." });
  } else if (dmarcPolicy === "none") {
    score -= 20;
    findings.push({ category: "Security", severity: "Warning", title: "DMARC monitoring policy",
      description: "The domain publishes p=none, a monitoring-only policy. This may be intentional during rollout.", impact: "Review reports and sender alignment before considering enforcement." });
  } else {
    findings.push({ category: "Deliverability", severity: "Passed", title: `DMARC policy: ${dmarcPolicy}`,
      description: "A public DMARC enforcement policy was found.", impact: "Sender alignment and message delivery still require separate verification." });
  }
  if (!spfPresent) {
    score -= 30;
    findings.push({ category: "Deliverability", severity: "Warning", title: "SPF record not found",
      description: "The public DNS response did not contain an SPF record.", impact: "Authorized mail senders need review before any DNS changes." });
  } else {
    findings.push({ category: "Deliverability", severity: "Passed", title: "SPF record present",
      description: `Published SPF: ${spfRecord}`, impact: "Record presence alone does not verify authorized senders or SPF validity." });
  }
  if (!mxRecords.length) {
    score -= 15;
    findings.push({ category: "Deliverability", severity: "Warning", title: "MX record not found",
      description: "The public DNS response did not contain a mail-exchange record.", impact: "Confirm whether the domain is intended to receive email before recommending changes." });
  }
  score = Math.max(25, score);
  const grade: AuditResult["grade"] = score >= 90 ? "A" : score >= 80 ? "B" : score >= 65 ? "C" : score >= 50 ? "D" : "F";
  // DNS observations do not establish a paid need or an appropriate fee.
  const recommendedFixBounty = 0;
  return {
    domain, niche: nicheInput || "B2B / Local Services", score, grade, dmarcPresent, dmarcPolicy,
    spfPresent, spfRecord, mxPresent: mxRecords.length > 0, mxRecords, findings,
    estimatedMonthlyLeakage: 0, // Unknown: public DNS cannot establish a dollar loss.
    recommendedFixBounty,
    remediationSnippet: `REVIEW SPECIFICATION FOR ${domain}\n1. Confirm all authorized mail services with the domain owner.\n2. Review existing SPF before merging provider-supplied values; never publish multiple SPF records.\n3. Configure DKIM using the sending provider's instructions.\n4. Review DMARC reports and alignment before moving from monitoring to enforcement.\n5. Obtain customer approval and verify DNS propagation and real message headers.\nNo account access or configuration changes have been performed.`,
    readyOutreachCopy: `Subject: Public DNS observations for ${domain}\n\nHi,\n\nA limited public DNS check for ${domain} observed:\n${findings.map((f) => `- ${f.title}: ${f.description}`).join("\n")}\n\nThese findings do not establish lost revenue or inbox placement, and they do not determine the right fix or price for your systems. No configuration changes have been made. If this is relevant, I would be glad to discuss the scope and your requirements before proposing any work.\n\n{{SenderName}}\n{{BusinessAddress}}\n{{OptOutInstructions}}`,
  };
}
