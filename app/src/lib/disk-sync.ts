/**
 * Best-effort two-way sync between the in-browser editor and
 * <repo>/<slug>/main.tf on disk. Backed by the Vite dev plugin at
 * `app/vite-plugin-tutorial-sync.ts` (see `make up` / `npm run dev`).
 * When the app is served as a static production build there's no
 * backend, so the network calls quietly fail and the UI still
 * persists everything to localStorage as before.
 *
 * Why this exists: learners want to edit in the browser AND in their
 * terminal (vim/vscode) and have both stay coherent. The browser
 * pushes its edits to disk so `terraform plan` sees them; it also
 * pulls disk on exercise (re)mount so vim edits show up in the
 * editor.
 */

type SyncState = 'unknown' | 'available' | 'unavailable';

let state: SyncState = 'unknown';

export function getSyncState(): SyncState {
  return state;
}

/**
 * POST the user's HCL to the dev server so it writes <slug>/main.tf.
 * Returns true on success, false if the endpoint isn't there or errored.
 * Safe to call frequently — the caller already debounces.
 */
export async function writeToDisk(slug: string, content: string): Promise<boolean> {
  try {
    const res = await fetch(`/__sync/${encodeURIComponent(slug)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: content,
    });
    if (!res.ok) {
      state = 'unavailable';
      return false;
    }
    state = 'available';
    return true;
  } catch {
    state = 'unavailable';
    return false;
  }
}

/**
 * GET <slug>/main.tf from disk via the dev server. Returns the file
 * contents on success, or null if the file isn't reachable (production
 * build, network error, or the file genuinely doesn't exist).
 */
export async function readFromDisk(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`/__sync/${encodeURIComponent(slug)}`, { method: 'GET' });
    if (!res.ok) {
      state = 'unavailable';
      return null;
    }
    state = 'available';
    return await res.text();
  } catch {
    state = 'unavailable';
    return null;
  }
}
