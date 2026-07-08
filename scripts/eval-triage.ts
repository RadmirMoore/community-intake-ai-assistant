/**
 * Opt-in accuracy eval for the real Anthropic-backed triage. Run with:
 *
 *   ANTHROPIC_API_KEY=sk-ant-... npm run eval:triage
 *
 * Costs real API credits and is not part of the default CI job — see
 * docs/EVALS.md for methodology and what the numbers mean.
 */
import { TRIAGE_EVAL_CASES, type TriageEvalCase } from "@/lib/__fixtures__/triage-eval-cases";
import { isAIConfigured, triageIntake } from "@/lib/triage";
import { URGENCY_LEVELS, type Triage, type Urgency } from "@/lib/types";

function urgencyRank(urgency: Urgency): number {
  return URGENCY_LEVELS.indexOf(urgency);
}

interface CaseResult {
  case: TriageEvalCase;
  triage: Triage;
  categoryMatch: boolean;
  urgencyMatch: boolean;
  emergencyMatch: boolean;
}

async function main() {
  if (!isAIConfigured()) {
    console.error(
      "ANTHROPIC_API_KEY is not set — this eval only means something against the real model, not the rule-based fallback. Aborting.",
    );
    process.exitCode = 1;
    return;
  }

  const results: CaseResult[] = [];

  for (const evalCase of TRIAGE_EVAL_CASES) {
    const triage = await triageIntake(evalCase.input);
    const categoryMatch = triage.category === evalCase.expectedCategory;
    const urgencyMatch = urgencyRank(triage.urgency) >= urgencyRank(evalCase.expectedMinUrgency);
    const emergencyMatch =
      triage.requiresImmediateAttention === evalCase.expectedRequiresImmediateAttention;

    results.push({ case: evalCase, triage, categoryMatch, urgencyMatch, emergencyMatch });

    const status = categoryMatch && urgencyMatch && emergencyMatch ? "PASS" : "FAIL";
    console.log(
      `[${status}] ${evalCase.label} — category=${triage.category}${categoryMatch ? "" : ` (expected ${evalCase.expectedCategory})`}, urgency=${triage.urgency}${urgencyMatch ? "" : ` (expected >= ${evalCase.expectedMinUrgency})`}, emergency=${triage.requiresImmediateAttention}${emergencyMatch ? "" : ` (expected ${evalCase.expectedRequiresImmediateAttention})`}`,
    );
  }

  const total = results.length;
  const categoryAccuracy = results.filter((r) => r.categoryMatch).length / total;
  const urgencyAccuracy = results.filter((r) => r.urgencyMatch).length / total;

  // The single most important number: of the cases that SHOULD be flagged as
  // an emergency, how many actually were. A miss here means a person in
  // crisis doesn't get surfaced to staff — everything else is secondary.
  const shouldFlag = results.filter((r) => r.case.expectedRequiresImmediateAttention);
  const emergencyRecall =
    shouldFlag.length === 0 ? 1 : shouldFlag.filter((r) => r.emergencyMatch).length / shouldFlag.length;

  console.log("\n--- Summary ---");
  console.log(`Category accuracy:   ${(categoryAccuracy * 100).toFixed(0)}% (${results.filter((r) => r.categoryMatch).length}/${total})`);
  console.log(`Urgency accuracy:    ${(urgencyAccuracy * 100).toFixed(0)}% (${results.filter((r) => r.urgencyMatch).length}/${total})`);
  console.log(
    `Emergency recall:    ${(emergencyRecall * 100).toFixed(0)}% (${shouldFlag.filter((r) => r.emergencyMatch).length}/${shouldFlag.length} of cases that must be flagged)`,
  );

  if (emergencyRecall < 1) {
    console.error("\nOne or more emergency cases were not flagged for immediate attention. Treat this as a release blocker.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Eval run failed:", error);
  process.exitCode = 1;
});
