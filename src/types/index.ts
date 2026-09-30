export type DealVector =
  | "lead_reactivation"
  | "technical_leak_audit"
  | "micro_sponsorship"
  | "public_micro_purchase";

export type DealStatus =
  | "discovered"
  | "audited"
  | "outreach_sent"
  | "contract_signed"
  | "in_execution"
  | "completed_invoiced"
  | "revenue_collected";

export interface Opportunity {
  id: number;
  title: string;
  vector: DealVector;
  targetCompany: string;
  targetContact: string;
  targetEmail: string | null;
  targetPhone: string | null;
  targetNiche: string;
  status: DealStatus;
  potentialValue: string;
  operatorFeePercent: string;
  grossTransactionValue: string;
  realizedRevenue: string;
  capitalSpent: string;
  notes: string | null;
  outreachMessage: string | null;
  auditData: string | null;
  contractTerms: string | null;
  offerTier: string | null;
  monthlyPrice: string | null;
  acquisitionSource: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: number;
  opportunityId: number | null;
  transactionType: string;
  amount: string;
  paymentMethod: string;
  description: string;
  verified: boolean;
  createdAt: string;
}

export interface FinancialMetrics {
  grossVolume: number;
  totalRealizedRevenue: number;
  totalPotentialPipeline: number;
  totalCapitalSpent: number;
  netProfit: number;
  profitMargin: string;
  activeDealsCount: number;
  wonDealsCount: number;
}

export interface Playbook {
  id?: number;
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
  stepByStepExecution: string[] | string;
  freeToolsUsed: string;
  scriptsAndTemplates: {
    coldPitch: string;
    followUp: string;
    contingencyAgreement: string;
    deliveryTemplate: string;
  } | string;
  riskMitigation: string;
}
