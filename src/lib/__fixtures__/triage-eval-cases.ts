import type { Category, IntakeInput, Urgency } from "@/lib/types";

/**
 * Golden dataset for the triage accuracy eval (see docs/EVALS.md). Every
 * message here is synthetic — written to be realistic, not copied from any
 * real submission. Add a case whenever a real deployment surfaces a
 * misclassification worth guarding against.
 */
export interface TriageEvalCase {
  label: string;
  input: IntakeInput;
  expectedCategory: Category;
  /** Minimum acceptable urgency — a model that escalates further is fine. */
  expectedMinUrgency: Urgency;
  expectedRequiresImmediateAttention: boolean;
}

const baseInput = {
  email: "",
  phone: "",
  preferredContact: "either" as const,
  zipCode: "",
  consent: true as const,
};

export const TRIAGE_EVAL_CASES: TriageEvalCase[] = [
  {
    label: "eviction notice, three days",
    input: {
      ...baseInput,
      fullName: "Case A",
      message:
        "My landlord posted a 3-day notice to vacate on my door yesterday. I have two kids and nowhere to go yet. What can I do?",
    },
    expectedCategory: "housing",
    expectedMinUrgency: "high",
    expectedRequiresImmediateAttention: false,
  },
  {
    label: "homeless tonight with children",
    input: {
      ...baseInput,
      fullName: "Case B",
      message:
        "We got locked out of our apartment today and have nowhere to sleep tonight. I have a 4-year-old and a 7-year-old with me.",
    },
    expectedCategory: "housing",
    expectedMinUrgency: "critical",
    expectedRequiresImmediateAttention: true,
  },
  {
    label: "routine food pantry request",
    input: {
      ...baseInput,
      fullName: "Case C",
      message: "Hi, could you tell me the hours for the food pantry this week? I'd like to stop by.",
    },
    expectedCategory: "food",
    expectedMinUrgency: "low",
    expectedRequiresImmediateAttention: false,
  },
  {
    label: "no food for children today",
    input: {
      ...baseInput,
      fullName: "Case D",
      message: "I have no food in the house and my kids haven't eaten today. Can someone help right now?",
    },
    expectedCategory: "food",
    expectedMinUrgency: "critical",
    expectedRequiresImmediateAttention: true,
  },
  {
    label: "general healthcare access question",
    input: {
      ...baseInput,
      fullName: "Case E",
      message: "I don't have insurance right now. Are there any low-cost clinics nearby I could go to?",
    },
    expectedCategory: "healthcare",
    expectedMinUrgency: "medium",
    expectedRequiresImmediateAttention: false,
  },
  {
    label: "medical emergency in progress",
    input: {
      ...baseInput,
      fullName: "Case F",
      message: "My father is having chest pains and trouble breathing right now, we don't know what to do.",
    },
    expectedCategory: "emergency",
    expectedMinUrgency: "critical",
    expectedRequiresImmediateAttention: true,
  },
  {
    label: "immigration paperwork question",
    input: {
      ...baseInput,
      fullName: "Case G",
      message: "I need help understanding a form I got about my immigration case. Is there a lawyer who can look at it?",
    },
    expectedCategory: "legal",
    expectedMinUrgency: "medium",
    expectedRequiresImmediateAttention: false,
  },
  {
    label: "custody hearing next week",
    input: {
      ...baseInput,
      fullName: "Case H",
      message: "I have a custody hearing next week and no lawyer. I don't know what paperwork I'm supposed to bring.",
    },
    expectedCategory: "legal",
    expectedMinUrgency: "high",
    expectedRequiresImmediateAttention: false,
  },
  {
    label: "domestic violence, unsafe now",
    input: {
      ...baseInput,
      fullName: "Case I",
      message: "My partner hit me again last night and I'm scared to go home. I don't know where else to go.",
    },
    expectedCategory: "emergency",
    expectedMinUrgency: "critical",
    expectedRequiresImmediateAttention: true,
  },
  {
    label: "suicidal ideation disclosed",
    input: {
      ...baseInput,
      fullName: "Case J",
      message: "I've been feeling like I don't want to be here anymore and I don't know who else to tell.",
    },
    expectedCategory: "emergency",
    expectedMinUrgency: "critical",
    expectedRequiresImmediateAttention: true,
  },
  {
    label: "general information request",
    input: {
      ...baseInput,
      fullName: "Case K",
      message: "Hi, I saw a flyer about your programs but I'm not sure which one fits my situation. Can someone explain what you offer?",
    },
    expectedCategory: "general",
    expectedMinUrgency: "low",
    expectedRequiresImmediateAttention: false,
  },
  {
    label: "utility shutoff notice",
    input: {
      ...baseInput,
      fullName: "Case L",
      message: "I got a notice that my electricity will be shut off in five days if I don't pay. Is there help available?",
    },
    expectedCategory: "housing",
    expectedMinUrgency: "high",
    expectedRequiresImmediateAttention: false,
  },
  {
    label: "mental health support, not urgent",
    input: {
      ...baseInput,
      fullName: "Case M",
      message: "I've been feeling really stressed and anxious lately and I think it would help to talk to someone. Do you have any counseling referrals?",
    },
    expectedCategory: "healthcare",
    expectedMinUrgency: "medium",
    expectedRequiresImmediateAttention: false,
  },
  {
    label: "Spanish-language housing request",
    input: {
      ...baseInput,
      fullName: "Caso N",
      message: "Recibi un aviso de desalojo y no se que hacer. Tengo tres hijos y necesito ayuda pronto.",
    },
    expectedCategory: "housing",
    expectedMinUrgency: "high",
    expectedRequiresImmediateAttention: false,
  },
  {
    label: "medication access, not an emergency",
    input: {
      ...baseInput,
      fullName: "Case O",
      message: "I ran out of my blood pressure medication and can't afford a refill until next month. Is there an assistance program?",
    },
    expectedCategory: "healthcare",
    expectedMinUrgency: "medium",
    expectedRequiresImmediateAttention: false,
  },
  {
    label: "elder in immediate danger",
    input: {
      ...baseInput,
      fullName: "Case P",
      message: "My elderly mother lives alone and just called me confused and said she can't move her arm. I'm not there right now.",
    },
    expectedCategory: "emergency",
    expectedMinUrgency: "critical",
    expectedRequiresImmediateAttention: true,
  },
];
