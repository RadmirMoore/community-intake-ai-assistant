import { z } from "zod";

/**
 * Service categories a small nonprofit typically triages: food security,
 * housing, healthcare access, legal services, and emergencies.
 */
export const CATEGORIES = [
  "housing",
  "food",
  "healthcare",
  "legal",
  "emergency",
  "general",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** How quickly a human should look at this request. */
export const URGENCY_LEVELS = ["low", "medium", "high", "critical"] as const;
export type Urgency = (typeof URGENCY_LEVELS)[number];

/** Workflow status a staff member moves the request through. */
export const STATUSES = [
  "new",
  "in_review",
  "in_progress",
  "resolved",
  "closed",
] as const;
export type Status = (typeof STATUSES)[number];

/**
 * What the person submits through the public intake form. We intentionally keep
 * contact fields optional so someone in crisis can ask for help without being
 * forced to hand over sensitive data.
 */
export const intakeInputSchema = z.object({
  fullName: z.string().trim().min(1, "Please share a name we can use.").max(120),
  email: z.string().trim().email("Enter a valid email.").max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  preferredContact: z.enum(["email", "phone", "either"]).default("either"),
  zipCode: z.string().trim().max(16).optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more so we can route your request.")
    .max(4000),
  consent: z.literal(true, {
    message: "We need your consent to have a staff member review this request.",
  }),
});
export type IntakeInput = z.infer<typeof intakeInputSchema>;

/**
 * The AI-generated triage. This is always advisory: every field is meant to
 * speed up a human, never to replace them.
 */
export const triageSchema = z.object({
  category: z.enum(CATEGORIES),
  urgency: z.enum(URGENCY_LEVELS),
  summary: z.string(),
  suggestedFollowUp: z.string(),
  recommendedActions: z.array(z.string()),
  safetyFlags: z.array(z.string()),
  requiresImmediateAttention: z.boolean(),
  confidence: z.number().min(0).max(1),
  model: z.string(),
  generatedByAI: z.boolean(),
});
export type Triage = z.infer<typeof triageSchema>;

/** A stored intake record: what the person sent plus the triage and workflow. */
export interface Submission {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: Status;
  input: IntakeInput;
  triage: Triage;
  staffNotes: string;
}

export const statusUpdateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  staffNotes: z.string().max(4000).optional(),
});
export type StatusUpdate = z.infer<typeof statusUpdateSchema>;

export const CATEGORY_LABELS: Record<Category, string> = {
  housing: "Housing",
  food: "Food & nutrition",
  healthcare: "Healthcare access",
  legal: "Legal aid",
  emergency: "Emergency",
  general: "General / other",
};

export const STATUS_LABELS: Record<Status, string> = {
  new: "New",
  in_review: "In review",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};
