"use client";
import { useCallback, useEffect, useState } from "react";

type Lead = { id: number; kind: string; status: string; name: string; email: string; company: string | null; domain: string | null; message: string | null; paymentReference: string | null; notificationStatus: string | null; createdAt: string };
type ReportDraft = { leadId: number; customerName: string; customerEmail: string; domain: string; preparedAt: string; findings: Array<{ severity: string; title: string; description: string; impact: string }>; reportText: string; status: "draft_for_human_review" };

export default function LeadInboxPage() {
  const [leads,setLeads]=useState<Lead[]>([]);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState("");
  const [reportBusy,setReportBusy]=useState<number|null>(null);
  const [reportErrors,setReportErrors]=useState<Record<number,string>>({});
  const [drafts,setDrafts]=useState<Record<number,ReportDraft>>({});
  const [copyStatus,setCopyStatus]=useState<Record<number,string>>({});
  const [approvedReports,setApprovedReports]=useState<Record<number,boolean>>({});
  const [sendBusy,setSendBusy]=useState<number|null>(null);
  const [sendErrors,setSendErrors]=useState<Record<number,string>>({});
  const [sendMessages,setSendMessages]=useState<Record<number,string>>({});

  const refresh=useCallback(async()=>{
    setBusy(true);setError("");
    try {
      const r=await fetch("/api/private/leads",{cache:"no-store"});
      const d=await r.json();
      if(!r.ok||!d.success)throw new Error(d.error||"Unable to load leads.");
      setLeads(d.leads);
    } catch(e) {
      setError(e instanceof Error?e.message:"Unable to load leads.");
    } finally {
      setBusy(false);
    }
  },[]);

  useEffect(()=>{
    let active=true;
    fetch("/api/private/leads",{cache:"no-store"})
      .then(async r=>{const d=await r.json();if(!r.ok||!d.success)throw new Error(d.error||"Unable to load leads.");return d.leads as Lead[];})
      .then(rows=>{if(active)setLeads(rows);})
      .catch(e=>{if(active)setError(e instanceof Error?e.message:"Unable to load leads.");})
      .finally(()=>{if(active)setBusy(false);});
    return()=>{active=false;};
  },[]);

  async function prepareReport(id:number) {
    setReportBusy(id);
    setReportErrors(current=>({...current,[id]:""}));
    try {
      const r=await fetch("/api/private/leads/"+id+"/report",{method:"POST"});
      const d=await r.json();
      if(!r.ok||!d.success||!d.draft)throw new Error(d.error||"Report draft could not be prepared.");
      setDrafts(current=>({...current,[id]:d.draft as ReportDraft}));
    } catch(e) {
      setReportErrors(current=>({...current,[id]:e instanceof Error?e.message:"Report draft could not be prepared."}));
    } finally {
      setReportBusy(null);
    }
  }

  async function copyReport(id:number) {
    const draft=drafts[id];
    if(!draft)return;
    try {
      await navigator.clipboard.writeText(draft.reportText);
      setCopyStatus(current=>({...current,[id]:"Report draft copied."}));
    } catch {
      setCopyStatus(current=>({...current,[id]:"Clipboard unavailable. Select and copy the report text."}));
    }
  }

  async function sendReport(id:number) {
    const draft=drafts[id];
    if(!draft||!approvedReports[id])return;
    setSendBusy(id);setSendErrors(current=>({...current,[id]:""}));setSendMessages(current=>({...current,[id]:""}));
    try {
      const r=await fetch("/api/private/leads/"+id+"/report/send",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({approved:true,reportText:draft.reportText}),
      });
      const d=await r.json();
      if(!r.ok||!d.success)throw new Error(d.error||"Report delivery could not be confirmed.");
      setLeads(current=>current.map(lead=>lead.id===id?{...lead,status:"sent",notificationStatus:"report_sent:"+d.emailId}:lead));
      setSendMessages(current=>({...current,[id]:"Report email accepted by the provider and order marked sent."}));
      setApprovedReports(current=>({...current,[id]:false}));
    } catch(e) {
      setSendErrors(current=>({...current,[id]:e instanceof Error?e.message:"Report delivery failed."}));
    } finally {
      setSendBusy(null);
    }
  }

  return <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-8"><div className="mx-auto max-w-5xl">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs tracking-[0.2em] text-teal-300">ZERO GRAVITY / PRIVATE</p><h1 className="mt-2 text-3xl font-semibold">Lead inbox</h1><p className="mt-2 text-sm text-zinc-400">Requests from the public service page and verified customer orders.</p></div><div className="flex gap-3"><a href="/dashboard" className="rounded-xl border border-white/15 px-4 py-2 text-sm">Dashboard</a><button onClick={()=>void refresh()} disabled={busy} className="rounded-xl bg-teal-200 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50">Refresh</button></div></div>
    {error&&<p role="alert" className="mt-6 rounded-xl border border-rose-300/20 p-4 text-sm text-rose-200">{error}</p>}
    <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">{busy&&<p className="p-5 text-sm text-zinc-400">Loading inquiries…</p>}{!busy&&!leads.length&&<p className="p-8 text-sm text-zinc-400">No inquiries received yet.</p>}
      {!busy&&leads.map(l=><article key={l.id} className="border-b border-white/10 p-5 last:border-0">
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{l.name}</h2><a className="mt-1 block text-sm text-teal-200" href={"mailto:"+l.email}>{l.email}</a></div><span className={"rounded-full border px-3 py-1 text-xs "+(l.status==="paid"||l.status==="sent"?"border-teal-200/30 text-teal-100":"border-white/10")}>{l.status}</span></div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500"><span>#{l.id} · {l.kind}</span>{l.domain&&<span>Domain: {l.domain}</span>}{l.paymentReference&&<span>Payment ref: {l.paymentReference}</span>}<span>{new Date(l.createdAt).toLocaleString()}</span></div>
        {l.message&&<p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{l.message}</p>}
        <p className="mt-3 text-xs text-zinc-500">Notification: {l.notificationStatus||"not recorded"}</p>
        {l.kind==="checkout"&&l.status==="sent"&&<div className="mt-4 rounded-xl border border-teal-200/20 bg-teal-200/[0.04] p-4"><p className="text-sm font-semibold text-teal-100">Report email accepted</p><p className="mt-1 text-xs text-zinc-400">The email provider accepted the report for delivery; final mailbox delivery may depend on recipient systems. {l.notificationStatus}</p></div>}
        {l.kind==="checkout"&&l.status==="paid"&&<div className="mt-4 rounded-xl border border-teal-200/20 bg-teal-200/[0.04] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-teal-100">Paid order · report preparation</p><p className="mt-1 text-xs text-zinc-400">Generate a fresh DNS evidence draft for human review before customer delivery.</p></div><button onClick={()=>void prepareReport(l.id)} disabled={reportBusy===l.id} className="rounded-lg bg-teal-200 px-4 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-50">{reportBusy===l.id?"Preparing…":drafts[l.id]?"Refresh report draft":"Prepare report draft"}</button></div>
          {reportErrors[l.id]&&<p role="alert" className="mt-3 text-xs text-rose-200">{reportErrors[l.id]}</p>}
          {drafts[l.id]&&<div className="mt-4"><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-semibold text-amber-200">DRAFT — NOT SENT TO CUSTOMER</span><button onClick={()=>void copyReport(l.id)} className="rounded-lg border border-white/15 px-3 py-2 text-xs hover:border-teal-200/50">Copy report text</button></div><textarea value={drafts[l.id].reportText} onChange={e=>setDrafts(current=>({...current,[l.id]:{...current[l.id],reportText:e.target.value}}))} rows={14} className="mt-3 w-full rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs leading-5 text-zinc-300"/>{copyStatus[l.id]&&<p role="status" className="mt-2 text-xs text-zinc-400">{copyStatus[l.id]}</p>}<p className="mt-2 text-xs leading-5 text-zinc-500">Edit the report, verify evidence and scope, then explicitly approve delivery. The email is sent only when you use the approval control below.</p><label className="mt-4 flex items-start gap-3 text-xs leading-5 text-zinc-300"><input type="checkbox" checked={approvedReports[l.id]===true} onChange={e=>setApprovedReports(current=>({...current,[l.id]:e.target.checked}))} className="mt-1 accent-teal-300"/><span>I have reviewed this report, confirmed the domain and customer authorization, and approve sending it to the customer.</span></label>{sendErrors[l.id]&&<p role="alert" className="mt-3 text-xs text-rose-200">{sendErrors[l.id]}</p>}{sendMessages[l.id]&&<p role="status" className="mt-3 text-xs text-teal-100">{sendMessages[l.id]}</p>}<button onClick={()=>void sendReport(l.id)} disabled={!approvedReports[l.id]||sendBusy===l.id} className="mt-4 rounded-lg bg-teal-200 px-4 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-40">{sendBusy===l.id?"Sending report…":"Send approved report"}</button></div>}
        </div>}
      </article>)}
    </div></div></main>;
}
