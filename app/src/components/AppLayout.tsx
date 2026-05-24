import { Link, Outlet } from 'react-router-dom';
import ProgressBar from './ProgressBar';
import ResetButton from './ResetButton';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="header__brand">
          <span className="header__logo" aria-hidden="true">▲</span>
          terraform-learning
        </Link>
        <div className="header__right">
          <ProgressBar />
          <ResetButton />
        </div>
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
