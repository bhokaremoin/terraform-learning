import { Link, useParams } from 'react-router-dom';
import { getExerciseById, getNextExerciseId, getPrevExerciseId } from '../lib/content';
import MarkdownRenderer from './MarkdownRenderer';

/**
 * Per-exercise screen.
 *
 * Phase 1 scope: render the README. The editor + validation panel column
 * is a placeholder that's wired up in Phase 2 (editor + storage) and
 * Phase 4 (validators).
 */
export default function ExerciseView() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <NotFound />;

  const exercise = getExerciseById(id);
  if (!exercise) return <NotFound />;

  const prev = getPrevExerciseId(id);
  const next = getNextExerciseId(id);

  return (
    <article className="exercise">
      <header className="exercise__header">
        <div>
          <p className="exercise__eyebrow">Exercise {exercise.id}</p>
          <h1 className="exercise__title">{exercise.title.replace(/^\d{2}\s*[·:.\-—]\s*/, '')}</h1>
          {exercise.kind === 'observation' && (
            <p className="exercise__obs-tag">
              Observation exercise · the learning happens in the terraform CLI; the web app guides you
              through expected observations.
            </p>
          )}
        </div>
        <nav className="exercise__nav" aria-label="Exercise navigation">
          {prev ? (
            <Link className="exercise__nav-link" to={`/exercise/${prev}`}>
              ← Prev
            </Link>
          ) : (
            <span className="exercise__nav-link exercise__nav-link--disabled">← Prev</span>
          )}
          {next ? (
            <Link className="exercise__nav-link" to={`/exercise/${next}`}>
              Next →
            </Link>
          ) : (
            <span className="exercise__nav-link exercise__nav-link--disabled">Next →</span>
          )}
        </nav>
      </header>

      <div className="exercise__body">
        <section className="exercise__content">
          <MarkdownRenderer source={exercise.readme} />
        </section>
        <aside className="exercise__side">
          <div className="placeholder-panel">
            <h3>{exercise.kind === 'auto' ? 'Editor + Validate' : 'Observation checklist'}</h3>
            <p>
              Lands in Phase {exercise.kind === 'auto' ? '2 (editor) and Phase 4 (validators)' : '5 (observation flow)'}.
            </p>
            <details>
              <summary>Peek at the starter HCL</summary>
              <pre className="placeholder-panel__pre">
                <code>{exercise.starter}</code>
              </pre>
            </details>
          </div>
        </aside>
      </div>
    </article>
  );
}

function NotFound() {
  return (
    <div className="exercise">
      <h1>Exercise not found</h1>
      <p>
        <Link to="/">Return home</Link>.
      </p>
    </div>
  );
}
