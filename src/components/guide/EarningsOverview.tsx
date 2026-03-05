"use client";

import { useState, useEffect } from "react";
import { parseDate } from "@/lib/dates";

interface EarningsData {
  totalEarnings: number;
  callEarnings: number;
  recordingEarnings: number;
  recentTransactions: {
    id: string;
    date: string;
    type: "call" | "payout";
    description: string;
    amount: number;
  }[];
}

export default function EarningsOverview() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchEarnings() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/guide/earnings");
      if (!res.ok) throw new Error("Failed to load earnings.");
      setData(await res.json());
    } catch (err) {
      console.error(err);
      setError("Failed to load earnings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEarnings();
  }, []);

  if (loading) {
    return (
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Earnings</h2>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Earnings</h2>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={fetchEarnings} className="text-sm text-red-600 hover:text-red-700 font-medium">Retry</button>
        </div>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">Earnings</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <p className="text-xs text-green-600 font-medium">Total Earned</p>
          <p className="text-2xl font-bold text-green-700">${data.totalEarnings.toFixed(2)}</p>
        </div>
        <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-100">
          <p className="text-xs text-cyan-600 font-medium">From Calls</p>
          <p className="text-2xl font-bold text-cyan-700">${data.callEarnings.toFixed(2)}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
          <p className="text-xs text-purple-600 font-medium">From Recordings</p>
          <p className="text-2xl font-bold text-purple-700">${data.recordingEarnings.toFixed(2)}</p>
        </div>
      </div>

      {data.recentTransactions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Transactions</h3>
          <div className="space-y-2">
            {data.recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === "call" ? "bg-cyan-100" : "bg-green-100"}`}>
                    {tx.type === "call" ? (
                      <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                    <p className="text-xs text-gray-500">{parseDate(tx.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-green-700">+${tx.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.recentTransactions.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No transactions yet.</p>
      )}
    </section>
  );
}
