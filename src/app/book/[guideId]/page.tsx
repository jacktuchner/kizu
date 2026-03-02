"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
}

interface BookedCall {
  start: string;
  end: string;
}

interface TimeSlot {
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM (start + duration)
  label: string;      // "9:00 - 9:30 AM"
  dateLabel: string;  // "Mon, Feb 23"
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatTime12(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/** Add minutes to a HH:MM string, return HH:MM */
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMins = h * 60 + m + minutes;
  const hh = Math.floor(totalMins / 60).toString().padStart(2, "0");
  const mm = (totalMins % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Format a slot range like "9:00 - 9:30 AM" or "11:30 AM - 12:00 PM" */
function formatSlotRange(startTime: string, endTime: string): string {
  const [sh] = startTime.split(":").map(Number);
  const [eh] = endTime.split(":").map(Number);
  const startAmpm = sh >= 12 ? "PM" : "AM";
  const endAmpm = eh >= 12 ? "PM" : "AM";

  const startH12 = sh % 12 || 12;
  const endH12 = eh % 12 || 12;
  const startMin = startTime.split(":")[1];
  const endMin = endTime.split(":")[1];

  // Only show AM/PM on start if it differs from end
  if (startAmpm === endAmpm) {
    return `${startH12}:${startMin} - ${endH12}:${endMin} ${endAmpm}`;
  }
  return `${startH12}:${startMin} ${startAmpm} - ${endH12}:${endMin} ${endAmpm}`;
}

export default function BookCallPage() {
  const { guideId } = useParams();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [guide, setGuide] = useState<any>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [bookedCalls, setBookedCalls] = useState<BookedCall[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [duration, setDuration] = useState(30);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [questionsInAdvance, setQuestionsInAdvance] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    async function load() {
      try {
        const [guideRes, availRes] = await Promise.all([
          fetch(`/api/guides/${guideId}`),
          fetch(`/api/guides/${guideId}/availability`),
        ]);
        if (guideRes.ok) setGuide(await guideRes.json());
        if (availRes.ok) {
          const availData = await availRes.json();
          setAvailability(availData.slots || []);
          setBookedCalls(availData.bookedCalls || []);
          setBlockedDates(availData.blockedDates || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [guideId]);

  // Group availability by day of week
  const availabilityByDay = useMemo(() => {
    const grouped: Record<number, AvailabilitySlot[]> = {};
    availability.forEach((slot) => {
      if (!grouped[slot.dayOfWeek]) grouped[slot.dayOfWeek] = [];
      grouped[slot.dayOfWeek].push(slot);
    });
    return grouped;
  }, [availability]);

  const timezone = availability[0]?.timezone || "America/New_York";

  // Generate all available slots for the next 14 days
  const upcomingSlots = useMemo(() => {
    if (availability.length === 0) return [];

    const slots: TimeSlot[] = [];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    for (let d = 0; d < 14; d++) {
      const date = new Date(tomorrow);
      date.setDate(date.getDate() + d);
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split("T")[0];
      const dateLabel = `${SHORT_DAY_NAMES[dayOfWeek]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;

      // Skip blocked dates (guide's time off)
      if (blockedDates.includes(dateStr)) continue;

      const daySlots = availabilityByDay[dayOfWeek];
      if (!daySlots || daySlots.length === 0) continue;

      // Generate 15-min interval slots within each availability window
      for (const avail of daySlots) {
        const [sh, sm] = avail.startTime.split(":").map(Number);
        const [eh, em] = avail.endTime.split(":").map(Number);
        const startMins = sh * 60 + sm;
        const endMins = eh * 60 + em;

        for (let m = startMins; m + duration <= endMins; m += 15) {
          const startHH = Math.floor(m / 60).toString().padStart(2, "0");
          const startMM = (m % 60).toString().padStart(2, "0");
          const startTime = `${startHH}:${startMM}`;
          const endTime = addMinutesToTime(startTime, duration);

          // Check overlap with booked calls
          const slotStartMs = new Date(`${dateStr}T${startTime}:00`).getTime();
          const slotEndMs = slotStartMs + duration * 60000;

          const overlaps = bookedCalls.some((call) => {
            const callStart = new Date(call.start).getTime();
            const callEnd = new Date(call.end).getTime();
            return slotStartMs < callEnd && slotEndMs > callStart;
          });

          if (!overlaps) {
            slots.push({
              date: dateStr,
              startTime,
              endTime,
              label: formatSlotRange(startTime, endTime),
              dateLabel,
            });
          }
        }
      }
    }

    return slots;
  }, [availability, availabilityByDay, bookedCalls, blockedDates, duration]);

  // Group slots by date for display
  const slotsByDate = useMemo(() => {
    const grouped: { date: string; dateLabel: string; slots: TimeSlot[] }[] = [];
    let currentDate = "";
    for (const slot of upcomingSlots) {
      if (slot.date !== currentDate) {
        currentDate = slot.date;
        grouped.push({ date: slot.date, dateLabel: slot.dateLabel, slots: [] });
      }
      grouped[grouped.length - 1].slots.push(slot);
    }
    return grouped;
  }, [upcomingSlots]);

  // Clear selection when duration changes
  useEffect(() => {
    setSelectedSlot(null);
  }, [duration]);

  const hasAvailability = availability.length > 0;
  const canBook = selectedSlot !== null;

  async function handleBook() {
    if (!selectedSlot) return;
    setBooking(true);
    setError(null);

    try {
      const scheduledAt = new Date(`${selectedSlot.date}T${selectedSlot.startTime}`).toISOString();

      const res = await fetch("/api/checkout/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contributorId: guideId,
          scheduledAt,
          durationMinutes: duration,
          questionsInAdvance: questionsInAdvance || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create checkout session");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setBooking(false);
    }
  }

  const userRole = (session?.user as any)?.role;
  const isGuideOnly = userRole === "GUIDE";

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-8">Loading...</div>;
  if (!guide) return <div className="max-w-2xl mx-auto px-4 py-8">Guide not found.</div>;

  if (isGuideOnly) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`/guides/${guideId}`} className="text-sm text-teal-600 hover:text-teal-700 mb-4 inline-block">
          &larr; Back to Profile
        </Link>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Want to book a session?</h2>
          <p className="text-gray-600 mb-6">
            Add a health profile so we can match you with the right guide.
          </p>
          <Link
            href="/dashboard/seeker"
            className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 font-medium transition-colors"
          >
            Set Up Health Profile
          </Link>
        </div>
      </div>
    );
  }

  const rate = guide.profile?.hourlyRate || 50;
  const price = duration === 60 ? rate : rate / 2;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href={`/guides/${guideId}`} className="text-sm text-teal-600 hover:text-teal-700 mb-4 inline-block">
        &larr; Back to Profile
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
        <h1 className="text-2xl font-bold mb-2">Book a Call</h1>
        <p className="text-gray-600 mb-6">Schedule a 1-on-1 video call with {guide.name}</p>

        {/* Guide summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 flex items-center gap-3">
          <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
            <span className="text-teal-700 font-semibold text-lg">
              {guide.name?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
          <div>
            <p className="font-semibold">{guide.name}</p>
            <p className="text-sm text-gray-500">
              {guide.profile?.procedureType} &middot; {guide.profile?.ageRange} &middot; {guide.profile?.timeSinceSurgery} post-op
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Duration picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Call Duration</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setDuration(30)}
                className={`p-3 rounded-lg border-2 text-center transition-colors ${
                  duration === 30 ? "border-teal-500 bg-teal-50" : "border-gray-200 hover:border-gray-300"
                }`}>
                <p className="font-semibold">30 minutes</p>
                <p className="text-sm text-gray-500">${(rate / 2).toFixed(2)}</p>
              </button>
              <button type="button" onClick={() => setDuration(60)}
                className={`p-3 rounded-lg border-2 text-center transition-colors ${
                  duration === 60 ? "border-teal-500 bg-teal-50" : "border-gray-200 hover:border-gray-300"
                }`}>
                <p className="font-semibold">60 minutes</p>
                <p className="text-sm text-gray-500">${rate.toFixed(2)}</p>
              </button>
            </div>
          </div>

          {/* Available slots grouped by day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pick a Time</label>
            <p className="text-xs text-gray-400 mb-3">
              Showing available {duration}-minute slots for the next 2 weeks ({timezone})
            </p>

            {!hasAvailability && (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-500">This guide hasn&apos;t set up their availability yet.</p>
              </div>
            )}

            {hasAvailability && slotsByDate.length === 0 && (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-500">No available slots in the next 2 weeks.</p>
                <p className="text-xs text-gray-400 mt-1">All times may be booked. Try a different duration or check back later.</p>
              </div>
            )}

            {slotsByDate.length > 0 && (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {slotsByDate.map(({ date, dateLabel, slots }) => (
                  <div key={date}>
                    <p className="text-sm font-semibold text-gray-800 mb-2 sticky top-0 bg-white py-1">
                      {dateLabel}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {slots.map((slot) => {
                        const isSelected = selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime;
                        return (
                          <button
                            key={`${slot.date}-${slot.startTime}`}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isSelected
                                ? "bg-teal-600 text-white shadow-sm"
                                : "bg-gray-100 text-gray-700 hover:bg-teal-50 hover:text-teal-700"
                            }`}
                          >
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected slot confirmation */}
          {selectedSlot && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-sm font-medium text-teal-900">
                  {selectedSlot.dateLabel} &middot; {selectedSlot.label}
                </p>
                <p className="text-xs text-teal-600">{duration}-minute call with {guide.name}</p>
              </div>
            </div>
          )}

          {/* Questions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Questions for the Guide (optional)
            </label>
            <textarea value={questionsInAdvance}
              onChange={(e) => setQuestionsInAdvance(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3}
              placeholder="Share any specific questions you'd like to discuss so your guide can prepare..." />
          </div>

          {/* Total + submit */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">Total</span>
              <span className="text-2xl font-bold text-teal-700">${price.toFixed(2)}</span>
            </div>
            {error && (
              <p className="text-red-500 text-sm mb-3 text-center">{error}</p>
            )}
            <button onClick={handleBook} disabled={booking || !canBook}
              className="w-full bg-teal-600 text-white font-semibold py-3 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {booking ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                `Proceed to Payment - $${price.toFixed(2)}`
              )}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">
              You will be redirected to Stripe to complete your payment securely.
            </p>
            <p className="text-xs text-amber-600 text-center mt-1">
              Cancellations made less than 24 hours before the call are non-refundable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
