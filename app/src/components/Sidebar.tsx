import { NavLink } from 'react-router-dom';
import { EXERCISES } from '../lib/content';
import { useProgress } from '../lib/useProgress';

/**
 * Left rail listing all 10 exercises with current/completed/peeked state.
 */
export default function Sidebar() {
  const progress = useProgress();

  return (
    <nav className="sidebar" aria-label="Exercises">
      <h2 className="sidebar__title">Exercises</h2>
      <ol className="sidebar__list">
        {EXERCISES.map((e) => {
          const done = !!progress.completed[e.id];
          const peeked = !!progress.peeked[e.id];
          return (
            <li key={e.id} className="sidebar__item">
              <NavLink
                to={`/exercise/${e.id}`}
                className={({ isActive }) =>
                  'sidebar__link' + (isActive ? ' sidebar__link--active' : '')
                }
              >
                <span className="sidebar__id">{e.id}</span>
                <span className="sidebar__name">{stripIdPrefix(e.title)}</span>
                <span className="sidebar__marks">
                  {done && <span className="sidebar__check" title="Completed">✓</span>}
                  {peeked && !done && (
                    <span className="sidebar__peeked" title="Solution peeked">◔</span>
                  )}
                  {e.kind === 'observation' && (
                    <span className="sidebar__badge" title="Observation exercise">obs</span>
                  )}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function stripIdPrefix(title: string): string {
  return title.replace(/^\d{2}\s*[·:.\-—]\s*/, '');
}
