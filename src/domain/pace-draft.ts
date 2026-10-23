import type { Pace } from './plan';

export interface PaceDraft {
  source: Pace | null;
  pace: Pace | null;
  local: Pace[];
  externalRevision: number;
}

export function samePace(a: Pace | null, b: Pace | null): boolean {
  return a?.type === b?.type && a?.value === b?.value;
}

/** A save acknowledgement must not replace a newer local edit. */
export function reconcilePaceDraft(draft: PaceDraft, incoming: Pace | null): PaceDraft {
  if (samePace(draft.source, incoming)) return draft;
  const acknowledged = draft.local.findIndex((pace) => samePace(pace, incoming));
  if (acknowledged >= 0) {
    return { ...draft, source: incoming, local: draft.local.slice(acknowledged + 1) };
  }
  return {
    source: incoming, pace: incoming, local: [], externalRevision: draft.externalRevision + 1,
  };
}
