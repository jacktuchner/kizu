"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MatchBadge from "@/components/MatchBadge";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import ReportButton from "@/components/ReportButton";
import MessageButton from "@/components/MessageButton";
import ContentAcknowledgmentModal from "@/components/ContentAcknowledgmentModal";
function TranscriptSection({ transcription }: { transcription: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="font-semibold text-sm text-gray-700">
          Transcript
        </h3>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <p className="text-sm text-gray-600 whitespace-pre-wrap mt-3 pt-3 border-t border-gray-200">
          {transcription}
        </p>
      )}
    </div>
  );
}


const categoryLabels: Record<string, string> = {
  WEEKLY_TIMELINE: "Week-by-Week Timeline",
  WISH_I_KNEW: "Things I Wish I Knew",
  PRACTICAL_TIPS: "Practical Tips",
  MENTAL_HEALTH: "Mental & Emotional Health",
  RETURN_TO_ACTIVITY: "Return to Activity",
  MISTAKES_AND_LESSONS: "Mistakes & Lessons Learned",
};


const activityLabels: Record<string, string> = {
  SEDENTARY: "Sedentary",
  RECREATIONAL: "Recreational",
  COMPETITIVE_ATHLETE: "Competitive Athlete",
  PROFESSIONAL_ATHLETE: "Professional Athlete",
};


export default function RecordingDetailPage() {
  const { id } = useParams();
  const { data: session } = useSession();
  const [recording, setRecording] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [review, setReview] = useState({ rating: 5, matchRelevance: 5, helpfulness: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  const userId = (session?.user as any)?.id;

  async function loadRecording() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recordings/${id}`);
      if (!res.ok) throw new Error("Failed to load recording.");
      const data = await res.json();
      setRecording(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load recording.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecording();
  }, [id]);

  // Check if user is the guide (always has access)
  const isGuide = recording?.contributorId === userId;

  async function submitReview() {
    if (!recording) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: recording.contributorId,
          recordingId: recording.id,
          ...review,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit review.");
      const newReview = await res.json();
      setRecording((prev: any) => ({
        ...prev,
        reviews: [newReview, ...(prev.reviews || [])],
      }));
      setShowReviewForm(false);
      setReviewSubmitted(true);
      setTimeout(() => setReviewSubmitted(false), 3000);
    } catch (err) {
      console.error(err);
      setReviewError("Failed to submit review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>;
  if (error) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between">
        <p className="text-sm text-red-700">{error}</p>
        <button onClick={loadRecording} className="text-sm text-red-600 hover:text-red-700 font-medium">Retry</button>
      </div>
    </div>
  );
  if (!recording) return <div className="max-w-4xl mx-auto px-4 py-8">Recording not found.</div>;

  const avgRating = recording.reviews?.length
    ? (recording.reviews.reduce((a: number, r: any) => a + r.rating, 0) / recording.reviews.length).toFixed(1)
    : null;

  // All recordings are free — always viewable
  const canViewContent = true;

  return (
    <ContentAcknowledgmentModal>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={isGuide ? "/dashboard/guide" : "/watch"}
          className="text-sm text-teal-600 hover:text-teal-700 mb-4 inline-block"
        >
          &larr; {isGuide ? "Back to Dashboard" : "Back to Stories"}
        </Link>

        {/* Disclaimer Banner */}
        <DisclaimerBanner variant="warning" />

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Player Area */}
          <div className="bg-black aspect-video flex items-center justify-center">
            {recording.isVideo ? (
              <video
                src={recording.mediaUrl}
                controls
                className="w-full h-full"
                poster={recording.thumbnailUrl || undefined}
              >
                Your browser does not support the video element.
              </video>
            ) : (
              <div className="w-full p-8">
                <audio src={recording.mediaUrl} controls className="w-full">
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                    {categoryLabels[recording.category] || recording.category}
                  </span>
                  {recording.series && (
                    <Link
                      href={`/series/${recording.series.id}`}
                      className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Part of: {recording.series.title}
                    </Link>
                  )}
                </div>
                <h1 className="text-2xl font-bold">{recording.title}</h1>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">{recording.viewCount} views</p>
              </div>
            </div>

            {recording.description && (
              <p className="text-gray-600 mb-6">{recording.description}</p>
            )}

            {/* Transcription */}
            {recording.transcription && (
              <TranscriptSection transcription={recording.transcription} />
            )}

            {/* Guide Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                  <span className="text-teal-700 font-semibold">
                    {recording.guide?.name?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
                <div>
                  <Link href={`/guides/${recording.contributorId}`} className="font-semibold hover:text-teal-700">
                    {recording.guide?.name || "Anonymous"}
                  </Link>
                  {avgRating && (
                    <p className="text-sm text-gray-500">
                      {avgRating} avg rating &middot; {recording.reviews.length} reviews
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs bg-white text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                  {recording.procedureType}
                </span>
                <span className="text-xs bg-white text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                  {recording.ageRange}
                </span>
                <span className="text-xs bg-white text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                  {activityLabels[recording.activityLevel] || recording.activityLevel}
                </span>
              </div>

            </div>

            {/* Book a Call / Message CTA */}
            {!isGuide && (
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-5 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      Want personalized advice from {recording.guide?.name?.split(" ")[0] || "this guide"}?
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {recording.guide?.profile?.isAvailableForCalls
                        ? `Book a 1-on-1 video call \u00b7 $${(recording.guide.profile.hourlyRate / 2).toFixed(0)}/30min`
                        : "Send them a message to connect"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageButton guideId={recording.contributorId} />
                    {recording.guide?.profile?.isAvailableForCalls && (
                      <Link
                        href={`/book/${recording.contributorId}`}
                        className="inline-flex items-center justify-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 font-medium text-sm whitespace-nowrap"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Book a Call
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Report Button */}
            <div className="flex justify-end mb-6">
              <ReportButton
                recordingId={recording.id}
                contentTitle={recording.title}
              />
            </div>

            {/* Reviews */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Reviews ({recording.reviews?.length || 0})</h2>
                {session && !isGuide && (
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Write a Review
                  </button>
                )}
              </div>

              {reviewSubmitted && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                  <p className="text-sm text-green-700 font-medium">Review submitted successfully!</p>
                </div>
              )}

              {showReviewForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-700">Overall (1-5)</label>
                      <input type="number" min={1} max={5} value={review.rating}
                        onChange={(e) => setReview(r => ({...r, rating: parseInt(e.target.value)}))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Match Relevance (1-5)</label>
                      <input type="number" min={1} max={5} value={review.matchRelevance}
                        onChange={(e) => setReview(r => ({...r, matchRelevance: parseInt(e.target.value)}))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Helpfulness (1-5)</label>
                      <input type="number" min={1} max={5} value={review.helpfulness}
                        onChange={(e) => setReview(r => ({...r, helpfulness: parseInt(e.target.value)}))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm mt-1" />
                    </div>
                  </div>
                  <textarea value={review.comment} onChange={(e) => setReview(r => ({...r, comment: e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3}
                    placeholder="Share your thoughts about this recording..." />
                  {reviewError && (
                    <p className="text-sm text-red-600">{reviewError}</p>
                  )}
                  <button onClick={submitReview} disabled={submittingReview}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm font-medium">
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              )}

              {recording.reviews?.length === 0 ? (
                <p className="text-gray-400 text-sm">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {recording.reviews.map((r: any) => (
                    <div key={r.id} className="border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{r.author?.name || "Anonymous"}</span>
                        <span className="text-yellow-500 text-sm">
                          {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                        </span>
                      </div>
                      {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ContentAcknowledgmentModal>
  );
}
