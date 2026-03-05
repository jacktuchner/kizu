"use client";

import { useState, useEffect } from "react";
import { parseDate } from "@/lib/dates";

interface SharedSeeker {
  seekerId: string;
  name: string;
  image: string | null;
  sharedEntryCount: number;
  sharedAt: string;
}

interface JournalEntry {
  id: string;
  procedureType: string;
  recoveryWeek: number | null;
  painLevel: number;
  mobilityLevel: number;
  mood: number;
  notes: string | null;
  milestones: string[];
  createdAt: string;
}

const MOOD_EMOJIS = ["", "\ud83d\ude1e", "\ud83d\ude15", "\ud83d\ude10", "\ud83d\ude42", "\ud83d\ude04"];

export default function SharedJournalsSection() {
  const [seekers, setSeekers] = useState<SharedSeeker[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSeeker, setExpandedSeeker] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch("/api/journal/shares/received");
        if (res.ok) {
          const data = await res.json();
          setSeekers(data.seekers || []);
        }
      } catch (err) {
        console.error("Error fetching shared journals:", err);
      } finally {
        setLoading(false);
      }
    }
    fetch_();
  }, []);

  async function toggleSeeker(seekerId: string) {
    if (expandedSeeker === seekerId) {
      setExpandedSeeker(null);
      setEntries([]);
      return;
    }

    setExpandedSeeker(seekerId);
    setEntriesLoading(true);
    try {
      const res = await fetch(`/api/journal/shared/${seekerId}`);
      if (res.ok) {
        setEntries(await res.json());
      } else {
        setEntries([]);
      }
    } catch {
      setEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  }

  if (loading) {
    return null;
  }

  if (seekers.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
      <h2 className="text-xl font-bold mb-1">Shared Seeker Journals</h2>
      <p className="text-sm text-gray-500 mb-4">
        Seekers who have shared their recovery journal with you.
      </p>

      <div className="space-y-3">
        {seekers.map((seeker) => (
          <div key={seeker.seekerId} className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSeeker(seeker.seekerId)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {seeker.image ? (
                  <img
                    src={seeker.image}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center">
                    <span className="text-teal-700 text-sm font-medium">
                      {seeker.name?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{seeker.name}</p>
                  <p className="text-xs text-gray-500">
                    {seeker.sharedEntryCount} shared {seeker.sharedEntryCount === 1 ? "entry" : "entries"}
                  </p>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  expandedSeeker === seeker.seekerId ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSeeker === seeker.seekerId && (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                {entriesLoading ? (
                  <p className="text-sm text-gray-500">Loading entries...</p>
                ) : entries.length === 0 ? (
                  <p className="text-sm text-gray-500">No shared entries yet.</p>
                ) : (
                  <div className="space-y-3">
                    {entries.map((entry) => (
                      <div key={entry.id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
                              {entry.procedureType}
                            </span>
                            {entry.recoveryWeek && (
                              <span className="text-xs text-gray-500">
                                Week {entry.recoveryWeek}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {parseDate(entry.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-2">
                          <div>
                            <p className="text-xs text-gray-500">Pain</p>
                            <div className="flex items-center gap-1">
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-red-400 rounded-full"
                                  style={{ width: `${entry.painLevel * 10}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-700">{entry.painLevel}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Mobility</p>
                            <div className="flex items-center gap-1">
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-400 rounded-full"
                                  style={{ width: `${entry.mobilityLevel * 10}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-700">{entry.mobilityLevel}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Mood</p>
                            <span className="text-lg">{MOOD_EMOJIS[entry.mood] || entry.mood}</span>
                          </div>
                        </div>

                        {entry.notes && (
                          <p className="text-sm text-gray-700 mt-2">{entry.notes}</p>
                        )}

                        {entry.milestones.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entry.milestones.map((m) => (
                              <span key={m} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
