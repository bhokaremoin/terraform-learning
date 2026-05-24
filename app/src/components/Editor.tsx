import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { properties } from '@codemirror/legacy-modes/mode/properties';
import { tags as t } from '@lezer/highlight';

/**
 * HCL highlighting via CodeMirror's "properties" (ini-style) legacy mode.
 * CodeMirror 6 has no built-in HCL grammar. Properties mode handles
 * `key = value`, strings, and `#` comments — covers the bulk of HCL
 * syntax adequately. Block headers (`resource "..." "..." {`) render
 * unstyled, which is acceptable.
 */
const hclLanguage = StreamLanguage.define(properties);

/**
 * Syntax token palette pulled from CSS custom properties so the editor
 * inherits the page's light/dark theme.
 *
 * We can't read CSS vars inside a HighlightStyle directly (the styles
 * are compiled to a stylesheet string at construction time), so we read
 * the current values from <html> on mount and rebuild the style if the
 * media query flips.
 */
function readTokenPalette(): {
  keyword: string;
  string: string;
  number: string;
  comment: string;
  variable: string;
  fn: string;
  punct: string;
  bg: string;
  fg: string;
} {
  const root = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) =>
    root.getPropertyValue(name).trim() || fallback;
  return {
    keyword: get('--tok-keyword', '#cf222e'),
    string: get('--tok-string', '#0a3069'),
    number: get('--tok-number', '#0550ae'),
    comment: get('--tok-comment', '#6b7280'),
    variable: get('--tok-variable', '#953800'),
    fn: get('--tok-fn', '#6f42c1'),
    punct: get('--tok-punct', '#1a1f2e'),
    bg: get('--bg', '#ffffff'),
    fg: get('--fg', '#1a1f2e'),
  };
}

function buildHighlightStyle(palette: ReturnType<typeof readTokenPalette>) {
  return HighlightStyle.define([
    { tag: t.keyword, color: palette.keyword, fontWeight: '500' },
    { tag: [t.string, t.special(t.string)], color: palette.string },
    { tag: [t.number, t.bool, t.null], color: palette.number },
    { tag: [t.comment, t.lineComment, t.blockComment], color: palette.comment, fontStyle: 'italic' },
    { tag: [t.variableName, t.propertyName], color: palette.variable },
    { tag: [t.function(t.variableName), t.typeName, t.className], color: palette.fn },
    { tag: [t.punctuation, t.bracket, t.brace], color: palette.punct },
    { tag: t.invalid, color: palette.keyword, textDecoration: 'underline' },
  ]);
}

interface Props {
  /** Initial editor contents. Changes to this prop replace the contents. */
  value: string;
  /** Called whenever the editor's contents change (every keystroke). */
  onChange: (value: string) => void;
  /** Optional aria-label for the editor region. */
  ariaLabel?: string;
}

/**
 * CodeMirror 6 editor for the user's HCL.
 *
 * Uncontrolled internally (CodeMirror manages the EditorState) but kept
 * in sync with the `value` prop: when `value` changes from outside
 * (e.g., the user navigated to a different exercise), the editor's
 * contents are replaced via a dispatched transaction.
 */
export default function Editor({ value, onChange, ariaLabel }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Build the editor once on mount; tear down on unmount. We rebuild
  // the state (cheap) if the user flips light/dark mode so token colors
  // stay in sync — this is rare so a full rebuild is fine.
  useEffect(() => {
    if (!hostRef.current) return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');

    const mount = () => {
      const palette = readTokenPalette();
      const state = EditorState.create({
        doc: viewRef.current?.state.doc.toString() ?? value,
        extensions: [
          lineNumbers(),
          history(),
          highlightActiveLine(),
          syntaxHighlighting(buildHighlightStyle(palette), { fallback: true }),
          hclLanguage,
          EditorView.lineWrapping,
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
          EditorView.theme(
            {
              '&': { height: '100%', backgroundColor: palette.bg, color: palette.fg },
              '&.cm-focused': { outline: 'none' },
            },
            { dark: mql.matches },
          ),
        ],
      });

      if (viewRef.current) viewRef.current.destroy();
      viewRef.current = new EditorView({ state, parent: hostRef.current! });
    };

    mount();
    mql.addEventListener('change', mount);

    return () => {
      mql.removeEventListener('change', mount);
      viewRef.current?.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external `value` changes (e.g., on exercise switch or reset-to-starter).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    });
  }, [value]);

  return <div className="editor" ref={hostRef} aria-label={ariaLabel ?? 'HCL editor'} />;
}
