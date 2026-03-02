"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import VideoCall from "@/components/VideoCall";

interface GroupSessionDetail {
  id: string;
  title: string;
  description?: string;
  procedureType: string;
  scheduledAt: string;
  durationMinutes: number;
  maxCapacity: number;
  minAttendees: number;
  pricePerPerson: number;
  status: string;
  videoRoomUrl?: string;
  participantCount: number;
  isRegistered: boolean;
  myParticipation?: {
    id: string;
    status: string;
    pricePaid: number;
  };
  guide: {
    id: string;
    name: string;
    image?: string;
    bio?: string;
    profile?: {
      procedureTypes?: string[];
      timeSinceSurgery?: string;
    };
  };
}

// Supabase returns TIMESTAMP(3) without timezone suffix — values are UTC.
function parseDate(s: string): Date {
  if (!s.endsWith("Z") && !s.includes("+")) return new Date(s + "Z");
  return new Date(s);
}

export default function GroupSessionDetailPage() {
  const { data: authSession } = useSession();
  const params = useParams();
  const router = useRouter();
  const [groupSession, setGroupSession] = useState<GroupSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingUp, setSigningUp] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const id = params.id as string;
  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const res = await fetch(`/api/group-sessions/${id}`);
        if (res.ok) {
          setGroupSession(await res.json());
        } else {
          setError("Session not found");
        }
      } catch {
        setError("Failed to load session");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSignUp() {
    if (!authSession?.user) {
      router.push("/auth/signin");
      return;
    }

    setSigningUp(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/group-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupSessionId: id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to sign up");
        return;
      }

      if (data.registered) {
        // Instant registration (e.g. free session)
        const refreshRes = await fetch(`/api/group-sessions/${id}`);
        if (refreshRes.ok) setGroupSession(await refreshRes.json());
      } else if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      }
    } catch {
      setError("Failed to sign up");
    } finally {
      setSigningUp(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel your registration?")) return;
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/group-sessions/${id}/cancel`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to cancel");
        return;
      }

      // Refresh session data
      const refreshRes = await fetch(`/api/group-sessions/${id}`);
      if (refreshRes.ok) setGroupSession(await refreshRes.json());
    } catch {
      setError("Failed to cancel");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="h-32 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (!groupSession) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Not Found</h1>
        <p className="text-gray-500 mb-4">This group session may have been removed.</p>
        <Link href="/group-sessions" className="text-teal-600 hover:text-teal-700 font-medium">
          Browse Sessions
        </Link>
      </div>
    );
  }

  const userRole = (authSession?.user as any)?.role;
  const isGuideOnly = userRole === "GUIDE";

  const date = parseDate(groupSession.scheduledAt);
  const spotsLeft = groupSession.maxCapacity - groupSession.participantCount;
  const isFull = spotsLeft <= 0;
  const isInPast = date <= new Date();
  const canJoinCall = groupSession.isRegistered && groupSession.status === "CONFIRMED" && groupSession.videoRoomUrl;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/group-sessions" className="text-sm text-gray-500 hover:text-teal-600 mb-4 inline-block">
        &larr; Back to Group Sessions
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full font-medium">
              {groupSession.procedureType}
            </span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              groupSession.status === "CONFIRMED" ? "bg-green-100 text-green-700" :
              groupSession.status === "SCHEDULED" ? "bg-yellow-100 text-yellow-700" :
              groupSession.status === "COMPLETED" ? "bg-gray-100 text-gray-600" :
              "bg-red-100 text-red-700"
            }`}>
              {groupSession.status}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">{groupSession.title}</h1>

          {groupSession.description && (
            <p className="text-gray-600 mb-4">{groupSession.description}</p>
          )}

          {/* Guide info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
              {groupSession.guide?.image ? (
                <img src={groupSession.guide.image} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <span className="text-teal-700 font-medium">
                  {groupSession.guide?.name?.[0]?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div>
              <Link
                href={`/guides/${groupSession.guide?.id}`}
                className="font-medium text-gray-900 hover:text-teal-600"
              >
                {groupSession.guide?.name || "Mentor"}
              </Link>
              {groupSession.guide?.bio && (
                <p className="text-sm text-gray-500 line-clamp-1">{groupSession.guide.bio}</p>
              )}
            </div>
          </div>

          {/* Session details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500">Date & Time</p>
              <p className="font-medium text-gray-900">
                {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
              <p className="font-medium text-gray-900">
                {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500">Duration</p>
              <p className="font-medium text-gray-900">{groupSession.durationMinutes} minutes</p>
            </div>
          </div>
        </div>

        {/* Spots & Price */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-500 mb-1">Spots filled</p>
              <p className="text-lg font-semibold text-gray-900">
                {groupSession.participantCount} of {groupSession.maxCapacity}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Price</p>
              <p className="text-lg font-semibold text-gray-900">${groupSession.pricePerPerson} per person</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${spotsLeft <= 3 ? "bg-orange-500" : "bg-teal-500"}`}
              style={{ width: `${(groupSession.participantCount / groupSession.maxCapacity) * 100}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-1.5">
            {spotsLeft > 0 ? (
              <span className={spotsLeft <= 3 ? "text-orange-600 font-medium" : ""}>
                {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} remaining
              </span>
            ) : (
              <span className="text-red-600 font-medium">Session is full</span>
            )}
            {" "}&middot; Minimum {groupSession.minAttendees} participants to run
          </p>

        </div>

        {/* Action area */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          {groupSession.isRegistered ? (
            <div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="font-medium text-green-800">You&apos;re signed up!</p>
                <p className="text-sm text-green-700 mt-1">
                  {groupSession.status === "CONFIRMED"
                    ? "This session is confirmed. Join the call when it's time."
                    : "We'll notify you once the session reaches its minimum number of participants."}
                </p>
              </div>

              {canJoinCall && (
                <div className="mb-4">
                  <VideoCall
                    roomUrl={groupSession.videoRoomUrl!}
                    callId={groupSession.id}
                    scheduledAt={date}
                    durationMinutes={groupSession.durationMinutes}
                  />
                </div>
              )}

              {!isInPast && groupSession.status !== "COMPLETED" && groupSession.status !== "CANCELLED" && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  {cancelling ? "Cancelling..." : "Cancel Registration"}
                </button>
              )}
            </div>
          ) : groupSession.status === "CANCELLED" ? (
            <p className="text-gray-500">This session has been cancelled.</p>
          ) : groupSession.status === "COMPLETED" ? (
            <p className="text-gray-500">This session has already taken place.</p>
          ) : isInPast ? (
            <p className="text-gray-500">This session has already started.</p>
          ) : isFull ? (
            <p className="text-gray-500 font-medium">This session is full.</p>
          ) : isGuideOnly ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="font-medium text-gray-900 mb-1">Want to join this session?</p>
              <p className="text-sm text-gray-600 mb-4">
                Add a health profile so we can match you with the right guide.
              </p>
              <Link
                href="/dashboard/seeker"
                className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 font-medium transition-colors"
              >
                Set Up Health Profile
              </Link>
            </div>
          ) : (
            <button
              onClick={handleSignUp}
              disabled={signingUp}
              className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 font-medium disabled:opacity-50 transition-colors"
            >
              {signingUp ? "Processing..." : `Sign Up - $${groupSession.pricePerPerson}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
