import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "@/components/dashboard";
import type { Submission } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

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

describe("Dashboard staff name", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("prompts for a display name and remembers it", async () => {
    const user = userEvent.setup();
    render(
      <Dashboard initialSubmissions={[submission]} initialBackend="local-json" isProtected={false} />,
    );

    await user.type(screen.getByLabelText(/your name/i), "Jordan");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText(/reviewing as/i)).toHaveTextContent("Jordan");
    expect(window.localStorage.getItem("staffDisplayName")).toBe("Jordan");
  });

  it("remembers a previously saved name across mounts", async () => {
    window.localStorage.setItem("staffDisplayName", "Alicia");
    render(
      <Dashboard initialSubmissions={[submission]} initialBackend="local-json" isProtected={false} />,
    );
    expect(await screen.findByText(/reviewing as/i)).toHaveTextContent("Alicia");
  });

  it("sends the staff name as a header when updating a submission", async () => {
    window.localStorage.setItem("staffDisplayName", "José");
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ submission: { ...submission, status: "in_review" } }),
    } as Response);

    const user = userEvent.setup();
    render(
      <Dashboard initialSubmissions={[submission]} initialBackend="local-json" isProtected={false} />,
    );

    await user.click(screen.getByText("Jordan Rivera"));
    await user.click(screen.getByRole("button", { name: /in review/i }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/submissions/1",
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({ "X-Staff-Name": encodeURIComponent("José") }),
        }),
      ),
    );
  });
});
