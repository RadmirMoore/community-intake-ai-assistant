import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// React Testing Library's async utilities (findBy*, waitFor) default to a
// 1000ms timeout — tighter than Vitest's own 5000ms test timeout. On a busy
// CI runner (or when the suite races with a build), a perfectly correct query
// can occasionally exceed 1000ms and fail spuriously, then pass on rerun.
// Aligning the async timeout with Vitest's removes that class of flake without
// masking real failures: a genuinely broken query still fails, just later.
configure({ asyncUtilTimeout: 5000 });

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
