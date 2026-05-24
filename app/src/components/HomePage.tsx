import { Link } from 'react-router-dom';
import { EXERCISES } from '../lib/content';

export default function HomePage() {
  return (
    <div className="home">
      <section className="home__hero">
        <h1>Learn Terraform fundamentals, interactively.</h1>
        <p className="home__lede">
          Ten progressive exercises that run entirely on your laptop. No cloud account, no API keys,
          no Terraform installed for the first few exercises — the seven auto-graded ones validate
          your HCL in the browser. The three observation exercises walk you through using terraform
          CLI locally to see real plan output.
        </p>
        <p>
          <Link to={`/exercise/${EXERCISES[0].id}`} className="home__cta">
            Start with exercise {EXERCISES[0].id} →
          </Link>
        </p>
      </section>

      <section className="home__list">
        <h2>All exercises</h2>
        <ol>
          {EXERCISES.map((e) => (
            <li key={e.id}>
              <Link to={`/exercise/${e.id}`}>
                <strong>{e.id}.</strong> {stripIdPrefix(e.title)}
              </Link>
              {e.kind === 'observation' && <span className="home__tag"> observation</span>}
              <p className="home__blurb">{firstNonHeadingLine(e.readme)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="home__how">
        <h2>How it works</h2>
        <ul>
          <li>Your typed code and completion progress are saved in this browser via localStorage.</li>
          <li>
            "Validate" parses your HCL in the browser; the app never executes your code, never sends
            it anywhere, never runs Terraform.
          </li>
          <li>
            Each exercise has a "Show solution" link if you get stuck — it doesn't lock you out of
            passing.
          </li>
          <li>
            The static markdown tutorial is still in this repo if you'd rather work in your editor and
            terminal. See <code>00-START-HERE.md</code>.
          </li>
        </ul>
      </section>
    </div>
  );
}

function stripIdPrefix(title: string): string {
  return title.replace(/^\d{2}\s*[·:.\-—]\s*/, '');
}

/** A blurb for the home page: first non-heading, non-blank paragraph of the README. */
function firstNonHeadingLine(readme: string): string {
  const lines = readme.split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('#')) continue;
    if (t.startsWith('```')) continue;
    // Take the first prose line and clip to ~140 chars.
    return t.length > 140 ? t.slice(0, 137) + '…' : t;
  }
  return '';
}
