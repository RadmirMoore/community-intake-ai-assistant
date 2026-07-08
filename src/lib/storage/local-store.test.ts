import { rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalSubmissionStore } from "@/lib/storage/local-store";
import type { IntakeInput, Triage } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");

const input: IntakeInput = {
  fullName: "Jordan Rivera",
  email: "",
  phone: "",
  preferredContact: "either",
  zipCode: "",
  message: "Looking for help finding a food pantry near me this week.",
  consent: true,
};

const triage: Triage = {
  category: "food",
  urgency: "medium",
  summary: "Requesting food pantry information.",
  suggestedFollowUp: "Thanks for reaching out.",
  recommendedActions: ["Share food pantry hours."],
  safetyFlags: [],
  requiresImmediateAttention: false,
  confidence: 0.8,
  model: "rule-based-fallback",
  generatedByAI: false,
};

describe("LocalSubmissionStore", () => {
  let store: LocalSubmissionStore;

  beforeEach(() => {
    store = new LocalSubmissionStore();
  });

  afterEach(async () => {
    await rm(DATA_DIR, { recursive: true, force: true });
  });

  it("creates, lists, and gets a submission", async () => {
    const created = await store.create({ input, triage });
    expect(await store.get(created.id)).toEqual(created);
    expect(await store.list()).toEqual([created]);
  });

  it("deletes a submission, returning true, and false if it doesn't exist", async () => {
    const created = await store.create({ input, triage });

    expect(await store.delete("does-not-exist")).toBe(false);
    expect(await store.delete(created.id)).toBe(true);

    expect(await store.get(created.id)).toBeNull();
    expect(await store.list()).toEqual([]);
  });

  it("only removes the targeted submission", async () => {
    const a = await store.create({ input, triage });
    const b = await store.create({ input, triage });

    await store.delete(a.id);

    expect(await store.list()).toEqual([b]);
  });

  it("records the actor as reviewedBy on update, and preserves it across later updates", async () => {
    const created = await store.create({ input, triage });

    const afterFirstUpdate = await store.update(created.id, {
      status: "in_review",
      actor: "Jordan",
    });
    expect(afterFirstUpdate?.reviewedBy).toBe("Jordan");

    const afterSecondUpdate = await store.update(created.id, { staffNotes: "Called back." });
    expect(afterSecondUpdate?.reviewedBy).toBe("Jordan");
  });

  it("publishes a reply, leaves it untouched by unrelated updates, and can explicitly unpublish it", async () => {
    const created = await store.create({ input, triage });
    expect(created.publishedReply).toBeUndefined();

    const published = await store.update(created.id, {
      publishedReply: { message: "Here's an update.", publishedAt: "2026-01-01T00:00:00.000Z" },
    });
    expect(published?.publishedReply?.message).toBe("Here's an update.");

    // A completely unrelated update (no publishedReply key at all) must not
    // touch it — this is the "absent means don't touch" half of the tri-state.
    const afterUnrelatedUpdate = await store.update(created.id, { staffNotes: "fyi" });
    expect(afterUnrelatedUpdate?.publishedReply?.message).toBe("Here's an update.");

    // Explicitly setting it to null must clear it — this is the half that a
    // naive `??` merge would get wrong (null ?? existing resolves to existing).
    const afterUnpublish = await store.update(created.id, { publishedReply: null });
    expect(afterUnpublish?.publishedReply).toBeNull();
  });
});
