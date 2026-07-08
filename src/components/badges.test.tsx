import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryBadge, StatusBadge, UrgencyBadge } from "@/components/badges";

describe("UrgencyBadge", () => {
  it("hides the decorative critical marker from assistive tech", () => {
    const { container } = render(<UrgencyBadge urgency="critical" />);
    const hiddenGlyph = container.querySelector('[aria-hidden="true"]');
    expect(hiddenGlyph).not.toBeNull();
    expect(hiddenGlyph?.textContent).toBe("●");
    expect(container.textContent).toContain("Critical");
  });

  it("renders no marker for non-critical urgency", () => {
    const { container } = render(<UrgencyBadge urgency="low" />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    expect(container.textContent).toBe("Low");
  });
});

describe("CategoryBadge / StatusBadge", () => {
  it("renders the category label", () => {
    render(<CategoryBadge category="housing" />);
    expect(screen.getByText("Housing")).toBeInTheDocument();
  });

  it("renders the status label", () => {
    render(<StatusBadge status="new" />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });
});
