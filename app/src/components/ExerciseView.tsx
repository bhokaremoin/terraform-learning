import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getExerciseById, getNextExerciseId, getPrevExerciseId } from '../lib/content';
import { readFromDisk, writeToDisk } from '../lib/disk-sync';
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

  // A ref that always points at the latest editorValue, no closure staleness.
  // Used by the navigation cleanup below: the cleanup's closure captures the
  // OLD id (correct — we want to save against the exercise we're leaving)
  // but reads the current value from the ref so we don't write stale data.
  const editorValueRef = useRef(editorValue);
  editorValueRef.current = editorValue;

  // The value we most recently know is on disk — either because we wrote it
  // or because we just read it. Used to decide whether a disk write is
  // necessary (skip if disk already has this exact content) so that:
  //   1. Navigating between exercises without typing never touches disk.
  //   2. Edits made externally (vim/vscode) aren't blindly overwritten
  //      when the user comes back to this exercise.
  // null means "we don't know yet" (production build, network error, or
  // before the first disk read on this exercise).
  const lastWrittenToDiskRef = useRef<string | null>(null);

  useEffect(() => {
    setEditorValue(getCode(id) ?? exercise.starter);
  }, [id, exercise.starter]);

  // On exercise mount/change, read the actual file from disk. If it exists
  // and differs from what the browser would otherwise show, AND the user
  // hasn't typed since the route landed, adopt the disk content. This is
  // how vim/vscode edits become visible in the browser editor.
  useEffect(() => {
    let cancelled = false;
    const baseline = getCode(id) ?? exercise.starter; // what the editor was just initialized with
    void readFromDisk(exercise.slug).then((diskContent) => {
      if (cancelled || diskContent === null) return;
      lastWrittenToDiskRef.current = diskContent;
      // Only adopt disk content if the editor still shows the baseline
      // value — if the user has typed something since landing here, leave
      // their input alone; the next debounced sync will write it through.
      if (diskContent !== baseline && editorValueRef.current === baseline) {
        setEditorValue(diskContent);
        setCode(id, diskContent);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, exercise.slug, exercise.starter]);

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // localStorage write is unconditional (cheap, idempotent). Disk write is
  // conditional on the value being different from what we last knew was on
  // disk — so we never blindly overwrite an external edit, and so that
  // navigating without typing never produces a disk write.
  const persist = useCallback((thisId: string, thisSlug: string, value: string) => {
    setCode(thisId, value);
    if (value !== lastWrittenToDiskRef.current) {
      void writeToDisk(thisSlug, value).then((ok) => {
        if (ok) lastWrittenToDiskRef.current = value;
      });
    }
  }, []);

  const onEditorChange = useCallback(
    (value: string) => {
      setEditorValue(value);
      if (persistTimer.current) clearTimeout(persistTimer.current);
      const thisId = id;
      const thisSlug = exercise.slug;
      persistTimer.current = setTimeout(() => {
        persist(thisId, thisSlug, value);
        persistTimer.current = null;
      }, DEBOUNCE_MS);
    },
    [id, exercise.slug, persist],
  );

  // Flush any pending write when we leave this exercise. The dirty check
  // inside persist() means cleanup is a no-op for disk if nothing changed
  // since the last successful sync — so navigating doesn't clobber disk.
  useEffect(() => {
    const thisId = id;
    const thisSlug = exercise.slug;
    return () => {
      if (persistTimer.current) {
        clearTimeout(persistTimer.current);
        persistTimer.current = null;
        persist(thisId, thisSlug, editorValueRef.current);
      }
    };
  }, [id, exercise.slug, persist]);

  const resetToStarter = () => {
    if (
      editorValue !== exercise.starter &&
      !window.confirm('Replace your typed code with the original starter for this exercise?')
    ) {
      return;
    }
    setEditorValue(exercise.starter);
    persist(id, exercise.slug, exercise.starter);
  };

  return (
    <article className="exercise">
      <header className="exercise__header">
        <div className="exercise__heading">
          <p className="exercise__eyebrow">
            Exercise {exercise.id}
            {completed && <span className="exercise__done"> · completed</span>}
            {peeked && !completed && <span className="exercise__done"> · solution peeked</span>}
          </p>
          <h1 className="exercise__title">{stripIdPrefix(exercise.title)}</h1>
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
          {exercise.kind === 'observation' && (
            <p className="exercise__obs-tag">
              Observation exercise · the learning happens in the terraform CLI; tick the checklist after you've followed the steps locally.
            </p>
          )}
          <MarkdownRenderer source={exercise.readme} />
          <SolutionPanel exercise={exercise} previouslyPeeked={peeked} />
        </section>

        <aside className="exercise__side">
          {entry?.kind === 'auto' ? (
            <div className="editor-panel">
              <div className="editor-panel__toolbar">
                <div className="editor-panel__title-row">
                  <h3 className="editor-panel__title">Your HCL</h3>
                  <span
                    className="editor-panel__path"
                    title="In dev mode, your edits sync to this file on disk so you can run terraform CLI against them."
                  >
                    {exercise.slug}/main.tf
                  </span>
                </div>
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
