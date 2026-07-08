import type { SVGProps } from "react";
import type { Category } from "@/lib/types";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps): IconProps {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };
}

/** House outline — housing & rent assistance. */
export function HousingIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

/** Bowl with a rising line — food security. */
export function FoodIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12h16a8 6 0 0 1-16 0Z" />
      <path d="M8 12c-.6-1.6-.4-3 1-4.5M12 12c-.4-2 0-3.6 1.4-5M16 12c.4-1.8-.2-3.2-1-4.5" />
    </svg>
  );
}

/** Rounded medical cross in a circle — healthcare access. */
export function HealthcareIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  );
}

/** Scale of justice — legal aid. */
export function LegalIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v16M8 20h8" />
      <path d="M5 7h6M13 7h6" />
      <path d="M5 7 2.5 12a2.6 2.6 0 0 0 5 0Zm14 0-2.5 5a2.6 2.6 0 0 0 5 0Z" />
    </svg>
  );
}

/** Alert triangle — emergencies. */
export function EmergencyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4.5 21 19H3Z" />
      <path d="M12 10v4M12 16.7v.1" />
    </svg>
  );
}

/** Speech bubble — general / anything else. */
export function GeneralIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5h16v11H9.5L5.5 20v-3.5H4Z" />
    </svg>
  );
}

export const CATEGORY_ICONS: Record<Category, (props: IconProps) => React.JSX.Element> = {
  housing: HousingIcon,
  food: FoodIcon,
  healthcare: HealthcareIcon,
  legal: LegalIcon,
  emergency: EmergencyIcon,
  general: GeneralIcon,
};

/**
 * Signature mark for the product: a shield (protection, trust) holding a
 * checkmark (human review, always). Stands in for a wordmark in the header
 * and favicon-sized contexts.
 */
export function BrandMark(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 1.8, ...props })}>
      <path d="M12 3.5 19 6v5.2c0 4.6-3 7.7-7 9.3-4-1.6-7-4.7-7-9.3V6Z" />
      <path d="M8.75 12.25 11 14.5l4.25-4.75" />
    </svg>
  );
}
