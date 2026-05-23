import { useEffect, useState } from 'react';
import { markCompleted } from '../lib/storage';
import type { ObservationSpec } from '../lib/validator-types';
import type { ExerciseId } from '../types';

interface Props {
  exerciseId: ExerciseId;
  spec: ObservationSpec;
  /** True if the exercise was already marked complete in a previous session. */
  initiallyCompleted?: boolean;
  /** Called after marking complete so parents can refresh sidebar/progress. */
  onComplete?: () => void;
}

/**
 * Self-attest flow for observation exercises (05/06/10).
 * The user ticks every box, then clicks "Mark complete".
 */
export default function ObservationChecklist({
  exerciseId,
  spec,
  initiallyCompleted = false,
  onComplete,
}: Props) {
  const [checked, setChecked] = useState<boolean[]>(() =>
    spec.checklist.map(() => initiallyCompleted),
  );
  const [completed, setCompleted] = useState(initiallyCompleted);

  // When we navigate between observation exercises, reset the per-screen state
  // (completed flag is read from storage by the parent and supplied as initial).
  useEffect(() => {
    setChecked(spec.checklist.map(() => initiallyCompleted));
    setCompleted(initiallyCompleted);
  }, [exerciseId, initiallyCompleted, spec.checklist]);

  const allTicked = checked.every(Boolean);

  const toggle = (i: number) => {
    setChecked((arr) => arr.map((v, idx) => (idx === i ? !v : v)));
  };

  const markDone = () => {
    markCompleted(exerciseId);
    setCompleted(true);
    onComplete?.();
  };

  return (
    <div className="observation">
      <h3 className="observation__title">Observation checklist</h3>
      <p className="observation__why">{spec.why}</p>
      <ol className="observation__list">
        {spec.checklist.map((step, i) => (
          <li key={i} className="observation__item">
            <label className="observation__label">
              <input
                type="checkbox"
                checked={checked[i] || completed}
                onChange={() => toggle(i)}
                disabled={completed}
              />
              <span className="observation__step">{step.label}</span>
            </label>
            {step.hint && <p className="observation__hint">{step.hint}</p>}
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="observation__btn"
        disabled={!allTicked || completed}
        onClick={markDone}
      >
        {completed ? '✓ Marked complete' : 'Mark complete'}
      </button>
      {completed && (
        <p className="observation__sub">
          Recorded. You can move on to the next exercise.
        </p>
      )}
    </div>
  );
}
