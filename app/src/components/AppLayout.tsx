import { Link, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

/**
 * Top-level frame: header + sidebar + main outlet for routed content.
 */
export default function AppLayout() {
  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="header__brand">
          <span className="header__logo" aria-hidden="true">
            ▲
          </span>
          terraform-learning
        </Link>
        <span className="header__hint">
          Interactive Terraform fundamentals · runs offline
        </span>
      </header>
      <div className="app__body">
        <Sidebar />
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
