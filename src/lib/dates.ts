/**
 * Parse a timestamp string from Supabase into a Date object.
 *
 * Supabase returns timestamp(3) values without a timezone suffix (e.g.
 * "2026-03-04T03:45:56.023" instead of "2026-03-04T03:45:56.023Z").
 * Without the "Z", JavaScript's `new Date()` treats the string as local
 * time, shifting it by the user's UTC offset. This helper appends "Z"
 * when no timezone indicator is present so the timestamp is correctly
 * interpreted as UTC.
 */
export function parseDate(s: string): Date {
  if (!s.endsWith("Z") && !s.includes("+")) return new Date(s + "Z");
  return new Date(s);
}
