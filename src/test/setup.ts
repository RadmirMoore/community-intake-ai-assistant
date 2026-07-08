import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Test files import describe/it/afterEach from "vitest" rather than relying on
// injected globals, so React Testing Library's auto-cleanup detection (which
// checks for a global `afterEach`) never fires on its own — do it explicitly.
afterEach(() => {
  cleanup();
});

// jsdom's Clipboard API is read-only/unreliable across versions; submission-detail.tsx
// calls navigator.clipboard.writeText directly, so force a plain mock in its place.
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  configurable: true,
  writable: true,
});
