"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import RecordingCard from "@/components/RecordingCard";
import SeriesCard from "@/components/SeriesCard";
import FilterSidebar from "@/components/FilterSidebar";
import ContentAcknowledgmentModal from "@/components/ContentAcknowledgmentModal";
import DisclaimerBanner from "@/components/DisclaimerBanner";
type SortOption = "match" | "newest" | "most_viewed" | "highest_rated";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "match", label: "Best Match" },
  { value: "newest", label: "Newest First" },
  { value: "most_viewed", label: "Most Viewed" },
  { value: "highest_rated", label: "Highest Rated" },
];

function WatchContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const currentUserId = (session?.user as any)?.id as string | undefined;
  const currentUserRole = (session?.user as any)?.role as string | undefined;
  const isGuideOnly = currentUserRole === "GUIDE";

  const [filters, setFilters] = useState({
    procedures: [] as string[],
    ageRanges: [] as string[],
    genders: [] as string[],
    activityLevels: [] as string[],
    categories: [] as string[],
  });
  const [sortBy, setSortBy] = useState<SortOption>("match");
  const [searchQuery, setSearchQuery] = useState("");
  const [recordings, setRecordings] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [userProcedures, setUserProcedures] = useState<string[]>([]);
  const [selectedProcedure, setSelectedProcedure] = useState<string>("");

  // Fetch the seeker's conditions on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;
        const data = await res.json();
        const procs: string[] = data.procedureTypes || [];
        const active: string = data.activeProcedureType || "";
        if (procs.length > 0) {
          setUserProcedures(procs);
          setSelectedProcedure(active || procs[0]);
        }
      } catch {
        // Not logged in or no profile — leave empty
      }
    }
    fetchProfile();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", pagination.page.toString());
    if (selectedProcedure) {
      params.set("matchProcedure", selectedProcedure);
    }

    try {
      const [recordingsRes, seriesRes] = await Promise.all([
        fetch(`/api/recordings?${params}`),
        fetch(`/api/series?status=PUBLISHED`),
      ]);

      if (!recordingsRes.ok) throw new Error("Failed to load recordings.");

      const recordingsData = await recordingsRes.json();
      setRecordings(recordingsData.recordings || []);
      setPagination(recordingsData.pagination || { page: 1, totalPages: 1, total: 0 });

      if (seriesRes.ok) {
        const seriesData = await seriesRes.json();
        setSeries(seriesData.series || []);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load recordings.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, selectedProcedure]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleFilterChange(key: string, values: string[]) {
    setFilters((prev) => ({ ...prev, [key]: values }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  // Filter recordings client-side for multi-select
  const filteredRecordings = recordings.filter((rec) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        rec.title?.toLowerCase().includes(query) ||
        rec.guide?.name?.toLowerCase().includes(query) ||
        rec.description?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Procedure filter (match any selected)
    if (filters.procedures.length > 0 && !filters.procedures.includes(rec.procedureType)) {
      return false;
    }

    // Age range filter
    if (filters.ageRanges.length > 0 && !filters.ageRanges.includes(rec.ageRange)) {
      return false;
    }

    // Activity level filter
    if (filters.activityLevels.length > 0 && !filters.activityLevels.includes(rec.activityLevel)) {
      return false;
    }

    // Gender filter
    if (filters.genders.length > 0 && !filters.genders.includes(rec.gender)) {
      return false;
    }

    // Category filter
    if (filters.categories.length > 0 && !filters.categories.includes(rec.category)) {
      return false;
    }

    return true;
  });

  // Filter series client-side
  const filteredSeries = series.filter((s) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        s.title?.toLowerCase().includes(query) ||
        s.guide?.name?.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Procedure filter
    if (filters.procedures.length > 0 && !filters.procedures.includes(s.procedureType)) {
      return false;
    }

    return true;
  });

  // Sort recordings
  const sortedRecordings = [...filteredRecordings].sort((a, b) => {
    switch (sortBy) {
      case "match":
        return (b.matchScore || 0) - (a.matchScore || 0);
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "most_viewed":
        return (b.viewCount || 0) - (a.viewCount || 0);
      case "highest_rated":
        const aRating = a.reviews?.length
          ? a.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / a.reviews.length
          : 0;
        const bRating = b.reviews?.length
          ? b.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / b.reviews.length
          : 0;
        return bRating - aRating;
      default:
        return 0;
    }
  });

  const totalActiveFilters =
    filters.procedures.length +
    filters.ageRanges.length +
    filters.genders.length +
    filters.activityLevels.length +
    filters.categories.length;

  return (
    <ContentAcknowledgmentModal>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section - Teal Gradient */}
        <div className="bg-gradient-to-br from-teal-600 to-teal-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold">Watch Recovery Stories</h1>
            </div>
            <p className="text-lg sm:text-xl text-teal-100 max-w-2xl">
              All recordings are free &mdash; watch anytime.
              Real people sharing what recovery is actually like.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm bg-white/10 px-3 py-1.5 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                On-demand access
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm bg-white/10 px-3 py-1.5 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Matched to your situation
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm bg-white/10 px-3 py-1.5 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                100% free
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DisclaimerBanner dismissible />

          {userProcedures.length >= 2 && (
            <div className="mb-6 flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
              <label htmlFor="watch-condition-selector" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Matching for:
              </label>
              <select
                id="watch-condition-selector"
                value={selectedProcedure}
                onChange={(e) => {
                  setSelectedProcedure(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                {userProcedures.map((proc) => (
                  <option key={proc} value={proc}>
                    {proc}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between">
              <p className="text-sm text-red-700">{error}</p>
              <button onClick={fetchData} className="text-sm text-red-600 hover:text-red-700 font-medium">Retry</button>
            </div>
          )}

          {/* Looking for mentors CTA */}
          <div className="mb-8 p-4 bg-cyan-50 border border-cyan-200 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-medium text-cyan-900">Want to talk to someone live?</p>
                <p className="text-sm text-cyan-700">Book a 1-on-1 video call with a recovery mentor.</p>
              </div>
              <Link
                href="/guides"
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Book a Mentor
              </Link>
            </div>
          </div>

          {/* Search and Sort Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search recordings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-teal-500"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile filter button */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {totalActiveFilters > 0 && (
                <span className="bg-teal-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {totalActiveFilters}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-24">
                <h2 className="font-semibold text-gray-900 mb-4">Filter Recordings</h2>
                <FilterSidebar
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  showCategory={true}
                />
              </div>
            </aside>

            {/* Mobile Filters Modal */}
            {showMobileFilters && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
                <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white p-6 overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">Filters</h2>
                    <button onClick={() => setShowMobileFilters(false)} className="p-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <FilterSidebar
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    showCategory={true}
                  />
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="w-full mt-6 py-3 bg-teal-600 text-white rounded-lg font-medium"
                  >
                    Show {sortedRecordings.length} results
                  </button>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1">
              {/* Series Section */}
              {!loading && filteredSeries.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Recovery Series</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    {filteredSeries.map((s: any) => (
                      <SeriesCard
                        key={s.id}
                        id={s.id}
                        title={s.title}
                        guideName={s.guide?.name || "Anonymous"}
                        procedureType={s.procedureType}
                        recordingCount={s.recordingCount}
                        totalDuration={s.totalDuration}
                        matchScore={s.matchScore}
                        matchBreakdown={s.matchBreakdown}
                        isOwn={!!currentUserId && s.guide?.id === currentUserId}
                        hideMatchScore={isGuideOnly || (!!currentUserId && s.guide?.id === currentUserId)}
                      />
                    ))}
                  </div>
                  <hr className="border-gray-200" />
                </div>
              )}

              {/* Individual Recordings Header */}
              {!loading && sortedRecordings.length > 0 && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">Individual Recordings</h2>
                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                      {sortedRecordings.length} available
                    </span>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 h-72 animate-pulse" />
                  ))}
                </div>
              ) : sortedRecordings.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500 text-lg mb-2">No recordings found</p>
                  <p className="text-gray-400 text-sm">Try adjusting your filters or search terms.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedRecordings.map((rec: any) => (
                    <RecordingCard
                      key={rec.id}
                      id={rec.id}
                      title={rec.title}
                      guideName={rec.guide?.name || "Anonymous"}
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
                      matchScore={rec.matchScore}
                      matchBreakdown={rec.matchBreakdown}
                      guideVerified={rec.guide?.contributorStatus === "APPROVED"}
                      isOwn={!!currentUserId && rec.guide?.id === currentUserId}
                      hideMatchScore={isGuideOnly || (!!currentUserId && rec.guide?.id === currentUserId)}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-50 hover:bg-gray-50 bg-white"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-50 hover:bg-gray-50 bg-white"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ContentAcknowledgmentModal>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8">Loading...</div>}>
      <WatchContent />
    </Suspense>
  );
}
