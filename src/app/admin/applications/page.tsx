"use client";

import { useState, useEffect, useCallback } from "react";
import { parseDate } from "@/lib/dates";

type ApplicationStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

interface Application {
  id: string;
  userId: string;
  applicationText: string;
  applicationData: {
    conditionTypes?: string[];
    selectedConditions?: string[];
    timeSince?: string;
    conditionCategory?: string;
  } | null;
  proofUrls: string[];
  preferredContact: string;
  zoomCompleted: boolean;
  reviewNote: string | null;
  reviewedById: string | null;
  agreementAcceptedAt: string | null;
  agreementSignature: string | null;
  agreementSignatureImage: string | null;
  agreementVersion: string | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    contributorStatus: string | null;
    createdAt: string;
  };
}

const STATUS_TABS: { value: ApplicationStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING_REVIEW", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ApplicationStatus | "ALL">("PENDING_REVIEW");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [total, setTotal] = useState(0);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "ALL") params.set("status", activeTab);
      const res = await fetch(`/api/admin/applications?${params}`);
      const data = await res.json();
      setApplications(data.applications || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  async function handleAction(appId: string, action: "approve" | "reject") {
    const app = applications.find((a) => a.id === appId);
    if (!app) return;

    const confirmMsg = action === "approve"
      ? `Approve ${app.user.name}'s guide application?`
      : `Reject ${app.user.name}'s application? Their role will revert to SEEKER.`;

    if (!confirm(confirmMsg)) return;

    setActionLoading(appId);
    try {
      const res = await fetch(`/api/admin/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewNote: reviewNotes[appId] || null,
        }),
      });

      if (res.ok) {
        fetchApplications();
      }
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setActionLoading(appId);
    }
  }

  async function toggleZoom(appId: string, current: boolean) {
    setActionLoading(appId);
    try {
      const res = await fetch(`/api/admin/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoomCompleted: !current }),
      });

      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) => a.id === appId ? { ...a, zoomCompleted: !current } : a)
        );
      }
    } catch (err) {
      console.error("Toggle failed:", err);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Guide Applications</h1>
        <p className="text-gray-500 mt-1">Review and manage guide applications ({total} total)</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === tab.value
                ? "bg-white text-gray-900 font-medium shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading applications...</div>
      ) : applications.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No {activeTab === "ALL" ? "" : activeTab.toLowerCase().replace("_", " ")} applications found.
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Summary row */}
              <button
                onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-teal-700 font-bold">
                      {app.user.name?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{app.user.name}</p>
                    <p className="text-sm text-gray-500">{app.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {parseDate(app.createdAt).toLocaleDateString()}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    app.status === "PENDING_REVIEW" ? "bg-amber-100 text-amber-700" :
                    app.status === "APPROVED" ? "bg-green-100 text-green-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {app.status === "PENDING_REVIEW" ? "Pending" : app.status === "APPROVED" ? "Approved" : "Rejected"}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === app.id ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded details */}
              {expandedId === app.id && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="grid md:grid-cols-2 gap-6 mt-4">
                    {/* Application text */}
                    <div>
                      {app.applicationData && (
                        <div className="mb-3">
                          {app.applicationData.selectedConditions && app.applicationData.selectedConditions.length > 0 && (
                            <div className="mb-2">
                              <h4 className="text-xs font-medium text-gray-500 mb-1">Conditions</h4>
                              <div className="flex flex-wrap gap-1.5">
                                {app.applicationData.selectedConditions.map((c) => (
                                  <span key={c} className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{c}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {app.applicationData.timeSince && (
                            <p className="text-xs text-gray-500">Time since: <span className="text-gray-700 font-medium">{app.applicationData.timeSince}</span></p>
                          )}
                        </div>
                      )}
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Application</h4>
                      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                        {app.applicationText}
                      </div>
                    </div>

                    {/* Details & actions */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Preferred Contact</h4>
                        <p className="text-sm text-gray-700">{app.preferredContact}</p>
                      </div>

                      {/* Proof documents */}
                      {Array.isArray(app.proofUrls) && app.proofUrls.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-2">Proof Documents</h4>
                          <div className="space-y-1.5">
                            {app.proofUrls.map((url: string, i: number) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                Document {i + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Agreement status */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Guide Agreement</h4>
                        {app.agreementAcceptedAt ? (
                          <div className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 space-y-2">
                            <p>Signed by: <span className="font-semibold italic">{app.agreementSignature}</span></p>
                            {app.agreementSignatureImage && (
                              <div className="bg-white border border-green-200 rounded p-2">
                                <img
                                  src={app.agreementSignatureImage}
                                  alt={`Signature by ${app.agreementSignature}`}
                                  className="h-16 object-contain"
                                />
                              </div>
                            )}
                            <p>Date: {parseDate(app.agreementAcceptedAt).toLocaleString()}</p>
                            <p className="text-green-600 text-xs">Agreement version: {app.agreementVersion}</p>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                            Not signed (pre-agreement application)
                          </div>
                        )}
                      </div>

                      {/* Zoom completed checkbox */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`zoom-${app.id}`}
                          checked={app.zoomCompleted}
                          onChange={() => toggleZoom(app.id, app.zoomCompleted)}
                          disabled={actionLoading === app.id}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        <label htmlFor={`zoom-${app.id}`} className="text-sm text-gray-700">
                          Zoom verification call completed
                        </label>
                      </div>

                      {/* Review note */}
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Review Note (internal)</label>
                        <textarea
                          value={reviewNotes[app.id] ?? app.reviewNote ?? ""}
                          onChange={(e) => setReviewNotes((prev) => ({ ...prev, [app.id]: e.target.value }))}
                          rows={2}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          placeholder="Internal notes about this application..."
                        />
                      </div>

                      {/* Action buttons */}
                      {app.status === "PENDING_REVIEW" && (
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => handleAction(app.id, "approve")}
                            disabled={actionLoading === app.id}
                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(app.id, "reject")}
                            disabled={actionLoading === app.id}
                            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {app.status !== "PENDING_REVIEW" && (
                        <p className="text-xs text-gray-400">
                          Reviewed on {parseDate(app.updatedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
