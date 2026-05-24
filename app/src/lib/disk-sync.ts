/**
 * Best-effort sync from the in-browser editor to <repo>/<slug>/main.tf
 * on disk. Backed by the Vite dev plugin at `app/vite-plugin-tutorial-sync.ts`
 * (see `make up` / `npm run dev`). When the app is served as a static
 * production build there's no backend, so the POST quietly fails — the
 * UI still persists everything to localStorage as before.
 *
 * Why this exists: learners want to edit in the browser and then run
 * `terraform plan` etc. in their terminal against the same file. Without
 * this, the editor is isolated from disk and the user has to copy-paste.
 */

type SyncState = 'unknown' | 'available' | 'unavailable';

let state: SyncState = 'unknown';

/**
 * Returns the current sync state. The first POST will discover it; until
 * then the UI can show "checking" or just assume best-effort.
 */
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
