import type { Category, Status, Urgency } from "@/lib/types";

export const CATEGORY_STYLES: Record<Category, string> = {
  housing: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  food: "bg-amber-50 text-amber-800 ring-amber-600/20",
  healthcare: "bg-sky-50 text-sky-700 ring-sky-600/20",
  legal: "bg-violet-50 text-violet-700 ring-violet-600/20",
  emergency: "bg-red-50 text-red-700 ring-red-600/20",
  general: "bg-stone-100 text-stone-700 ring-stone-500/20",
};

export const STATUS_STYLES: Record<Status, string> = {
  new: "bg-brand-soft text-brand-dark ring-brand/20",
  in_review: "bg-blue-50 text-blue-700 ring-blue-600/20",
  in_progress: "bg-amber-50 text-amber-800 ring-amber-600/20",
  resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  closed: "bg-stone-100 text-stone-600 ring-stone-500/20",
};

export const URGENCY_STYLES: Record<Urgency, string> = {
  low: "bg-stone-100 text-stone-600 ring-stone-500/20",
  medium: "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
  high: "bg-orange-50 text-orange-700 ring-orange-600/20",
  critical: "bg-red-100 text-red-800 ring-red-600/30",
};

/**
 * Staff dashboard timestamps stay on the browser's own locale by default
 * (staff view is English-only in this pass); pass `locale` explicitly for
 * any future requester-facing surface that should respect the chosen
 * language instead.
 */
export function formatDateTime(iso: string, locale?: string): string {
  return new Date(iso).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
