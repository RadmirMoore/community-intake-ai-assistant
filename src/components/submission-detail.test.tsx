import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SubmissionDetail } from "@/components/submission-detail";
import type { Submission } from "@/lib/types";

const submission: Submission = {
  id: "1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  status: "new",
  input: {
    fullName: "Jordan Rivera",
    email: "",
    phone: "",
    preferredContact: "either",
    zipCode: "",
    message: "Looking for help finding a food pantry near me.",
    consent: true,
  },
  triage: {
    category: "food",
    urgency: "medium",
    summary: "Requesting food pantry information.",
    suggestedFollowUp: "Hi Jordan, thanks for reaching out.",
    recommendedActions: [],
    safetyFlags: [],
    requiresImmediateAttention: false,
    confidence: 0.8,
    model: "test-model",
    generatedByAI: true,
  },
  staffNotes: "",
};

describe("SubmissionDetail", () => {
  it("copies the suggested follow-up and shows confirmation", async () => {
    const user = userEvent.setup();
    // userEvent.setup() installs its own clipboard stub on navigator.clipboard,
    // overwriting anything set up beforehand — spy on it only after this call.
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    render(<SubmissionDetail submission={submission} onUpdate={vi.fn()} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /^copy$/i }));

    expect(writeText).toHaveBeenCalledWith(submission.triage.suggestedFollowUp);
    expect(await screen.findByRole("button", { name: /copied/i })).toBeInTheDocument();
  });

  it("saves staff notes and shows a confirmation", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SubmissionDetail submission={submission} onUpdate={onUpdate} onDelete={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/internal notes/i), "Called back, left voicemail.");
    await user.click(screen.getByRole("button", { name: /save notes/i }));

    expect(onUpdate).toHaveBeenCalledWith("1", {
      staffNotes: expect.stringContaining("Called back"),
    });
    expect(await screen.findByText(/^saved$/i)).toBeInTheDocument();
  });

  it("requires confirmation before deleting", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SubmissionDetail submission={submission} onUpdate={vi.fn()} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /yes, delete permanently/i }));
    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("shows who last reviewed the submission, when known", () => {
    render(
      <SubmissionDetail
        submission={{ ...submission, reviewedBy: "Jordan" }}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText(/last reviewed by/i)).toHaveTextContent("Jordan");
  });

  it("says nothing about review history when it isn't known yet", () => {
    render(<SubmissionDetail submission={submission} onUpdate={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByText(/last reviewed by/i)).not.toBeInTheDocument();
  });
});
