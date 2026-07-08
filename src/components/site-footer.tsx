export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-ink-soft sm:px-6">
        <p className="font-medium text-ink">
          Human review required · No automated legal or medical advice
        </p>
        <p className="mt-1 max-w-3xl">
          This tool uses AI to help nonprofit staff triage requests faster. Every AI suggestion is a
          draft that a person reviews before any action is taken. In an emergency, call 911 or your
          local emergency line.
        </p>
      </div>
    </footer>
  );
}
