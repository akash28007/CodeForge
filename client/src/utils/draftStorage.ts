/**
 * Per-user, per-problem code drafts (guide 5.2). Keyed by user id so two accounts on the
 * same browser never see each other's work in progress.
 */
const PREFIX = 'codeforge_draft';

function key(userId: string, problemId: string, language: string): string {
  return `${PREFIX}:${userId}:${problemId}:${language}`;
}

export function loadDraft(userId: string, problemId: string, language: string): string | null {
  try {
    return localStorage.getItem(key(userId, problemId, language));
  } catch {
    return null;
  }
}

export function saveDraft(userId: string, problemId: string, language: string, code: string): void {
  try {
    localStorage.setItem(key(userId, problemId, language), code);
  } catch {
    // Storage full or blocked — losing a draft is not worth breaking the editor over.
  }
}

export function clearDraft(userId: string, problemId: string, language: string): void {
  try {
    localStorage.removeItem(key(userId, problemId, language));
  } catch {
    // ignore
  }
}
