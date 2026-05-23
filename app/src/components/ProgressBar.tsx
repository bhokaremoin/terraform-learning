import { EXERCISES } from '../lib/content';
import { useProgress } from '../lib/useProgress';

export default function ProgressBar() {
  const progress = useProgress();
  const total = EXERCISES.length;
  const done = Object.keys(progress.completed).length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="progress" aria-label={`${done} of ${total} exercises complete`}>
      <div className="progress__bar">
        <div className="progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress__label">
        {done} / {total}
      </span>
    </div>
  );
}
