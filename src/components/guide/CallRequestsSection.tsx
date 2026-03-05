"use client";

import { useState } from "react";
import VideoCall from "@/components/VideoCall";
import { parseDate } from "@/lib/dates";

interface CallRequestsSectionProps {
  calls: any[];
  onCallUpdate: (callId: string, updated: any) => void;
}

export default function CallRequestsSection({ calls, onCallUpdate }: CallRequestsSectionProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function updateCallStatus(callId: string, newStatus: string) {
    try {
      setCancelError(null);
      const res = await fetch(`/api/calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        onCallUpdate(callId, updated);
        setCancellingId(null);
      } else {
        const data = await res.json();
        setCancelError(data.error || "Failed to update call");
      }
    } catch (err) {
      console.error(err);
      setCancelError("Something went wrong");
    }
  }

  function getHoursUntilCall(scheduledAt: string): number {
    return (parseDate(scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60);
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">Upcoming Calls</h2>
      {cancelError && (
        <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm mb-4">{cancelError}</div>
      )}
      {calls.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No calls scheduled yet.</p>
      ) : (
        <div className="space-y-4">
          {calls.map((call: any) => {
            const isUpcoming = call.status === "CONFIRMED" && parseDate(call.scheduledAt) > new Date(Date.now() - call.durationMinutes * 60 * 1000);
            const canJoinCall = isUpcoming && call.videoRoomUrl;
            const hoursUntil = getHoursUntilCall(call.scheduledAt);
            const isLateCancel = hoursUntil < 24;
            const showCancelConfirm = cancellingId === call.id;

            return (
              <div key={call.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-gray-50">
                  <div>
                    <p className="font-medium">{call.seeker?.name || "Seeker"}</p>
                    <p className="text-sm text-gray-500">
                      {parseDate(call.scheduledAt).toLocaleDateString()} at{" "}
                      {parseDate(call.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" "}&middot; {call.durationMinutes} min &middot; ${call.contributorPayout?.toFixed(2)} payout
                    </p>
                    {call.questionsInAdvance && (
                      <p className="text-sm text-gray-400 mt-1">Questions: {call.questionsInAdvance}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {call.status === "CONFIRMED" && (
                      <>
                        <button onClick={() => updateCallStatus(call.id, "COMPLETED")} className="text-xs bg-teal-100 text-teal-700 px-3 py-1.5 rounded-lg hover:bg-teal-200 font-medium">Mark Completed</button>
                        {!showCancelConfirm && (
                          <button onClick={() => setCancellingId(call.id)} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 font-medium">Cancel</button>
                        )}
                      </>
                    )}
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${call.status === "CONFIRMED" ? "bg-green-100 text-green-700" : call.status === "COMPLETED" ? "bg-gray-100 text-gray-600" : "bg-red-100 text-red-700"}`}>{call.status}</span>
                  </div>
                </div>

                {/* Cancel confirmation with 24hr policy warning */}
                {showCancelConfirm && (
                  <div className={`p-4 border-t ${isLateCancel ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
                    <div className="flex items-start gap-3">
                      <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isLateCancel ? "text-amber-500" : "text-red-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div className="flex-1">
                        {isLateCancel ? (
                          <>
                            <p className="text-sm font-medium text-amber-800">Late cancellation - no refund</p>
                            <p className="text-xs text-amber-600 mt-1">This call is less than 24 hours away. The seeker will not receive a refund.</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-red-800">Cancel this call?</p>
                            <p className="text-xs text-red-600 mt-1">The seeker will receive a full refund.</p>
                          </>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <button onClick={() => updateCallStatus(call.id, "CANCELLED")} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-medium">
                            Yes, Cancel Call
                          </button>
                          <button onClick={() => setCancellingId(null)} className="text-xs bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-300 font-medium">
                            Keep Call
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {canJoinCall && (
                  <div className="p-4 border-t border-gray-200">
                    <VideoCall roomUrl={call.videoRoomUrl} callId={call.id} scheduledAt={call.scheduledAt} durationMinutes={call.durationMinutes} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
