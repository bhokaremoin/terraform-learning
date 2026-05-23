import { useState } from 'react';
import { parseHcl } from '../lib/hcl';
import { getRegistryEntry } from '../lib/registry';
import { markCompleted } from '../lib/storage';
import type { ValidationResult } from '../lib/validator-types';
import type { ExerciseId } from '../types';

interface Props {
  exerciseId: ExerciseId;
  /** Live editor contents. */
  code: string;
  /** Called after a successful validation so parents can refresh sidebar/progress. */
  onPass?: () => void;
}

export default function ValidationPanel({ exerciseId, code, onPass }: Props) {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [running, setRunning] = useState(false);

  const onValidate = () => {
    setRunning(true);
    try {
      const entry = getRegistryEntry(exerciseId);
      if (!entry || entry.kind !== 'auto') {
        setResult({
          kind: 'fail',
          message: 'This exercise has no auto-validator wired up.',
        });
        return;
      }
      const parsed = parseHcl(code);
      if (!parsed.ok) {
        setResult({
          kind: 'parse-error',
          message: parsed.error,
          line: parsed.line,
          col: parsed.col,
        });
        return;
      }
      try {
        const next = entry.validate(parsed.ast);
        setResult(next);
        if (next.kind === 'pass') {
          markCompleted(exerciseId);
          onPass?.();
        }
      } catch (err) {
        setResult({
          kind: 'fail',
          message: `Validator crashed: ${(err as Error).message}. This is a bug — please file an issue.`,
        });
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="validation">
      <div className="validation__bar">
        <button
          type="button"
          className="validation__btn"
          onClick={onValidate}
          disabled={running}
        >
          {running ? 'Validating…' : 'Validate'}
        </button>
        <span className="validation__why">
          Parses your HCL in the browser and checks structural requirements. No code is executed.
        </span>
      </div>

      {result && <ResultBox result={result} />}
    </div>
  );
}

function ResultBox({ result }: { result: ValidationResult }) {
  if (result.kind === 'pass') {
    return (
      <div className="validation__result validation__result--pass" role="status">
        <strong>✓ Pass.</strong>
        {result.note && <span className="validation__note"> {result.note}</span>}
        <p className="validation__sub">
          This exercise is marked complete. Try the experiments at the bottom of the README to dig deeper,
          then move on to the next exercise.
        </p>
      </div>
    );
  }
  if (result.kind === 'fail') {
    return (
      <div className="validation__result validation__result--fail" role="alert">
        <strong>✗ Not yet.</strong> <span className="validation__msg">{result.message}</span>
        {result.hint && (
          <details className="validation__hint">
            <summary>Hint</summary>
            <p>{result.hint}</p>
          </details>
        )}
      </div>
    );
  }
  // parse-error
  return (
    <div className="validation__result validation__result--fail" role="alert">
      <strong>Syntax error</strong> at line {result.line}, column {result.col}: {result.message}
      <p className="validation__sub">
        Fix the HCL syntax and click Validate again. The parser handles comments, blocks, strings with{' '}
        <code>${'${...}'}</code> interpolations, and common expressions.
      </p>
    </div>
  );
}
