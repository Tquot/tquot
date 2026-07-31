import type { Suggestion, SuggestionContext, Detector } from "./types";
import * as D from "./detectors";

const ALL_DETECTORS: Detector[] = [
  D.comparatorCheaperElsewhere,
  D.budgetOvershoot,
  D.refundableUpgrade,
  D.cancellationDeadlineTight,
  D.childAgeRateRisk,
  D.directFlightUpgrade,
  D.insuranceMissing,
  D.transferGap,
  D.boardUpgrade,
  D.budgetHeadroom,
  D.longLayover,
];

/** Como máximo 1 sugerencia interrumpe el build. */
const MAX_INTERRUPTING = 1;
/** Como máximo 2 sugerencias tras el cierre. */
const MAX_AFTER_CLOSE = 2;

export function collectSuggestions(ctx: SuggestionContext): {
  interrupting: Suggestion[];
  afterClose: Suggestion[];
} {
  const found = ALL_DETECTORS.map((d) => {
    try {
      return d(ctx);
    } catch {
      return null;
    }
  })
    .filter((s): s is Suggestion => s !== null)
    .filter((s) => !ctx.dismissed.includes(s.id));

  const byKind = new Map<string, Suggestion>();
  for (const s of found) {
    const existing = byKind.get(s.kind);
    if (!existing || s.priority < existing.priority) byKind.set(s.kind, s);
  }

  const sorted = [...byKind.values()].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0);
  });

  const interrupting = sorted
    .filter((s) => s.interrupts)
    .slice(0, MAX_INTERRUPTING);
  const afterClose = sorted
    .filter((s) => !interrupting.includes(s))
    .slice(0, MAX_AFTER_CLOSE);

  return { interrupting, afterClose };
}
