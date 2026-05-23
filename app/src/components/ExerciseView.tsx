import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getExerciseById, getNextExerciseId, getPrevExerciseId } from '../lib/content';
import { getRegistryEntry } from '../lib/registry';
import { getCode, setCode, setCurrent } from '../lib/storage';
import { useProgress } from '../lib/useProgress';
import Editor from './Editor';
import MarkdownRenderer from './MarkdownRenderer';
import ObservationChecklist from './ObservationChecklist';
import SolutionPanel from './SolutionPanel';
import ValidationPanel from './ValidationPanel';

const DEBOUNCE_MS = 250;

export default function ExerciseView() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <NotFound />;

  const exercise = getExerciseById(id);
  if (!exercise) return <NotFound />;

  const entry = getRegistryEntry(id);
  const prev = getPrevExerciseId(id);
  const next = getNextExerciseId(id);
  const progress = useProgress();
  const peeked = !!progress.peeked[id];
  const completed = !!progress.completed[id];

  useEffect(() => {
    setCurrent(id);
  }, [id]);

  // Editor state (auto exercises only — wraps with conditional below).
  const initialCode = useMemo(() => getCode(id) ?? exercise.starter, [id, exercise.starter]);
  const [editorValue, setEditorValue] = useState(initialCode);

  useEffect(() => {
    setEditorValue(getCode(id) ?? exercise.starter);
  }, [id, exercise.starter]);

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEditorChange = useCallback(
    (value: string) => {
      setEditorValue(value);
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => setCode(id, value), DEBOUNCE_MS);
    },
    [id],
  );

  // Flush pending writes on unmount / id change.
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
          <p className="exercise__eyebrow">
            Exercise {exercise.id}
            {completed && <span className="exercise__done"> · completed</span>}
            {peeked && !completed && <span className="exercise__done"> · solution peeked</span>}
          </p>
          <h1 className="exercise__title">{stripIdPrefix(exercise.title)}</h1>
          {exercise.kind === 'observation' && (
            <p className="exercise__obs-tag">
              Observation exercise · the learning happens in the terraform CLI; tick the checklist after you've followed the steps locally.
            </p>
          )}
        </div>
        <nav className="exercise__nav" aria-label="Exercise navigation">
          {prev ? (
            <Link className="exercise__nav-link" to={`/exercise/${prev}`}>← Prev</Link>
          ) : (
            <span className="exercise__nav-link exercise__nav-link--disabled">← Prev</span>
          )}
          {next ? (
            <Link className="exercise__nav-link" to={`/exercise/${next}`}>Next →</Link>
          ) : (
            <span className="exercise__nav-link exercise__nav-link--disabled">Next →</span>
          )}
        </nav>
      </header>

      <div className="exercise__body">
        <section className="exercise__content">
          <MarkdownRenderer source={exercise.readme} />
          <SolutionPanel exercise={exercise} previouslyPeeked={peeked} />
        </section>

        <aside className="exercise__side">
          {entry?.kind === 'auto' ? (
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
              <ValidationPanel exerciseId={id} code={editorValue} />
            </div>
          ) : entry?.kind === 'observation' ? (
            <ObservationChecklist
              exerciseId={id}
              spec={entry.observation}
              initiallyCompleted={completed}
            />
          ) : (
            <div className="placeholder-panel">
              <h3>Not registered</h3>
              <p>This exercise has no auto-validator or observation spec — please file an issue.</p>
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
      <p><Link to="/">Return home</Link>.</p>
    </div>
  );
}
