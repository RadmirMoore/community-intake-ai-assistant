import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  URGENCY_LABELS,
  type Category,
  type Status,
  type Urgency,
} from "@/lib/types";
import { CATEGORY_STYLES, STATUS_STYLES, URGENCY_STYLES } from "@/lib/ui";

const base =
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

export function CategoryBadge({ category }: { category: Category }) {
  return <span className={`${base} ${CATEGORY_STYLES[category]}`}>{CATEGORY_LABELS[category]}</span>;
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`${base} ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>;
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return (
    <span className={`${base} ${URGENCY_STYLES[urgency]}`}>
      {urgency === "critical" ? "● " : ""}
      {URGENCY_LABELS[urgency]}
    </span>
  );
}
