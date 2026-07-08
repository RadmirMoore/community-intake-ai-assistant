import { describe, expect, it } from "vitest";
import { buildIntakeInputSchema, intakeInputSchema, statusUpdateSchema } from "@/lib/types";

const validInput = {
  fullName: "Jane Doe",
  email: "jane@example.com",
  phone: "",
  preferredContact: "email",
  zipCode: "94110",
  message: "I need help with rental assistance for next month.",
  consent: true,
};

describe("intakeInputSchema", () => {
  it("accepts a valid submission", () => {
    const parsed = intakeInputSchema.safeParse(validInput);
    expect(parsed.success).toBe(true);
  });

  it("rejects a submission with no email and no phone", () => {
    const parsed = intakeInputSchema.safeParse({
      ...validInput,
      email: "",
      phone: "",
      zipCode: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a submission with only an email", () => {
    const parsed = intakeInputSchema.safeParse({ ...validInput, email: "jane@example.com", phone: "" });
    expect(parsed.success).toBe(true);
  });

  it("accepts a submission with only a phone number", () => {
    const parsed = intakeInputSchema.safeParse({ ...validInput, email: "", phone: "555-0100" });
    expect(parsed.success).toBe(true);
  });

  it("requires consent", () => {
    const parsed = intakeInputSchema.safeParse({ ...validInput, consent: false });
    expect(parsed.success).toBe(false);
  });

  it("rejects messages that are too short to route", () => {
    const parsed = intakeInputSchema.safeParse({ ...validInput, message: "help" });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid email addresses", () => {
    const parsed = intakeInputSchema.safeParse({ ...validInput, email: "not-an-email" });
    expect(parsed.success).toBe(false);
  });

  it("caps message length", () => {
    const parsed = intakeInputSchema.safeParse({ ...validInput, message: "x".repeat(4001) });
    expect(parsed.success).toBe(false);
  });
});

describe("buildIntakeInputSchema", () => {
  it("returns Spanish error messages when built for the es locale", () => {
    const schema = buildIntakeInputSchema("es");
    const result = schema.safeParse({ ...validInput, message: "help" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/Cuéntanos/);
  });

  it("has the same shape regardless of locale", () => {
    const en = buildIntakeInputSchema("en").safeParse(validInput);
    const es = buildIntakeInputSchema("es").safeParse(validInput);
    expect(en.success).toBe(true);
    expect(es.success).toBe(true);
  });
});

describe("statusUpdateSchema", () => {
  it("accepts a status change", () => {
    expect(statusUpdateSchema.safeParse({ status: "in_progress" }).success).toBe(true);
  });

  it("rejects unknown statuses", () => {
    expect(statusUpdateSchema.safeParse({ status: "archived" }).success).toBe(false);
  });

  it("accepts staff notes", () => {
    expect(statusUpdateSchema.safeParse({ staffNotes: "Called back, left a message." }).success).toBe(
      true,
    );
  });
});
