"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PROCEDURE_TYPES } from "@/lib/constants";
import { parseDate } from "@/lib/dates";

interface GroupSession {
  id: string;
  title: string;
  description?: string;
  procedureType: string;
  scheduledAt: string;
  durationMinutes: number;
  maxCapacity: number;
  pricePerPerson: number;
  status: string;
  participantCount: number;
  guide: {
    id: string;
    name: string;
    image?: string;
  };
}

export default function GroupSessionsPage() {
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<"soonest" | "price_low" | "price_high">("soonest");

  useEffect(() => {
    async function load() {
      try {
        const url = filter
          ? `/api/group-sessions?procedureType=${encodeURIComponent(filter)}`
          : "/api/group-sessions";
        const res = await fetch(url);
        if (res.ok) {
          setSessions(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filter]);

  const sorted = [...sessions].sort((a, b) => {
    if (sort === "price_low") return a.pricePerPerson - b.pricePerPerson;
    if (sort === "price_high") return b.pricePerPerson - a.pricePerPerson;
    return parseDate(a.scheduledAt).getTime() - parseDate(b.scheduledAt).getTime();
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Group Recovery Sessions</h1>
          <p className="text-teal-100 text-lg max-w-2xl">
            Join live group sessions led by recovery guides. Share experiences, ask questions, and connect
            with others going through the same procedure.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All Procedures</option>
            {PROCEDURE_TYPES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="soonest">Soonest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>

        {/* Session Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No upcoming sessions</h3>
            <p className="text-gray-500">
              {filter ? "Try removing the filter to see more sessions." : "Check back soon for new group sessions."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((s) => {
              const spotsLeft = s.maxCapacity - s.participantCount;
              const date = parseDate(s.scheduledAt);

              return (
                <Link
                  key={s.id}
                  href={`/group-sessions/${s.id}`}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:border-teal-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                      {s.procedureType}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      ${s.pricePerPerson}
                    </span>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>

                  <p className="text-sm text-gray-500 mb-3">
                    with {s.guide?.name || "Guide"}
                  </p>

                  <div className="space-y-1.5 text-sm text-gray-600">
                    <p>
                      {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      {" at "}
                      {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p>{s.durationMinutes} minutes</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        {s.participantCount}/{s.maxCapacity} signed up
                      </span>
                      <span className={`font-medium ${spotsLeft <= 3 ? "text-orange-600" : "text-teal-600"}`}>
                        {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
                      </span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${spotsLeft <= 3 ? "bg-orange-500" : "bg-teal-500"}`}
                        style={{ width: `${(s.participantCount / s.maxCapacity) * 100}%` }}
                      />
                    </div>
                  </div>

                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
