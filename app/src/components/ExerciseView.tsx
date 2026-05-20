import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getExerciseById, getNextExerciseId, getPrevExerciseId } from '../lib/content';
import { getCode, setCode, setCurrent } from '../lib/storage';
import Editor from './Editor';
import MarkdownRenderer from './MarkdownRenderer';

const DEBOUNCE_MS = 250;

export default function ExerciseView() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <NotFound />;

  const exercise = getExerciseById(id);
  if (!exercise) return <NotFound />;

  const prev = getPrevExerciseId(id);
  const next = getNextExerciseId(id);

  // Track the current exercise in storage every time we land here.
  useEffect(() => {
    setCurrent(id);
  }, [id]);

  // The initial editor value comes from storage (the user's last typed code
  // for THIS exercise) or falls back to the starter shipped in main.tf.
  const initialCode = useMemo(() => getCode(id) ?? exercise.starter, [id, exercise.starter]);
  const [editorValue, setEditorValue] = useState(initialCode);

  // When we navigate between exercises, refresh the editor's seed value.
  useEffect(() => {
    setEditorValue(getCode(id) ?? exercise.starter);
  }, [id, exercise.starter]);

  // Debounced persist on every keystroke.
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEditorChange = useCallback(
    (value: string) => {
      setEditorValue(value);
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        setCode(id, value);
      }, DEBOUNCE_MS);
    },
    [id],
  );

  // Flush pending writes on unmount so a quick tab close doesn't lose them.
  useEffect(() => {
    return () => {
      if (persistTimer.current) {
        clearTimeout(persistTimer.current);
        setCode(id, editorValue);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const resetToStarter = () => {
    if (
      editorValue !== exercise.starter &&
      !window.confirm('Replace your typed code with the original starter for this exercise?')
    ) {
      return;
    }
    setEditorValue(exercise.starter);
    setCode(id, exercise.starter);
  };

  return (
    <article className="exercise">
      <header className="exercise__header">
        <div>
          <p className="exercise__eyebrow">Exercise {exercise.id}</p>
          <h1 className="exercise__title">{stripIdPrefix(exercise.title)}</h1>
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
          {exercise.kind === 'auto' ? (
            <div className="editor-panel">
              <div className="editor-panel__toolbar">
                <h3 className="editor-panel__title">Your HCL</h3>
                <button
                  type="button"
                  className="editor-panel__reset"
                  onClick={resetToStarter}
                  title="Replace your code with the starter main.tf"
                >
                  Reset to starter
                </button>
              </div>
              <Editor value={editorValue} onChange={onEditorChange} />
              <div className="editor-panel__footer">
                <p className="editor-panel__hint">
                  Your typed code is saved automatically in this browser. The "Validate" button (Phase 4)
                  will check your HCL against the exercise's structural requirements.
                </p>
              </div>
            </div>
          ) : (
            <div className="placeholder-panel">
              <h3>Observation flow</h3>
              <p>
                A checklist of expected observations lands in Phase 5. For now, follow the "Run it" steps
                in the README locally and confirm you see the described output.
              </p>
              <details>
                <summary>Peek at the starter HCL</summary>
                <pre className="placeholder-panel__pre">
                  <code>{exercise.starter}</code>
                </pre>
              </details>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}

function stripIdPrefix(title: string): string {
  return title.replace(/^\d{2}\s*[·:.\-—]\s*/, '');
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
