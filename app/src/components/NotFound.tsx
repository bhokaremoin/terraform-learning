import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="notfound">
      <h1>Page not found</h1>
      <p>
        That route doesn't match any exercise. <Link to="/">Return home</Link>.
      </p>
    </div>
  );
}
