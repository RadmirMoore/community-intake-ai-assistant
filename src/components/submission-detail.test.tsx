import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SubmissionDetail } from "@/components/submission-detail";
import type { Submission } from "@/lib/types";

function renderDetail(props: Partial<React.ComponentProps<typeof SubmissionDetail>> = {}) {
  return render(
    <SubmissionDetail
      submission={submission}
      onUpdate={vi.fn()}
      onDelete={vi.fn()}
      onPublishReply={vi.fn().mockResolvedValue(undefined)}
      onUnpublishReply={vi.fn().mockResolvedValue(undefined)}
      {...props}
    />,
  );
}

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
    renderDetail();

    await user.click(screen.getByRole("button", { name: /^copy$/i }));

    expect(writeText).toHaveBeenCalledWith(submission.triage.suggestedFollowUp);
    expect(await screen.findByRole("button", { name: /copied/i })).toBeInTheDocument();
  });

  it("exposes email/phone as mailto: and tel: links with copy buttons", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    renderDetail({
      submission: {
        ...submission,
        input: { ...submission.input, email: "jordan@example.com", phone: "(555) 555-0100" },
      },
    });

    // Click-to-act links: staff pick the channel; the app never sends anything itself.
    expect(screen.getByRole("link", { name: "jordan@example.com" })).toHaveAttribute(
      "href",
      "mailto:jordan@example.com",
    );
    expect(screen.getByRole("link", { name: "(555) 555-0100" })).toHaveAttribute(
      "href",
      "tel:(555)555-0100",
    );

    // Copy fallback, addressed by its accessible label.
    await user.click(screen.getByRole("button", { name: /copy email/i }));
    expect(writeText).toHaveBeenCalledWith("jordan@example.com");
    expect(await screen.findByRole("button", { name: /^copied$/i })).toBeInTheDocument();
  });

  it("shows a dash and no contact links when email/phone are absent", () => {
    renderDetail();
    expect(screen.queryByRole("link", { name: /@/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy email/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy phone/i })).not.toBeInTheDocument();
  });

  it("saves staff notes and shows a confirmation", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDetail({ onUpdate });

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
    renderDetail({ onDelete });

    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /yes, delete permanently/i }));
    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("shows who last reviewed the submission, when known", () => {
    renderDetail({ submission: { ...submission, reviewedBy: "Jordan" } });
    expect(screen.getByText(/last reviewed by/i)).toHaveTextContent("Jordan");
  });

  it("says nothing about review history when it isn't known yet", () => {
    renderDetail();
    expect(screen.queryByText(/last reviewed by/i)).not.toBeInTheDocument();
  });

  it("seeds the reply draft from the AI's suggested follow-up and publishes it", async () => {
    const onPublishReply = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDetail({ onPublishReply });

    const textarea = screen.getByPlaceholderText(/draft a reply the requester will see/i);
    expect(textarea).toHaveValue(submission.triage.suggestedFollowUp);

    await user.clear(textarea);
    await user.type(textarea, "Custom reply text.");
    await user.click(screen.getByRole("button", { name: /^publish reply$/i }));

    expect(onPublishReply).toHaveBeenCalledWith("1", "Custom reply text.");
    expect(await screen.findByText(/^published$/i)).toBeInTheDocument();
  });

  it("shows publish status and an unpublish option once a reply is live", async () => {
    const onUnpublishReply = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDetail({
      submission: {
        ...submission,
        publishedReply: {
          message: "We're looking into this.",
          publishedAt: "2026-01-02T00:00:00.000Z",
        },
      },
      onUnpublishReply,
    });

    expect(screen.getByText(/visible to the requester/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update published reply/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^unpublish$/i }));
    expect(onUnpublishReply).toHaveBeenCalledWith("1");
  });
});
