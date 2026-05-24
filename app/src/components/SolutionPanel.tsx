import { useEffect, useState } from 'react';
import { markPeeked } from '../lib/storage';
import type { Exercise } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface Props {
  exercise: Exercise;
  /** True if the user previously peeked at the solution. */
  previouslyPeeked: boolean;
}

export default function SolutionPanel({ exercise, previouslyPeeked }: Props) {
  const [revealed, setRevealed] = useState(previouslyPeeked);

  // ExerciseView is reused across /exercise/:id route changes (only props
  // change, no unmount). Without this, "Show solution" clicked on ex01
  // leaves SolutionPanel `revealed = true`, and when you navigate to ex02
  // its solution is already shown without a click.
  useEffect(() => {
    setRevealed(previouslyPeeked);
  }, [exercise.id, previouslyPeeked]);

  const reveal = () => {
    if (!revealed) {
      markPeeked(exercise.id);
      setRevealed(true);
    }
  };

  return (
    <section className="solution">
      {!revealed ? (
        <div className="solution__teaser">
          <h3 className="solution__title">Stuck?</h3>
          <p className="solution__lede">
            Show the canonical solution for this exercise. Peeking marks the exercise as "solution revealed"
            but doesn't lock you out of completing it.
          </p>
          <button type="button" className="solution__btn" onClick={reveal}>
            Show solution
          </button>
        </div>
      ) : (
        <div className="solution__revealed">
          <div className="solution__head">
            <h3 className="solution__title">Solution</h3>
            <span className="solution__peeked" title="You revealed the solution at some point">
              ◔ peeked
            </span>
          </div>
          <MarkdownRenderer source={exercise.solution} />
        </div>
      )}
    </section>
  );
}
