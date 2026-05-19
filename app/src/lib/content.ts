import type { Exercise, ExerciseId, ExerciseKind } from '../types';

/**
 * Build-time content pipeline.
 *
 * Vite resolves these glob patterns at build time and inlines the file
 * contents as strings. Adding a new exercise directory in the repo root
 * (matching `NN-name/`) is enough to make it appear in the SPA — no JS
 * registration needed beyond the per-exercise validator (Phase 4+).
 *
 * Paths are relative to this file: `app/src/lib/content.ts`
 *   ../../../01-hello-world/README.md  →  resolves to repo-root/01-hello-world/README.md
 */
const READMES = import.meta.glob<string>('../../../[0-9][0-9]-*/README.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const STARTERS = import.meta.glob<string>('../../../[0-9][0-9]-*/main.tf', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const SOLUTIONS = import.meta.glob<string>('../../../[0-9][0-9]-*/SOLUTION.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/**
 * Exercises whose learning is observational (run terraform locally, watch
 * the output) rather than HCL-writing. Auto-validation doesn't fit; they
 * get a self-attest checklist instead (Phase 5).
 *
 * The plan locks this set: 05 drift, 06 replacement, 10 state commands.
 */
const OBSERVATION_IDS = new Set<ExerciseId>(['05', '06', '10']);

/**
 * Extract the exercise ID and slug from a file path like
 *   ../../../01-hello-world/README.md
 * Returns { id: "01", slug: "01-hello-world" } or null if no match.
 */
function extractIdAndSlug(path: string): { id: ExerciseId; slug: string } | null {
  const match = path.match(/\/(\d{2})-([^/]+)\/[^/]+$/);
  if (!match) return null;
  return { id: match[1], slug: `${match[1]}-${match[2]}` };
}

/**
 * Pull a human-friendly title out of a README's first H1 line.
 * Falls back to a Title Case version of the slug.
 */
function deriveTitle(readme: string, slug: string): string {
  const h1 = readme.match(/^#\s+(.+?)\s*$/m);
  if (h1) return h1[1].trim();
  // Fallback: "01-hello-world" → "Hello World"
  const withoutPrefix = slug.replace(/^\d{2}-/, '');
  return withoutPrefix
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

interface PartialPath<T> {
  id: ExerciseId;
  slug: string;
  content: T;
}

function indexByPath<T>(glob: Record<string, T>): Map<ExerciseId, PartialPath<T>> {
  const out = new Map<ExerciseId, PartialPath<T>>();
  for (const [path, content] of Object.entries(glob)) {
    const parsed = extractIdAndSlug(path);
    if (!parsed) continue;
    out.set(parsed.id, { ...parsed, content });
  }
  return out;
}

function kindFor(id: ExerciseId): ExerciseKind {
  return OBSERVATION_IDS.has(id) ? 'observation' : 'auto';
}

/**
 * Build the canonical exercises array. Throws at module load time (and
 * therefore at build time) if any expected file is missing — surfaces
 * authoring mistakes immediately instead of as a runtime 404.
 */
function buildExercises(): Exercise[] {
  const readmes = indexByPath(READMES);
  const starters = indexByPath(STARTERS);
  const solutions = indexByPath(SOLUTIONS);

  const ids = new Set<ExerciseId>([
    ...readmes.keys(),
    ...starters.keys(),
    ...solutions.keys(),
  ]);

  const exercises: Exercise[] = [];
  for (const id of [...ids].sort()) {
    const readme = readmes.get(id);
    const starter = starters.get(id);
    const solution = solutions.get(id);

    if (!readme || !starter || !solution) {
      const missing = [
        !readme && 'README.md',
        !starter && 'main.tf',
        !solution && 'SOLUTION.md',
      ]
        .filter(Boolean)
        .join(', ');
      throw new Error(
        `Exercise ${id} is missing files: ${missing}. ` +
          `Each exercise directory needs README.md, main.tf, and SOLUTION.md.`,
      );
    }

    exercises.push({
      id,
      slug: readme.slug,
      title: deriveTitle(readme.content, readme.slug),
      readme: readme.content,
      starter: starter.content,
      solution: solution.content,
      kind: kindFor(id),
    });
  }

  return exercises;
}

export const EXERCISES: readonly Exercise[] = buildExercises();

export function getExerciseById(id: ExerciseId): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export function getNextExerciseId(id: ExerciseId): ExerciseId | null {
  const idx = EXERCISES.findIndex((e) => e.id === id);
  if (idx === -1 || idx === EXERCISES.length - 1) return null;
  return EXERCISES[idx + 1].id;
}

export function getPrevExerciseId(id: ExerciseId): ExerciseId | null {
  const idx = EXERCISES.findIndex((e) => e.id === id);
  if (idx <= 0) return null;
  return EXERCISES[idx - 1].id;
}
