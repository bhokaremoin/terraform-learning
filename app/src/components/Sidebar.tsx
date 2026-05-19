import { NavLink } from 'react-router-dom';
import { EXERCISES } from '../lib/content';

/**
 * Left rail listing all 10 exercises. Highlights the current one
 * via NavLink's automatic `active` class. State badges (completed,
 * peeked, observation) lock in here in later phases when storage
 * is wired up.
 */
export default function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Exercises">
      <h2 className="sidebar__title">Exercises</h2>
      <ol className="sidebar__list">
        {EXERCISES.map((e) => (
          <li key={e.id} className="sidebar__item">
            <NavLink
              to={`/exercise/${e.id}`}
              className={({ isActive }) =>
                'sidebar__link' + (isActive ? ' sidebar__link--active' : '')
              }
            >
              <span className="sidebar__id">{e.id}</span>
              <span className="sidebar__name">{stripIdPrefix(e.title)}</span>
              {e.kind === 'observation' && (
                <span className="sidebar__badge" title="Observation exercise">
                  obs
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * "01 · Hello World" → "Hello World"
 * The id is already shown as its own column; don't double-print it.
 */
function stripIdPrefix(title: string): string {
  return title.replace(/^\d{2}\s*[·:.\-—]\s*/, '');
}
