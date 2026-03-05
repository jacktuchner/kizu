"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import RecordingCard from "@/components/RecordingCard";
import MatchScoreTooltip from "@/components/MatchScoreTooltip";
import { RECOMMENDATION_CATEGORIES, GENDERS, isChronicPainCondition } from "@/lib/constants";
import { getTimeSinceSurgeryLabel, getTimeSinceDiagnosisLabel } from "@/lib/surgeryDate";
import MessageButton from "@/components/MessageButton";
import VerifiedBadge from "@/components/VerifiedBadge";
import { parseDate } from "@/lib/dates";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
}


const activityLabels: Record<string, string> = {
  SEDENTARY: "Sedentary",
  RECREATIONAL: "Recreational",
  COMPETITIVE_ATHLETE: "Competitive Athlete",
  PROFESSIONAL_ATHLETE: "Professional Athlete",
};


export default function GuideDetailPage() {
  const { id } = useParams();
  const { data: session } = useSession();
  const [guide, setGuide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);

  // Check if viewing own profile
  const isOwnProfile = session?.user && (session.user as any).id === id;


  async function loadGuide() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/guides/${id}`);
      if (!res.ok) throw new Error("Failed to load guide profile.");
      setGuide(await res.json());
    } catch (err) {
      console.error(err);
      setError("Failed to load guide profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGuide();
  }, [id]);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>;
  if (error) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between">
        <p className="text-sm text-red-700">{error}</p>
        <button onClick={loadGuide} className="text-sm text-red-600 hover:text-red-700 font-medium">Retry</button>
      </div>
    </div>
  );
  if (!guide) return <div className="max-w-4xl mx-auto px-4 py-8">Guide not found.</div>;


  const avgRating = guide.reviewsReceived?.length
    ? (guide.reviewsReceived.reduce((a: number, r: any) => a + r.rating, 0) / guide.reviewsReceived.length).toFixed(1)
    : null;


  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href={isOwnProfile ? "/dashboard/guide/profile" : "/browse?tab=guides"}
        className="text-sm text-teal-600 hover:text-teal-700 mb-4 inline-block"
      >
        &larr; {isOwnProfile ? "Back to Dashboard" : "Back to Guides"}
      </Link>

      {/* Intro Video */}
      {guide.profile?.introVideoUrl && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <video
            src={guide.profile.introVideoUrl}
            controls
            autoPlay
            muted
            playsInline
            className="w-full max-h-96 bg-black"
          />
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              Meet {guide.name?.split(" ")[0] || "this guide"}
              {guide.profile.introVideoDuration && (
                <span className="text-gray-400 ml-2">
                  ({Math.floor(guide.profile.introVideoDuration / 60)}:{(guide.profile.introVideoDuration % 60).toString().padStart(2, "0")})
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 mb-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-teal-700 font-bold text-2xl">
              {guide.name?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{guide.name}</h1>
              {guide.contributorStatus === "APPROVED" && <VerifiedBadge />}
              {guide.matchScore !== undefined && (
                <div className="flex items-center">
                  <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                    guide.matchScore >= 80 ? "bg-green-100 text-green-700" :
                    guide.matchScore >= 60 ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {guide.matchScore}% match
                  </span>
                  {guide.matchBreakdown && (
                    <MatchScoreTooltip breakdown={guide.matchBreakdown} />
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(guide.profile?.procedureTypes?.length > 0
                ? guide.profile.procedureTypes
                : (guide.profile?.procedureType ? [guide.profile.procedureType] : [])
              ).map((proc: string) => (
                <span key={proc} className="text-sm bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full">{proc}</span>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {avgRating && (
                <span className="text-sm text-gray-500">
                  {avgRating} avg rating &middot; {guide.reviewsReceived.length} reviews
                </span>
              )}
              {guide.completedCallCount > 0 && (
                <span className="text-sm bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                  {guide.completedCallCount} calls completed
                </span>
              )}
            </div>
          </div>
          {!isOwnProfile && (
            <div className="flex flex-col gap-2 flex-shrink-0">
              {guide.profile?.isAvailableForCalls && (
                <Link
                  href={`/book/${guide.id}`}
                  className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 font-semibold text-base text-center shadow-md hover:shadow-lg transition-all"
                >
                  Book a Call &middot; ${(guide.profile.hourlyRate / 2).toFixed(0)}/30min
                </Link>
              )}
              <MessageButton guideId={guide.id} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
            {guide.profile?.ageRange}
          </span>
          {guide.profile?.gender && (
            <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
              {GENDERS.find((g) => g.value === guide.profile.gender)?.label || guide.profile.gender}
            </span>
          )}
          <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
            {activityLabels[guide.profile?.activityLevel] || guide.profile?.activityLevel}
          </span>
          {(guide.profile?.surgeryDate || guide.profile?.timeSinceSurgery) && (
            <span className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
              {guide.profile.surgeryDate
                ? (isChronicPainCondition(guide.profile?.procedureType || guide.profile?.procedureTypes?.[0] || "")
                    ? getTimeSinceDiagnosisLabel(guide.profile.surgeryDate)
                    : getTimeSinceSurgeryLabel(guide.profile.surgeryDate))
                : `${guide.profile.timeSinceSurgery} post-op`}
            </span>
          )}
          {guide.profile?.isAvailableForCalls && (
            <span className="text-sm bg-green-50 text-green-600 px-3 py-1 rounded-full">
              Available for calls
            </span>
          )}
        </div>

        {guide.profile?.recoveryGoals?.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">
              {isChronicPainCondition(guide.profile?.procedureType || guide.profile?.procedureTypes?.[0] || "")
                ? "Goals:" : "Recovery Goals:"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {guide.profile.recoveryGoals.map((g: string) => (
                <span key={g} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{g}</span>
              ))}
            </div>
          </div>
        )}

        {guide.bio && <p className="text-gray-600">{guide.bio}</p>}
      </div>

      {/* Procedure Details */}
      {(() => {
        if (!guide.profile) return null;

        const procedures: string[] = guide.profile.procedureTypes?.length > 0
          ? guide.profile.procedureTypes
          : (guide.profile.procedureType ? [guide.profile.procedureType] : []);
        const hasMultiple = procedures.length > 1;
        const activeProc = selectedProcedure || guide.profile.activeProcedureType || guide.profile.procedureType;

        const procProfiles = guide.profile.procedureProfiles || {};
        const lifestyle: string[] = guide.profile.lifestyleContext || [];

        // Normalize: get instances array for a procedure type
        function getInstances(proc: string): any[] {
          const val = procProfiles[proc];
          if (Array.isArray(val)) return val;
          if (val && typeof val === "object" && Object.keys(val).length > 0) return [val];
          if (proc === guide.profile.procedureType) {
            return [{
              procedureDetails: guide.profile.procedureDetails,
              surgeryDate: guide.profile.surgeryDate,
              timeSinceSurgery: guide.profile.timeSinceSurgery,
              recoveryGoals: guide.profile.recoveryGoals || [],
              complicatingFactors: guide.profile.complicatingFactors || [],
            }];
          }
          return [];
        }

        const instances = getInstances(activeProc);

        if (procedures.length === 0 && instances.length === 0 && lifestyle.length === 0) return null;

        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                {isChronicPainCondition(activeProc) ? "Condition Details" : "Procedure Details"}
              </h2>
            </div>

            {/* Procedure tabs when multiple procedures */}
            {hasMultiple && (
              <div className="flex flex-wrap gap-2 mb-5">
                {procedures.map((proc: string) => (
                  <button
                    key={proc}
                    onClick={() => setSelectedProcedure(proc)}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      proc === activeProc
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-teal-300 hover:text-teal-700"
                    }`}
                  >
                    {proc}
                  </button>
                ))}
              </div>
            )}

            {/* Show all instances for the active procedure */}
            <div className="space-y-4">
              {instances.map((inst: any, idx: number) => {
                const details = inst.procedureDetails;
                const surgeryDate = inst.surgeryDate;
                const timeSinceSurgery = inst.timeSinceSurgery;
                const goals: string[] = inst.recoveryGoals || [];
                const factors: string[] = inst.complicatingFactors || [];

                return (
                  <div key={idx} className={instances.length > 1 ? "pb-4 border-b border-gray-100 last:border-0 last:pb-0" : ""}>
                    {instances.length > 1 && (
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                        {details || (isChronicPainCondition(activeProc) ? `Profile ${idx + 1}` : `Surgery ${idx + 1}`)}
                      </p>
                    )}
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                      {details && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Details</p>
                          <p className="text-sm text-gray-800">{details}</p>
                        </div>
                      )}
                      {(surgeryDate || timeSinceSurgery) && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">
                            {isChronicPainCondition(activeProc) ? "Time Since Diagnosis" : "Time Since Surgery"}
                          </p>
                          <p className="text-sm text-gray-800">
                            {surgeryDate
                              ? (isChronicPainCondition(activeProc)
                                  ? getTimeSinceDiagnosisLabel(surgeryDate)
                                  : getTimeSinceSurgeryLabel(surgeryDate))
                              : timeSinceSurgery}
                          </p>
                        </div>
                      )}
                      {goals.length > 0 && (
                        <div className="sm:col-span-2">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Recovery Goals</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {goals.map((g: string) => (
                              <span key={g} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{g}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {factors.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Complicating Factors</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {factors.map((f: string) => (
                              <span key={f} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">{f}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {lifestyle.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Lifestyle Context</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {lifestyle.map((l: string) => (
                    <span key={l} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{l}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Availability Schedule */}
      {guide.profile?.isAvailableForCalls && guide.availability?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Availability</h2>
          <div className="space-y-2">
            {Object.entries(
              (guide.availability as { dayOfWeek: number; startTime: string; endTime: string; timezone: string }[])
                .reduce<Record<number, { startTime: string; endTime: string }[]>>((acc, slot) => {
                  if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
                  acc[slot.dayOfWeek].push({ startTime: slot.startTime, endTime: slot.endTime });
                  return acc;
                }, {})
            ).map(([day, slots]) => (
              <div key={day} className="flex items-start gap-3 text-sm">
                <span className="w-10 font-medium text-gray-700">{DAY_NAMES[Number(day)]}</span>
                <div className="flex flex-wrap gap-1.5">
                  {(slots as { startTime: string; endTime: string }[]).map((slot, i) => (
                    <span key={i} className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full text-xs">
                      {formatTime12h(slot.startTime)} - {formatTime12h(slot.endTime)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {guide.availability?.[0]?.timezone && (
            <p className="text-xs text-gray-400 mt-3">
              Times shown in {guide.availability[0].timezone}
            </p>
          )}
          {!isOwnProfile && (
            <Link
              href={`/book/${guide.id}`}
              className="mt-4 inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 font-semibold text-base shadow-md hover:shadow-lg transition-all"
            >
              Book a Call
            </Link>
          )}
        </div>
      )}

      {/* Recordings */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">Recordings ({guide.recordings?.length || 0})</h2>
        {guide.recordings?.length === 0 ? (
          <p className="text-gray-400">No recordings yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {guide.recordings.map((rec: any) => (
              <RecordingCard
                key={rec.id}
                id={rec.id}
                title={rec.title}
                guideName={guide.name || "Anonymous"}
                procedureType={rec.procedureType}
                ageRange={rec.ageRange}
                activityLevel={rec.activityLevel}
                category={rec.category}
                durationSeconds={rec.durationSeconds}
                isVideo={rec.isVideo}
                thumbnailUrl={rec.thumbnailUrl}
                viewCount={rec.viewCount}
                averageRating={
                  rec.reviews?.length
                    ? rec.reviews.reduce((a: number, r: any) => a + r.rating, 0) / rec.reviews.length
                    : undefined
                }
                guideVerified={guide.contributorStatus === "APPROVED"}
              />
            ))}
          </div>
        )}
      </section>

      {/* Series / Bundles */}
      {guide.series?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Series ({guide.series.length})</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {guide.series.map((s: any) => (
                <Link key={s.id} href={`/series/${s.id}`} className="block group">
                  <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-teal-200 transition-all h-full">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                        {s.title}
                      </h3>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex-shrink-0">
                        Series
                      </span>
                    </div>
                    {s.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{s.description}</p>
                    )}
                    <div className="text-sm text-gray-500">
                      {s.recordings.length} recordings
                    </div>
                  </div>
                </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recommendations */}
      {guide.recommendations?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Recommendations ({guide.recommendations.length})</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {guide.recommendations.map((rec: any) => (
              <Link
                key={rec.id}
                href={`/recommendations/${rec.id}`}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                    {RECOMMENDATION_CATEGORIES.find((c) => c.value === rec.category)?.label || rec.category}
                  </span>
                  {rec.priceRange && (
                    <span className="text-xs text-gray-500">{rec.priceRange}</span>
                  )}
                </div>
                <h3 className="font-medium text-gray-900 mb-1">{rec.name}</h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full inline-block mb-2">
                  {rec.procedureType}
                </span>
                {rec.myComment && (
                  <p className="text-sm text-gray-500 line-clamp-2 mt-1">&ldquo;{rec.myComment}&rdquo;</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>{rec.endorsementCount} {rec.endorsementCount === 1 ? "endorsement" : "endorsements"}</span>
                  <span>{rec.helpfulCount} helpful</span>
                  {rec.location && <span>{rec.location}</span>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section>
        <h2 className="text-xl font-bold mb-4">Reviews ({guide.reviewsReceived?.length || 0})</h2>
        {guide.reviewsReceived?.length === 0 ? (
          <p className="text-gray-400">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {guide.reviewsReceived
              .sort((a: any, b: any) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime())
              .map((r: any) => (
              <div key={r.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{r.author?.name || "Anonymous"}</span>
                  <span className="text-yellow-500 text-sm">
                    {"\u2605".repeat(r.rating)}{"\u2606".repeat(5 - r.rating)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    r.callId ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                  }`}>
                    {r.callId ? "Call Review" : "Recording Review"}
                  </span>
                </div>
                {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                {r.createdAt && (
                  <p className="text-xs text-gray-400 mt-1">{parseDate(r.createdAt).toLocaleDateString()}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}