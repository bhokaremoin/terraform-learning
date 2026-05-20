import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { StreamLanguage, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { properties } from '@codemirror/legacy-modes/mode/properties';

/**
 * HCL highlighting via CodeMirror's "properties" (ini-style) legacy mode.
 *
 * CodeMirror 6 has no built-in HCL grammar. Properties mode handles
 * `key = value`, strings, and `#` comments — covers the bulk of HCL syntax
 * adequately for a tutorial. Block headers (`resource "..." "..." {`) render
 * unstyled, which is acceptable.
 */
const hclLanguage = StreamLanguage.define(properties);

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
 * Uncontrolled internally (CodeMirror manages the EditorState) but kept in
 * sync with the `value` prop: when `value` changes from outside (e.g., the
 * user navigated to a different exercise), the editor's contents are
 * replaced via a dispatched transaction.
 */
export default function Editor({ value, onChange, ariaLabel }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep the latest onChange callback reachable from inside the update listener
  // without recreating the editor on every render.
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Build the editor once on mount; tear down on unmount.
  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        highlightActiveLine(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        hclLanguage,
        EditorView.lineWrapping,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': { height: '100%', fontSize: '13px' },
          '.cm-scroller': {
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          },
          '.cm-content': { padding: '0.5rem 0' },
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external `value` changes (e.g., on exercise switch or reset-to-starter)
  // into the editor without unmounting it.
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
