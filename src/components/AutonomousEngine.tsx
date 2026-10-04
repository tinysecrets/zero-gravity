"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { AutomationReadiness, CycleConfig } from "@/lib/automation-config";
import {
  Cpu,
  Play,
  Square,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  DollarSign,
  Eye,
  EyeOff,
  Target,
  Clock,
  ChevronDown,
  ChevronUp,
  Activity,
  Send,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  Search,
  Globe,
  Layers,
  TrendingUp,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CycleStep {
  type: string;
  domain: string;
  niche?: string;
  industry?: string;
  score?: number;
  grade?: string;
  dealId?: number;
  offerTier?: string;
  referenceCode?: string;
  checkoutUrl?: string;
  potentialValue?: number;
  message: string;
  timestamp: string;
}

interface CycleSummary {
  domainsScanned: number;
  opportunitiesFound: number;
  dealsCreated: number;
  outreachGenerated: number;
  checkoutsCreated: number;
  totalEstimatedValue: number;
}

interface CycleState {
  id: string;
  status: "running" | "completed" | "failed" | "stopped";
  startedAt: string;
  completedAt?: string;
  config: CycleConfig;
  steps: CycleStep[];
  summary: CycleSummary;
  error?: string;
}

interface SchedulerStatus {
  enabled: boolean;
  intervalMinutes: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunReason: string | null;
  cycleActive: boolean;
  totalRuns: number;
  consecutiveErrors: number;
  mode: string;
  cycleConfig: CycleConfig;
  cronSchedule: string | null;
  readiness: AutomationReadiness;
}

interface ScanTarget {
  id: number;
  domain: string;
  niche: string;
  industry: string | null;
  source: string;
  isActive: boolean;
  priority: number;
  lastAuditedAt: string | null;
  lastScore: number | null;
  lastDealId: number | null;
}

interface RunHistoryEntry {
  id: string;
  status: string;
  scoreThreshold: number;
  domainsScanned: number;
  opportunitiesFound: number;
  dealsCreated: number;
  outreachGenerated: number;
  checkoutsCreated: number;
  totalEstimatedValue: string;
  details: { steps: CycleStep[]; config: Record<string, unknown> } | null;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface FeedbackData {
  kpi: {
    verifiedRevenue: number;
    totalProspects: number;
    revenuePerThousand: string;
  };
  byIndustry: Array<Record<string, unknown>>;
  byTier: Array<Record<string, unknown>>;
  bySource: Array<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AutonomousEngine() {
  const [activeCycle, setActiveCycle] = useState<CycleState | null>(null);
  const [scheduler, setScheduler] = useState<SchedulerStatus | null>(null);
  const [targets, setTargets] = useState<ScanTarget[]>([]);
  const [history, setHistory] = useState<RunHistoryEntry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<AutomationReadiness | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const configLoaded = useRef(false);

  // Cycle config
  const [scoreThreshold, setScoreThreshold] = useState(65);
  const [autoCreateDeals, setAutoCreateDeals] = useState(true);
  const [autoGenerateOutreach, setAutoGenerateOutreach] = useState(true);
  const [autoCreateCheckout, setAutoCreateCheckout] = useState(false);
  const [autoSendOutreach, setAutoSendOutreach] = useState(false);
  const [maxDomainsPerCycle, setMaxDomainsPerCycle] = useState(5);

  // Scheduler config
  const [schedInterval, setSchedInterval] = useState(15);

  // Acquisition form
  const [acqQuery, setAcqQuery] = useState("roofing");
  const [acqIndustry, setAcqIndustry] = useState("construction");
  const [acqMode, setAcqMode] = useState<"ct_log" | "portfolio" | "import">("ct_log");
  const [isAcquiring, setIsAcquiring] = useState(false);
  const [acqResult, setAcqResult] = useState<string | null>(null);

  // Add target form
  const [newDomain, setNewDomain] = useState("");
  const [newNiche, setNewNiche] = useState("");

  // History expansion
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  // Polling
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    try {
      const [cycleRes, schedRes, targetsRes, historyRes, feedbackRes, healthRes] = await Promise.all([
        fetch("/api/autonomous/cycle"),
        fetch("/api/autonomous/schedule"),
        fetch("/api/autonomous/targets"),
        fetch("/api/autonomous/history"),
        fetch("/api/autonomous/feedback"),
        fetch("/api/health"),
      ]);

      const cycleData = await cycleRes.json();
      const schedData = await schedRes.json();
      const targetsData = await targetsRes.json();
      const historyData = await historyRes.json();
      const feedbackData = await feedbackRes.json();
      const healthData = await healthRes.json();

      if (cycleData.success) setActiveCycle((previous) => cycleData.activeCycle || (previous?.status !== "running" ? previous : null));
      if (schedData.success) {
        const saved: SchedulerStatus = schedData.scheduler;
        setScheduler(saved);
        setReadiness(saved.readiness);
        if (!configLoaded.current) {
          setScoreThreshold(saved.cycleConfig.scoreThreshold);
          setAutoCreateDeals(saved.cycleConfig.autoCreateDeals);
          setAutoGenerateOutreach(saved.cycleConfig.autoGenerateOutreach);
          setAutoSendOutreach(saved.cycleConfig.autoSendOutreach);
          setAutoCreateCheckout(saved.cycleConfig.autoCreateCheckout);
          setMaxDomainsPerCycle(saved.cycleConfig.maxDomainsPerCycle);
          setSchedInterval(saved.intervalMinutes);
          configLoaded.current = true;
        }
      } else {
        setNotice(schedData.error || "Scheduler configuration is unavailable.");
        setReadiness(healthData.automation || null);
      }
      if (targetsData.success) setTargets(targetsData.data);
      if (historyData.success) setHistory(historyData.data);
      if (feedbackData.success) setFeedback(feedbackData);
    } catch (err) {
      console.error("Fetch failed:", err);
      setNotice("Unable to load engine status. Check deployment configuration.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => { void fetchAll(); }, 0);
    return () => clearTimeout(timeout);
  }, [fetchAll]);

  // Poll even between scheduled runs so cold-start/remote cron activity is visible.
  useEffect(() => {
    const running = activeCycle?.status === "running" || scheduler?.cycleActive || isLaunching;
    if (!running && !scheduler?.enabled) return;
    pollRef.current = setInterval(() => { void fetchAll(); }, running ? 2000 : 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeCycle?.status, scheduler?.cycleActive, scheduler?.enabled, isLaunching, fetchAll]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleStartCycle = async () => {
    setIsLaunching(true);
    setNotice(null);
    try {
      const res = await fetch("/api/autonomous/cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreThreshold, autoCreateDeals, autoGenerateOutreach, autoSendOutreach, autoCreateCheckout, maxDomainsPerCycle }),
      });
      const data = await res.json();
      if (data.success) setActiveCycle(data.activeCycle);
      else setNotice(data.error || "Cycle could not run.");
      await fetchAll();
    } catch { setNotice("Cycle request failed. Check server logs."); }
    finally { setIsLaunching(false); }
  };

  const handleStopCycle = async () => {
    try { await fetch("/api/autonomous/cycle", { method: "DELETE" }); } catch { /* */ }
  };

  const handleStartScheduler = async () => {
    try {
      const res = await fetch("/api/autonomous/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: true,
          intervalMinutes: schedInterval,
          scoreThreshold,
          autoCreateDeals,
          autoGenerateOutreach,
          autoSendOutreach,
          maxDomainsPerCycle,
          autoCreateCheckout,
        }),
      });
      const data = await res.json();
      if (data.success) { setScheduler(data.scheduler); setReadiness(data.scheduler.readiness); setNotice(data.message); }
      else setNotice(data.error);
    } catch { setNotice("Unable to save scheduler configuration."); }
  };

  const handleStopScheduler = async () => {
    try {
      const res = await fetch("/api/autonomous/schedule", { method: "DELETE" });
      const data = await res.json();
      if (data.success) { setScheduler(data.scheduler); setNotice(data.message); }
      else setNotice(data.error || "Pause failed.");
    } catch { setNotice("Unable to pause the scheduler."); }
  };

  const handleAcquire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acqQuery.trim()) return;
    setIsAcquiring(true);
    setAcqResult(null);
    try {
      const res = await fetch("/api/autonomous/acquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: acqMode, query: acqQuery, industry: acqIndustry }),
      });
      const data = await res.json();
      if (data.success) {
        setAcqResult(data.message);
        setTargets([]);
        fetchAll();
      } else {
        setAcqResult(`Error: ${data.error}`);
      }
    } catch {
      setAcqResult("Acquisition failed.");
    } finally {
      setIsAcquiring(false);
    }
  };

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    try {
      const res = await fetch("/api/autonomous/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain, niche: newNiche || "B2B Services", priority: 1 }),
      });
      const data = await res.json();
      if (data.success) { setNewDomain(""); setNewNiche(""); fetchAll(); }
      else alert(data.error);
    } catch { alert("Failed."); }
  };

  const handleToggleTarget = async (t: ScanTarget) => {
    try {
      const res = await fetch("/api/autonomous/targets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, isActive: !t.isActive }),
      });
      const data = await res.json();
      if (data.success) fetchAll();
    } catch { /* */ }
  };

  const handleDeleteTarget = async (id: number) => {
    try {
      await fetch(`/api/autonomous/targets?id=${id}`, { method: "DELETE" });
      fetchAll();
    } catch { /* */ }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const isRunning = activeCycle?.status === "running" || scheduler?.cycleActive || isLaunching;

  const stepIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      acquisition: <Search className="w-3.5 h-3.5 text-cyan-400" />,
      scan: <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />,
      audit: <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />,
      decide: <Target className="w-3.5 h-3.5 text-amber-400" />,
      deal_created: <Zap className="w-3.5 h-3.5 text-emerald-400" />,
      outreach_generated: <Send className="w-3.5 h-3.5 text-purple-400" />,
      checkout_created: <CreditCard className="w-3.5 h-3.5 text-cyan-300" />,
      skipped: <AlertTriangle className="w-3.5 h-3.5 text-zinc-500" />,
    };
    return icons[type] || <Activity className="w-3.5 h-3.5 text-zinc-400" />;
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      running: "bg-cyan-950 text-cyan-300 border-cyan-800",
      completed: "bg-emerald-950 text-emerald-300 border-emerald-800",
      failed: "bg-red-950 text-red-300 border-red-800",
      stopped: "bg-amber-950 text-amber-300 border-amber-800",
    };
    return styles[status] || "bg-zinc-900 text-zinc-400 border-zinc-800";
  };

  const sourceIcon = (source: string) => {
    const icons: Record<string, string> = {
      ct_log: "🔍 CT Log",
      portfolio: "📁 Portfolio",
      manual: "✍️ Manual",
      csv_import: "📄 Import",
    };
    return icons[source] || source;
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-zinc-500 font-mono text-xs">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-purple-400" />
        Loading Autonomous Engine…
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-400" />
          Workflow Scheduler & Payment Controls
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Configured jobs may review public inputs and create drafts; outreach and Checkout require separate opt-ins and customer action. Gross customer receipts are recorded after verification. This app does not initiate bank or third-party payouts.
        </p>
      </div>

      <div className="rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-4 text-xs leading-relaxed text-zinc-300">
        When configured, Vercel Cron can invoke jobs without a page visit. This screen reports configuration/readiness, not proof that a production cycle succeeded; verify execution in Vercel Cron history and function logs. A Checkout request is not a receipt. Bank balance and payout status are separate and are not reported here.
        {readiness?.paymentMode === "test" && <p className="mt-2 font-bold text-amber-300">Stripe test mode: no real funds or verified revenue. Email goes only to OUTREACH_TEST_RECIPIENT.</p>}
      </div>
      {notice && <div role="status" className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-xs text-zinc-300">{notice}</div>}
      {readiness && !readiness.ready && (
        <div role="alert" className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-4 text-xs text-amber-200">
          <p className="font-bold">Setup required — automatic collection is not ready</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">{readiness.blockers.map((item) => <li key={item}>{item}</li>)}</ul>
          <p className="mt-2 text-zinc-400">Configure secrets in Vercel environment settings, not in source code or chat. Review targets before enabling email.</p>
        </div>
      )}

      {/* ── Revenue Feedback Loop KPIs ───────────────────────────────────── */}
      {feedback && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60">
            <span className="text-emerald-400 text-[10px] block">Verified gross receipts</span>
            <span className="text-xl font-black text-emerald-400 mt-0.5 block">
              ${feedback.kpi.verifiedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-500 text-[10px] block">Total Prospects</span>
            <span className="text-xl font-black text-white mt-0.5 block">{feedback.kpi.totalProspects}</span>
          </div>
          <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/60">
            <span className="text-purple-400 text-[10px] block">Gross receipts / 1K recorded prospects</span>
            <span className="text-xl font-black text-purple-400 mt-0.5 block">
              ${Number(feedback.kpi.revenuePerThousand).toLocaleString()}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/60">
            <span className="text-cyan-400 text-[10px] block">Scheduler Mode</span>
            <span className="text-sm font-black text-cyan-400 mt-0.5 block">
              {scheduler?.mode === "vercel_cron" ? "Vercel Cron" : scheduler?.enabled ? "In-Process" : "Off"}
            </span>
          </div>
        </div>
      )}

      {/* ── Prospect Acquisition ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl space-y-4">
        <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <Search className="w-4 h-4 text-cyan-400" />
          Prospect Acquisition
        </h3>
        <p className="text-[11px] text-zinc-400">
          Enabled cycles discover public certificate candidates automatically; no contact list is required. Optional imports must come from a source you are authorized to use. Source coverage, terms, rate limits, and costs vary; verify them before use. Added domains become scan targets, not verified prospects or customers.
        </p>

        <form onSubmit={handleAcquire} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] text-zinc-500 font-mono mb-1">Mode</label>
            <select
              value={acqMode}
              onChange={(e) => setAcqMode(e.target.value as "ct_log" | "portfolio" | "import")}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-mono cursor-pointer"
            >
              <option value="ct_log">CT Log (keyword)</option>
              <option value="portfolio">Portfolio (root domain)</option>
              <option value="import">Bulk Import (newline list)</option>
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] text-zinc-500 font-mono mb-1">
              {acqMode === "ct_log" ? "Niche keyword" : acqMode === "portfolio" ? "Root domain" : "Domains (one per line)"}
            </label>
            {acqMode === "import" ? (
              <textarea
                value={acqQuery}
                onChange={(e) => setAcqQuery(e.target.value)}
                rows={2}
                placeholder={"example.com\ntest.org\nfoo.io"}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 resize-none"
              />
            ) : (
              <input
                type="text"
                value={acqQuery}
                onChange={(e) => setAcqQuery(e.target.value)}
                placeholder={acqMode === "ct_log" ? "roofing" : "example.com"}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            )}
          </div>
          <div>
            <label className="block text-[10px] text-zinc-500 font-mono mb-1">Industry</label>
            <input
              type="text"
              value={acqIndustry}
              onChange={(e) => setAcqIndustry(e.target.value)}
              placeholder="construction"
              className="w-32 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            disabled={isAcquiring}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition cursor-pointer disabled:opacity-50"
          >
            {isAcquiring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            {isAcquiring ? "Scanning…" : "Discover Prospects"}
          </button>
        </form>

        {acqResult && (
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
            {acqResult}
          </div>
        )}
      </div>

      {/* ── Scheduler + Cycle Config ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scheduler panel */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-purple-950/20 to-zinc-950 border border-purple-800/40 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Persistent Scheduler
            </h3>
            {scheduler?.enabled ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border bg-emerald-950 text-emerald-300 border-emerald-800">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
                {readiness?.ready ? "ENABLED" : "SETUP REQUIRED"}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-zinc-500 px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900">INACTIVE</span>
            )}
          </div>

          {scheduler?.enabled && (
            <div className="flex flex-wrap gap-4 text-[11px] font-mono text-zinc-400">
              <span className="text-purple-300 font-bold">{scheduler.mode === "vercel_cron" ? "Daily at 13:00 UTC" : `Every ${scheduler.intervalMinutes} min`}</span>
              <span>Next: <span className="text-purple-300">{scheduler.nextRunAt ? new Date(scheduler.nextRunAt).toLocaleString() : "now"}</span></span>
              <span>Runs: <span className="text-white font-bold">{scheduler.totalRuns}</span></span>
              <span>Mode: <span className="text-cyan-400">{scheduler.mode}</span></span>
              {scheduler.consecutiveErrors > 0 && <span className="text-red-400">{scheduler.consecutiveErrors} error(s)</span>}
            </div>
          )}

          {scheduler?.lastRunStatus && (
            <p className="text-[11px] font-mono text-zinc-400">
              Last attempt:{" "}
              <span className={
                scheduler.lastRunStatus === "completed" ? "text-emerald-400"
                  : ["failed", "blocked"].includes(scheduler.lastRunStatus) ? "text-red-400" : "text-amber-300"
              }>{scheduler.lastRunStatus}</span>
              {scheduler.lastRunAt ? ` · ${new Date(scheduler.lastRunAt).toLocaleString()}` : ""}
              {scheduler.lastRunReason ? ` — ${scheduler.lastRunReason}` : ""}
            </p>
          )}
          {scheduler?.mode === "vercel_cron" && <p className="text-[11px] text-zinc-400">The schedule is defined in vercel.json, not this browser. Hobby may run within the 13:00–13:59 UTC window. Enabling takes effect on the next cron invocation; use a manual cycle to run now.</p>}
          <div className="flex items-center gap-3">
            {scheduler?.mode !== "vercel_cron" && <select
              value={schedInterval}
              onChange={(e) => setSchedInterval(Number(e.target.value))}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 font-mono cursor-pointer"
            >
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
              <option value={1440}>Daily</option>
            </select>}
            {scheduler?.enabled && <button onClick={handleStartScheduler} className="rounded-lg border border-purple-700 bg-purple-950 px-3 py-2 text-xs font-mono text-purple-200 cursor-pointer">Save configuration</button>}
            {scheduler?.enabled ? (
              <button onClick={handleStopScheduler} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition cursor-pointer">
                <Square className="w-3.5 h-3.5" /> Pause
              </button>
            ) : (
              <button onClick={handleStartScheduler} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-bold shadow-lg transition cursor-pointer">
                <Play className="w-3.5 h-3.5" /> {scheduler?.mode === "vercel_cron" ? "Enable Vercel Cron" : "Start Scheduler"}
              </button>
            )}
          </div>
        </div>

        {/* Cycle config + manual launch */}
        <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4">
          <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-400" />
            Cycle Config &amp; Manual Run
          </h3>

          <div>
            <div className="flex justify-between text-xs text-zinc-300 font-mono mb-1">
              <span>Score Threshold</span>
              <span className="font-bold text-emerald-400">&lt; {scoreThreshold} → Act</span>
            </div>
            <input type="range" min={30} max={90} step={5} value={scoreThreshold} onChange={(e) => setScoreThreshold(Number(e.target.value))} className="w-full accent-emerald-500 cursor-pointer" />
          </div>

          <div className="space-y-2 text-xs font-mono">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={autoCreateDeals} onChange={(e) => setAutoCreateDeals(e.target.checked)} className="accent-emerald-500 w-3.5 h-3.5" />
              <span className="text-zinc-300">Auto-create deals</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={autoGenerateOutreach} onChange={(e) => setAutoGenerateOutreach(e.target.checked)} className="accent-purple-500 w-3.5 h-3.5" />
              <span className="text-zinc-300">Generate outreach drafts (does not send)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={autoCreateCheckout} onChange={(e) => setAutoCreateCheckout(e.target.checked)} className="accent-cyan-500 w-3.5 h-3.5" />
              <span className="text-zinc-300">Auto-create Stripe checkout</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={autoSendOutreach} onChange={(e) => setAutoSendOutreach(e.target.checked)} className="accent-amber-500 w-3.5 h-3.5" />
              <span className="text-zinc-300">Send email to verified public contacts (explicit opt-in)</span>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-zinc-300">Domains per cycle (max 10)</span>
              <input type="number" min={1} max={10} value={maxDomainsPerCycle} onChange={(e) => setMaxDomainsPerCycle(Number(e.target.value))} className="w-16 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-white" />
            </label>
            <p className="text-[10px] text-zinc-500">Save configuration to apply these settings to scheduled runs. Manual cycles use the settings shown here.</p>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-zinc-800">
            {isRunning ? (
              <button onClick={handleStopCycle} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition cursor-pointer">
                <Square className="w-4 h-4" /> Stop
              </button>
            ) : (
              <button onClick={handleStartCycle} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-lg transition cursor-pointer">
                <Play className="w-4 h-4" /> Run Single Cycle
              </button>
            )}
            <span className="text-[11px] text-zinc-500 font-mono">One bounded batch; no revenue until payment</span>
          </div>
        </div>
      </div>

      {/* ── Scan Targets ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            Scan Targets ({targets.length})
          </h3>
        </div>

        <form onSubmit={handleAddTarget} className="p-4 border-b border-zinc-800 bg-zinc-900/30 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] text-zinc-500 font-mono mb-1">Domain *</label>
            <input type="text" required placeholder="example.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-purple-500" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[10px] text-zinc-500 font-mono mb-1">Niche</label>
            <input type="text" placeholder="B2B Services" value={newNiche} onChange={(e) => setNewNiche(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-purple-500" />
          </div>
          <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-semibold transition cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900/40 border-b border-zinc-800 text-zinc-400 text-[11px]">
              <tr>
                <th className="py-3 px-4">On</th>
                <th className="py-3 px-4">Domain</th>
                <th className="py-3 px-4">Niche</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Last Score</th>
                <th className="py-3 px-4">Deal</th>
                <th className="py-3 px-4 text-right">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {targets.map((t) => (
                <tr key={t.id} className={`hover:bg-zinc-900/40 transition ${!t.isActive ? "opacity-50" : ""}`}>
                  <td className="py-3 px-4"><button onClick={() => handleToggleTarget(t)} className="cursor-pointer">{t.isActive ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-zinc-600" />}</button></td>
                  <td className="py-3 px-4 text-white font-semibold">{t.domain}</td>
                  <td className="py-3 px-4 text-zinc-300">{t.niche}</td>
                  <td className="py-3 px-4 text-zinc-400">{sourceIcon(t.source)}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded text-[10px] ${t.priority === 1 ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-zinc-900 text-zinc-400 border border-zinc-800"}`}>{t.priority === 1 ? "High" : t.priority === 2 ? "Med" : "Low"}</span></td>
                  <td className="py-3 px-4">{t.lastScore != null ? <span className={`font-bold ${t.lastScore < 60 ? "text-red-400" : t.lastScore < 75 ? "text-amber-400" : "text-emerald-400"}`}>{t.lastScore}/100</span> : <span className="text-zinc-600">—</span>}</td>
                  <td className="py-3 px-4">{t.lastDealId != null ? <span className="text-emerald-400 font-bold">#{t.lastDealId}</span> : <span className="text-zinc-600">—</span>}</td>
                  <td className="py-3 px-4 text-right"><button onClick={() => handleDeleteTarget(t.id)} className="p-1.5 rounded-lg hover:bg-red-950/40 text-zinc-500 hover:text-red-400 transition cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button></td>
                </tr>
              ))}
              {targets.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-zinc-500">No scan targets yet. The next enabled cycle discovers public candidates automatically; no contact list is required.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Live Cycle Steps ──────────────────────────────────────────────── */}
      {activeCycle && activeCycle.steps.length > 0 && (
        <div className="rounded-2xl border border-purple-800/60 bg-zinc-950 overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-purple-900/40 flex items-center justify-between bg-purple-950/20">
            <h3 className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4" /> Live Execution Log
              {activeCycle.status === "running" && <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />}
            </h3>
            <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-400">
              <span>{activeCycle.summary.domainsScanned} scanned</span>
              <span className="text-emerald-400">{activeCycle.summary.opportunitiesFound} actionable</span>
              <span className="text-purple-400">{activeCycle.summary.dealsCreated} deals</span>
              <span className="text-cyan-400">${activeCycle.summary.totalEstimatedValue.toLocaleString()}</span>
            </div>
          </div>
          <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
            {activeCycle.steps.map((step, idx) => (
              <div key={idx} className={`p-3 rounded-lg border text-xs font-mono flex items-start gap-3 ${
                step.type === "deal_created" ? "bg-emerald-950/20 border-emerald-800/40" :
                step.type === "decide" && step.message.startsWith("ACTIONABLE") ? "bg-amber-950/20 border-amber-800/40" :
                step.type === "checkout_created" ? "bg-cyan-950/20 border-cyan-800/40" :
                "bg-zinc-900/40 border-zinc-800"
              }`}>
                <div className="mt-0.5 shrink-0">{stepIcon(step.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-zinc-500 text-[10px]">{new Date(step.timestamp).toLocaleTimeString()}</span>
                    <span className="text-zinc-400 font-bold">{step.domain}</span>
                    {step.score != null && <span className={`text-[10px] px-1.5 py-0.5 rounded ${step.score < 60 ? "bg-red-950 text-red-300" : step.score < 75 ? "bg-amber-950 text-amber-300" : "bg-emerald-950 text-emerald-300"}`}>{step.score}/100</span>}
                    {step.offerTier && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300">{step.offerTier}</span>}
                    {step.dealId && <span className="text-emerald-400 text-[10px]">#{step.dealId}</span>}
                  </div>
                  <p className="text-zinc-300 leading-relaxed break-words">{step.message}</p>
                  {step.checkoutUrl && <a href={step.checkoutUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1 text-cyan-400 hover:text-cyan-300 underline text-[11px]">Open Checkout <ArrowRight className="w-3 h-3" /></a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Revenue Attribution ───────────────────────────────────────────── */}
      {feedback && (feedback.byTier.length > 0 || feedback.byIndustry.length > 0) && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4 shadow-xl">
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Revenue Attribution (Feedback Loop)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {feedback.byTier.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">By Offer Tier</span>
                {feedback.byTier.map((row, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex justify-between text-xs font-mono">
                    <span className="text-zinc-300">{String(row.offer_tier)}</span>
                    <span className="text-emerald-400 font-bold">${Number(row.verified_revenue || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            {feedback.bySource.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">By Source</span>
                {feedback.bySource.map((row, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex justify-between text-xs font-mono">
                    <span className="text-zinc-300">{sourceIcon(String(row.source))}</span>
                    <span className="text-emerald-400 font-bold">${Number(row.verified_revenue || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            {feedback.byIndustry.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">By Industry</span>
                {feedback.byIndustry.slice(0, 5).map((row, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex justify-between text-xs font-mono">
                    <span className="text-zinc-300">{String(row.industry)}</span>
                    <span className="text-emerald-400 font-bold">${Number(row.verified_revenue || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Cycle History ─────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/60">
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" /> Cycle History ({history.length})
            </h3>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {history.map((run) => (
              <div key={run.id}>
                <button onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)} className="w-full p-4 flex items-center justify-between hover:bg-zinc-900/40 transition cursor-pointer text-left">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${statusBadge(run.status)}`}>{run.status.toUpperCase()}</span>
                    <span className="text-xs text-zinc-300 font-mono">{new Date(run.startedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] text-zinc-400 font-mono">{run.domainsScanned} scanned</span>
                    <span className="text-[11px] text-emerald-400 font-mono">{run.dealsCreated} deals</span>
                    <span className="text-[11px] text-purple-400 font-mono">${Number(run.totalEstimatedValue).toLocaleString()}</span>
                    {expandedRunId === run.id ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                  </div>
                </button>
                {expandedRunId === run.id && run.details?.steps && (
                  <div className="px-4 pb-4 space-y-2">
                    {run.details.steps.map((step, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs font-mono flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">{stepIcon(step.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-zinc-500 text-[10px]">{new Date(step.timestamp).toLocaleTimeString()}</span>
                            <span className="text-zinc-400 font-bold">{step.domain}</span>
                            {step.score != null && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">{step.score}/100</span>}
                          </div>
                          <p className="text-zinc-400 leading-relaxed">{step.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}