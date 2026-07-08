import Anthropic from "@anthropic-ai/sdk";
import {
  CATEGORIES,
  URGENCY_LEVELS,
  type Category,
  type IntakeInput,
  type Triage,
  type Urgency,
} from "@/lib/types";

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

/**
 * System prompt encodes the nonprofit safety posture: Claude is an assistant to
 * a human caseworker, it must never give legal or medical advice, and it must
 * flag anything that looks like an emergency for immediate human attention.
 */
const SYSTEM_PROMPT = `You are an intake triage assistant for a small nonprofit that helps people with housing, food, healthcare, legal aid, and emergencies. You support overworked, non-technical staff.

Your job is to read one incoming request and produce a structured triage that helps a human caseworker act quickly. You are ADVISORY ONLY. A human always reviews and makes the final decision.

Hard rules:
- Never provide legal advice, medical diagnosis, or treatment recommendations. Suggest connecting the person with a qualified human professional instead.
- If the message suggests immediate danger (domestic violence, suicidal ideation, medical emergency, homelessness tonight, no food for children today, imminent eviction), set requiresImmediateAttention to true and urgency to "critical", and add a clear safety flag.
- Be respectful and non-judgmental. Assume the person is under stress.
- Keep the summary factual and brief (2-4 sentences) for a busy staff member.
- The suggested follow-up message is a DRAFT for staff to review and edit before sending. Write it warmly, in plain language, at roughly a 6th-grade reading level. Write it in the same language the person wrote in, so staff can send it without translation. Do not promise specific outcomes or benefits eligibility.
- The summary and recommendedActions are for staff: always write them in English, even if the request is in another language, and note the request's language in the summary.
- recommendedActions are concrete next steps for staff (e.g. "Verify eligibility for local rental assistance", "Share food pantry hours").
- safetyFlags call out privacy or safety concerns (e.g. "Mentions a minor", "Possible domestic violence", "Shared sensitive health information").`;

const triageTool: Anthropic.Tool = {
  name: "record_triage",
  description:
    "Record the structured triage for one nonprofit intake request. Always call this exactly once.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: [...CATEGORIES],
        description: "Primary service area this request belongs to.",
      },
      urgency: {
        type: "string",
        enum: [...URGENCY_LEVELS],
        description: "How quickly a human should respond.",
      },
      summary: {
        type: "string",
        description: "2-4 sentence factual summary for a busy staff member.",
      },
      suggestedFollowUp: {
        type: "string",
        description: "Draft follow-up message for staff to review and edit before sending.",
      },
      recommendedActions: {
        type: "array",
        items: { type: "string" },
        description: "Concrete next steps for staff.",
      },
      safetyFlags: {
        type: "array",
        items: { type: "string" },
        description: "Privacy or safety concerns a human should be aware of.",
      },
      requiresImmediateAttention: {
        type: "boolean",
        description: "True if this looks like an emergency needing an immediate human.",
      },
      confidence: {
        type: "number",
        description: "Confidence in the category classification, from 0 to 1.",
      },
    },
    required: [
      "category",
      "urgency",
      "summary",
      "suggestedFollowUp",
      "recommendedActions",
      "safetyFlags",
      "requiresImmediateAttention",
      "confidence",
    ],
  },
};

function buildUserMessage(input: IntakeInput): string {
  const contactBits: string[] = [];
  if (input.email) contactBits.push("email on file");
  if (input.phone) contactBits.push("phone on file");
  if (input.zipCode) contactBits.push(`ZIP ${input.zipCode}`);
  const contact = contactBits.length ? contactBits.join(", ") : "no contact details provided";

  return `New intake request.
Preferred contact: ${input.preferredContact} (${contact}).

Message from the person seeking help:
"""
${input.message}
"""

Produce the triage now by calling record_triage.`;
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Runs Claude triage on an intake request. Falls back to a transparent
 * rule-based classification when no API key is configured, so the workflow is
 * always demoable — the fallback clearly marks itself as non-AI output.
 */
export async function triageIntake(input: IntakeInput): Promise<Triage> {
  if (!isAIConfigured()) {
    return ruleBasedTriage(input);
  }

  try {
    return await aiTriage(input);
  } catch (error) {
    // A request for help must never be lost because the AI call failed
    // (rate limit, outage, timeout). Store it with the transparent
    // rule-based triage instead and flag it for manual review.
    console.error("AI triage failed, falling back to rule-based triage:", error);
    const fallback = ruleBasedTriage(input);
    return {
      ...fallback,
      safetyFlags: [
        "AI triage failed for this request — it was classified by keywords only. Review manually.",
        ...fallback.safetyFlags,
      ],
    };
  }
}

async function aiTriage(input: IntakeInput): Promise<Triage> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [triageTool],
    tool_choice: { type: "tool", name: "record_triage" },
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("Claude did not return a structured triage.");
  }

  const raw = toolUse.input as Record<string, unknown>;
  return {
    category: (raw.category as Category) ?? "general",
    urgency: (raw.urgency as Urgency) ?? "medium",
    summary: String(raw.summary ?? "").trim(),
    suggestedFollowUp: String(raw.suggestedFollowUp ?? "").trim(),
    recommendedActions: toStringArray(raw.recommendedActions),
    safetyFlags: toStringArray(raw.safetyFlags),
    requiresImmediateAttention: Boolean(raw.requiresImmediateAttention),
    confidence: clampConfidence(raw.confidence),
    model: DEFAULT_MODEL,
    generatedByAI: true,
  };
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter((v) => v.trim().length > 0);
}

function clampConfidence(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return 0.5;
  return Math.min(1, Math.max(0, num));
}

/**
 * English and Spanish terms mixed into one list per category (rather than
 * picked by locale) so the fallback still flags a crisis message even if the
 * requester's stated locale is wrong or absent — the fallback only runs when
 * the AI is unavailable, and a missed emergency there is exactly the failure
 * mode it exists to prevent.
 */
const CATEGORY_KEYWORDS: Record<Exclude<Category, "general">, string[]> = {
  emergency: [
    "emergency",
    "danger",
    "suicid",
    "abuse",
    "violence",
    "tonight",
    "urgent",
    "immediately",
    "overdose",
    "emergencia",
    "peligro",
    "abuso",
    "violencia",
    "esta noche",
    "urgente",
    "inmediatamente",
    "sobredosis",
  ],
  housing: [
    "evict",
    "rent",
    "homeless",
    "shelter",
    "housing",
    "landlord",
    "utilities",
    "mortgage",
    "desalojo",
    "desahucio",
    "renta",
    "alquiler",
    "sin hogar",
    "desamparad",
    "refugio",
    "vivienda",
    "casero",
    "arrendador",
    "hipoteca",
  ],
  food: [
    "food",
    "hungry",
    "meal",
    "pantry",
    "grocery",
    "snap",
    "wic",
    "nutrition",
    "comida",
    "hambre",
    "alimento",
    "despensa",
    "comestibles",
    "nutrición",
    "nutricion",
  ],
  healthcare: [
    "health",
    "doctor",
    "clinic",
    "medicine",
    "medication",
    "insurance",
    "mental",
    "sick",
    "salud",
    "médico",
    "medico",
    "clínica",
    "clinica",
    "medicina",
    "medicamento",
    "seguro",
    "enfermo",
    "enferma",
  ],
  legal: [
    "legal",
    "lawyer",
    "court",
    "immigration",
    "custody",
    "rights",
    "attorney",
    "deport",
    "abogado",
    "corte",
    "tribunal",
    "inmigración",
    "inmigracion",
    "custodia",
    "derechos",
    "deportación",
    "deportacion",
  ],
};

/**
 * Deterministic keyword triage used only when no Anthropic key is set. It is
 * intentionally simple and clearly labels itself as non-AI so staff know it has
 * not been intelligently reviewed.
 */
function ruleBasedTriage(input: IntakeInput): Triage {
  const text = input.message.toLowerCase();

  let category: Category = "general";
  let bestScore = 0;
  for (const key of Object.keys(CATEGORY_KEYWORDS) as Array<keyof typeof CATEGORY_KEYWORDS>) {
    const score = CATEGORY_KEYWORDS[key].filter((kw) => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      category = key;
    }
  }

  const emergencyHit = CATEGORY_KEYWORDS.emergency.some((kw) => text.includes(kw));
  const urgency: Urgency = emergencyHit ? "critical" : bestScore > 0 ? "medium" : "low";

  return {
    category,
    urgency,
    summary:
      "Automated keyword triage (no AI configured). A staff member should read the full message and classify it manually.",
    suggestedFollowUp: `Hi ${input.fullName},\n\nThank you for reaching out. We received your request and a member of our team will follow up with you soon. If your situation is an emergency, please call 911 or your local emergency line.\n\nWarm regards,\nThe intake team`,
    recommendedActions: [
      "Read the full message and confirm the category.",
      "Assign to the appropriate program area.",
    ],
    safetyFlags: emergencyHit
      ? ["Message contains emergency-related keywords — review immediately."]
      : ["AI triage was unavailable; this record has not been reviewed by a model."],
    requiresImmediateAttention: emergencyHit,
    confidence: bestScore > 0 ? 0.4 : 0.2,
    model: "rule-based-fallback",
    generatedByAI: false,
  };
}
