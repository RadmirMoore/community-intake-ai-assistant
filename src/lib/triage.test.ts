import { beforeEach, describe, expect, it, vi } from "vitest";
import { isAIConfigured, triageIntake } from "@/lib/triage";
import type { IntakeInput } from "@/lib/types";

function input(message: string): IntakeInput {
  return {
    fullName: "Test Person",
    email: "",
    phone: "",
    preferredContact: "either",
    zipCode: "",
    message,
    consent: true,
  };
}

describe("rule-based triage (no ANTHROPIC_API_KEY)", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
  });

  it("reports AI as not configured", () => {
    expect(isAIConfigured()).toBe(false);
  });

  it("classifies housing keywords", async () => {
    const triage = await triageIntake(
      input("My landlord is trying to evict me and I cannot pay rent this month."),
    );
    expect(triage.category).toBe("housing");
    expect(triage.generatedByAI).toBe(false);
    expect(triage.model).toBe("rule-based-fallback");
  });

  it("classifies food keywords", async () => {
    const triage = await triageIntake(
      input("I need help finding a food pantry, we have no groceries left."),
    );
    expect(triage.category).toBe("food");
  });

  it("flags emergencies as critical and requiring attention", async () => {
    const triage = await triageIntake(
      input("There is violence at home and I am in danger tonight, please help."),
    );
    expect(triage.category).toBe("emergency");
    expect(triage.urgency).toBe("critical");
    expect(triage.requiresImmediateAttention).toBe(true);
    expect(triage.safetyFlags.length).toBeGreaterThan(0);
  });

  it("classifies Spanish-language housing messages", async () => {
    const triage = await triageIntake(
      input("Recibi un aviso de desalojo y no puedo pagar el alquiler este mes."),
    );
    expect(triage.category).toBe("housing");
  });

  it("classifies Spanish-language food messages", async () => {
    const triage = await triageIntake(
      input("Necesito ayuda para encontrar un banco de alimentos, no tenemos comida en casa."),
    );
    expect(triage.category).toBe("food");
  });

  it("flags a Spanish-language emergency as critical", async () => {
    const triage = await triageIntake(
      input("Hay violencia en mi casa y estoy en peligro esta noche, necesito ayuda."),
    );
    expect(triage.category).toBe("emergency");
    expect(triage.urgency).toBe("critical");
    expect(triage.requiresImmediateAttention).toBe(true);
  });

  it("falls back to general with low urgency when nothing matches", async () => {
    const triage = await triageIntake(input("Hello, I would like some information please."));
    expect(triage.category).toBe("general");
    expect(triage.urgency).toBe("low");
    expect(triage.requiresImmediateAttention).toBe(false);
  });

  it("always labels itself as non-AI output", async () => {
    const triage = await triageIntake(input("I need a lawyer for my immigration court case."));
    expect(triage.generatedByAI).toBe(false);
    expect(triage.confidence).toBeLessThan(0.5);
  });
});
