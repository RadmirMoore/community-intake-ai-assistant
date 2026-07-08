import type { Category } from "@/lib/types";

/**
 * Fixed example messages for the landing page's live triage demo. Deliberately
 * NOT free text — a public, unauthenticated page shouldn't invite strangers to
 * type real crisis details into a box, and a fixed set bounds API cost. The
 * API route (src/app/api/preview-triage/route.ts) validates against these IDs
 * server-side, not just in the UI, so calling the endpoint directly can't be
 * used to run arbitrary text through Claude.
 *
 * Each message is written to be realistic but clearly generic/synthetic —
 * not a dramatized personal crisis — and is checked against the keyword list
 * in src/lib/triage.ts so it classifies correctly even via the rule-based
 * fallback (when no ANTHROPIC_API_KEY is configured), not just via the AI.
 */
export interface PreviewPreset {
  label: string;
  category: Category;
  message: string;
}

export const PREVIEW_PRESETS: Record<string, PreviewPreset> = {
  "housing-1": {
    label: "Housing",
    category: "housing",
    message:
      "My landlord gave me a notice that my lease won't be renewed next month, and I haven't been able to find anywhere else in my price range yet. I don't know what my options are or how much time I actually have.",
  },
  "food-1": {
    label: "Food",
    category: "food",
    message:
      "I lost some hours at work this month and my grocery budget won't stretch to the end of it. Is there a food pantry nearby I could go to, and do I need to bring anything to sign up?",
  },
  "healthcare-1": {
    label: "Healthcare",
    category: "healthcare",
    message:
      "I don't have insurance right now and I've had a health issue I keep putting off dealing with because of the cost. Are there any low-cost or sliding-scale clinics in the area?",
  },
  "emergency-1": {
    label: "Emergency",
    category: "emergency",
    message:
      "I need to find safe emergency shelter for tonight — my current living situation isn't safe for me to stay in anymore. What should I do first?",
  },
};

export function isPreviewPresetId(value: unknown): value is keyof typeof PREVIEW_PRESETS {
  return typeof value === "string" && Object.hasOwn(PREVIEW_PRESETS, value);
}
