import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

// Register only the languages our tutorial uses (trims highlight.js by ~10x).
// HCL is not built into highlight.js, so we alias hcl/terraform to `ini` —
// it handles strings, comments, and `key = value` pairs well; block headers
// like `resource "type" "name"` render unstyled, which is acceptable.
import bash from 'highlight.js/lib/languages/bash';
import diff from 'highlight.js/lib/languages/diff';
import ini from 'highlight.js/lib/languages/ini';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import plaintext from 'highlight.js/lib/languages/plaintext';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

import 'highlight.js/styles/github-dark.css';

const LANGUAGES = {
  bash,
  shell: bash,
  diff,
  ini,
  hcl: ini,
  terraform: ini,
  tf: ini,
  javascript,
  js: javascript,
  json,
  plaintext,
  text: plaintext,
  xml,
  html: xml,
  yaml,
  yml: yaml,
};

interface Props {
  source: string;
}

/**
 * Renders an exercise's markdown content.
 *
 * - GFM for tables and task lists.
 * - rehype-highlight (with a curated language set) for fenced code blocks.
 * - rehype-raw so the existing markdown's <details>/<summary> tags
 *   (used for progressive hints) render as real collapsible disclosures.
 */
export default function MarkdownRenderer({ source }: Props) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeHighlight, { languages: LANGUAGES }]]}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
