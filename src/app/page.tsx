"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { ExecutiveDossier } from "@/components/ExecutiveDossier";
import { PipelineCrm } from "@/components/PipelineCrm";
import { LiveScanner } from "@/components/LiveScanner";
import { ExecutionPlaybooks } from "@/components/ExecutionPlaybooks";
import { FinancialLedger } from "@/components/FinancialLedger";
import { AiStrategyAdvisor } from "@/components/AiStrategyAdvisor";
import { DealModal } from "@/components/DealModal";
import { NewDealModal } from "@/components/NewDealModal";
import { InstantPaymentModal } from "@/components/InstantPaymentModal";
import { Opportunity, Transaction, FinancialMetrics } from "@/types";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<string>("dossier");
  const [deals, setDeals] = useState<Opportunity[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Opportunity | null>(null);
  const [isNewDealOpen, setIsNewDealOpen] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentDealContext, setPaymentDealContext] = useState<Opportunity | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Ensure seed / db init
      await fetch("/api/seed", { method: "POST" });

      const [dealsRes, txRes] = await Promise.all([
        fetch("/api/opportunities"),
        fetch("/api/transactions"),
      ]);

      const dealsData = await dealsRes.json();
      const txData = await txRes.json();

      if (dealsData.success) {
        setDeals(dealsData.data);
      }
      if (txData.success) {
        setTransactions(txData.data.transactions);
        setMetrics(txData.data.metrics);
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateDeal = async (newDeal: Partial<Opportunity>) => {
    try {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDeal),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
        setActiveTab("pipeline");
      }
    } catch (err) {
      console.error("Failed to create deal:", err);
    }
  };

  const handleUpdateDeal = async (updatedFields: Partial<Opportunity>) => {
    if (!updatedFields.id) return;
    try {
      const res = await fetch(`/api/opportunities/${updatedFields.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update deal.");
      }
      await fetchData();
    } catch (err) {
      console.error("Failed to update deal:", err);
      throw err;
    }
  };

  const handleDeleteDeal = async (id: number) => {
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      }
    } catch (err) {
      console.error("Failed to delete deal:", err);
    }
  };

  const handleAddTransaction = async (newTx: Partial<Transaction>) => {
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTx),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      }
    } catch (err) {
      console.error("Failed to add transaction:", err);
    }
  };

  const handleApplyPlaybookToDeal = (vector: string) => {
    setIsNewDealOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        metrics={metrics}
        onOpenNewDeal={() => setIsNewDealOpen(true)}
        onOpenScanner={() => setActiveTab("scanner")}
        onOpenAdvisor={() => setActiveTab("advisor")}
        onOpenPayment={() => {
          setPaymentDealContext(null);
          setIsPaymentModalOpen(true);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:py-8">
        {activeTab === "dossier" && (
          <ExecutiveDossier
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenScanner={() => setActiveTab("scanner")}
            onOpenAdvisor={() => setActiveTab("advisor")}
            metrics={metrics}
          />
        )}

        {activeTab === "pipeline" && (
          <PipelineCrm
            deals={deals}
            onSelectDeal={(deal) => setSelectedDeal(deal)}
            onOpenNewDeal={() => setIsNewDealOpen(true)}
            isLoading={isLoading}
          />
        )}

        {activeTab === "scanner" && (
          <LiveScanner
            onAddDealFromAudit={async (deal) => {
              await handleCreateDeal(deal);
            }}
          />
        )}

        {activeTab === "playbooks" && (
          <ExecutionPlaybooks
            onApplyPlaybookToDeal={handleApplyPlaybookToDeal}
          />
        )}

        {activeTab === "ledger" && (
          <FinancialLedger
            transactions={transactions}
            metrics={metrics}
            deals={deals}
            onAddTransaction={handleAddTransaction}
          />
        )}

        {activeTab === "advisor" && (
          <AiStrategyAdvisor
            onAddDealFromAdvisor={async (deal) => {
              await handleCreateDeal(deal);
            }}
          />
        )}
      </main>

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <DealModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdate={handleUpdateDeal}
          onDelete={handleDeleteDeal}
        />
      )}

      {/* Create New Deal Modal */}
      <NewDealModal
        isOpen={isNewDealOpen}
        onClose={() => setIsNewDealOpen(false)}
        onCreate={handleCreateDeal}
      />

      {/* Instant Cash / Payment Clearance Modal */}
      <InstantPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        deals={deals}
        defaultDeal={paymentDealContext}
        onPaymentRequestCreated={fetchData}
      />
    </div>
  );
}
