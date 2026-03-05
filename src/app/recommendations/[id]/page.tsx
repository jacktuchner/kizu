"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { RECOMMENDATION_CATEGORIES } from "@/lib/constants";
import { parseDate } from "@/lib/dates";

interface Endorsement {
  id: string;
  contributorId: string;
  comment?: string;
  recoveryPhase?: string;
  source: string;
  createdAt: string;
  guide: { id: string; name: string; image?: string };
}

interface Recommendation {
  id: string;
  name: string;
  category: string;
  procedureType: string;
  description?: string;
  location?: string;
  url?: string;
  priceRange?: string;
  endorsementCount: number;
  helpfulCount: number;
  hasVoted: boolean;
  endorsements: Endorsement[];
  createdBy: { id: string; name: string; image?: string };
}

export default function RecommendationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [comments, setComments] = useState<{ id: string; content: string; createdAt: string; user: { id: string; name: string; image?: string } }[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [recRes, commentsRes] = await Promise.all([
          fetch(`/api/recommendations/${id}`),
          fetch(`/api/recommendations/${id}/comments`),
        ]);
        if (recRes.ok) {
          setRecommendation(await recRes.json());
        }
        if (commentsRes.ok) {
          setComments(await commentsRes.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function toggleVote() {
    if (!session?.user || !recommendation) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/recommendations/${id}/vote`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setRecommendation((prev) =>
          prev ? { ...prev, hasVoted: data.voted, helpfulCount: data.helpfulCount } : null
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVoting(false);
    }
  }

  async function submitComment() {
    if (!session?.user || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/recommendations/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        setComments((prev) => [...prev, created]);
        setNewComment("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  }

  const categoryLabel = (value: string) =>
    RECOMMENDATION_CATEGORIES.find((c) => c.value === value)?.label || value;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Recommendation not found</h1>
          <p className="text-gray-500 mb-4">This recommendation may have been removed.</p>
          <Link href="/recommendations" className="text-teal-600 hover:text-teal-700 font-medium">
            Back to Recommendations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/recommendations"
          className="inline-flex items-center text-sm text-gray-500 hover:text-teal-600 mb-6"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Recommendations
        </Link>

        {/* Main card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full font-medium">
                {categoryLabel(recommendation.category)}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                {recommendation.procedureType}
              </span>
              {recommendation.priceRange && (
                <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                  {recommendation.priceRange}
                </span>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">{recommendation.name}</h1>

          {recommendation.description && (
            <p className="text-gray-600 mb-4">{recommendation.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
            {recommendation.location && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {recommendation.location}
              </span>
            )}
            {recommendation.url && (
              <a
                href={recommendation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-teal-600 hover:text-teal-700"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Visit Website
              </a>
            )}
          </div>

          {/* Stats & Vote */}
          <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">
                <span className="font-semibold text-teal-700">{recommendation.endorsementCount}</span>{" "}
                {recommendation.endorsementCount === 1 ? "endorsement" : "endorsements"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
              <span className="text-sm">
                <span className="font-semibold">{recommendation.helpfulCount}</span> helpful
              </span>
            </div>
            {session?.user && (
              <button
                onClick={toggleVote}
                disabled={voting}
                className={`ml-auto px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  recommendation.hasVoted
                    ? "bg-teal-100 text-teal-700 hover:bg-teal-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } disabled:opacity-50`}
              >
                {voting ? "..." : recommendation.hasVoted ? "Marked Helpful" : "Mark as Helpful"}
              </button>
            )}
          </div>
        </div>

        {/* Endorsements */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Endorsements ({recommendation.endorsements.length})
          </h2>

          {recommendation.endorsements.length === 0 ? (
            <p className="text-gray-500 text-sm">No endorsements yet.</p>
          ) : (
            <div className="space-y-4">
              {recommendation.endorsements.map((endorsement) => (
                <div key={endorsement.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Link
                      href={`/guides/${endorsement.guide.id}`}
                      className="flex items-center gap-2 hover:text-teal-600"
                    >
                      <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                        {endorsement.guide.image ? (
                          <img
                            src={endorsement.guide.image}
                            alt={endorsement.guide.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-teal-700 text-sm font-medium">
                            {endorsement.guide.name?.[0]?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {endorsement.guide.name}
                      </span>
                    </Link>
                    {endorsement.recoveryPhase && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        Used: {endorsement.recoveryPhase}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">
                      {parseDate(endorsement.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {endorsement.comment && (
                    <p className="text-sm text-gray-600 ml-11">{endorsement.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Comments ({comments.length})
          </h2>

          {session?.user && (
            <div className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts or ask a question..."
                rows={3}
                maxLength={1000}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{newComment.length}/1000</span>
                <button
                  onClick={submitComment}
                  disabled={submittingComment || !newComment.trim()}
                  className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm font-medium"
                >
                  {submittingComment ? "Posting..." : "Post Comment"}
                </button>
              </div>
            </div>
          )}

          {comments.length === 0 ? (
            <p className="text-gray-500 text-sm">No comments yet. Be the first to share your thoughts!</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                      {comment.user.image ? (
                        <img
                          src={comment.user.image}
                          alt={comment.user.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 text-xs font-medium">
                          {comment.user.name?.[0]?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{comment.user.name}</span>
                    <span className="text-xs text-gray-400">
                      {parseDate(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 ml-10">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
