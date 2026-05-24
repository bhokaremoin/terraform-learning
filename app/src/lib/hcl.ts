/**
 * Tolerant HCL2 subset parser.
 *
 * Scope: enough to support structural validation of the tutorial's exercises.
 * Specifically:
 *   - Comments (#, //, /* * /)
 *   - Identifiers, numbers, booleans, null
 *   - Strings with ${...} interpolations (we capture interpolation regions
 *     as opaque text — validators inspect literal segments).
 *   - Blocks: `<type> [labels...] { ... }` with nested blocks/attributes.
 *   - Attributes: `<name> = <expression>`.
 *   - Expressions: literals, lists `[a, b]`, objects `{ k = v }`,
 *     traversals `a.b.c`, indexed access `a[0]`, splat `a[*]`,
 *     function calls `name(args)`.
 *
 * Out of scope (parser tolerates by capturing raw text):
 *   - Heredocs (`<<EOF ... EOF`) — recognized and consumed as opaque strings.
 *   - For expressions (`[for ... in ... : ...]`) — captured as opaque list.
 *   - Conditional `? :`, arithmetic, comparison — captured as `unknown`.
 *
 * On parse error, returns { ok: false, error, line, col } — the editor /
 * validator UI surfaces this verbatim rather than throwing.
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface HclAst {
  blocks: HclBlock[];
}

export interface HclBlock {
  type: string;
  labels: string[];
  body: {
    attributes: HclAttribute[];
    blocks: HclBlock[];
  };
}

export interface HclAttribute {
  name: string;
  value: HclValue;
}

export type HclValue =
  | { kind: 'string'; segments: StringSegment[] }
  | { kind: 'number'; value: number }
  | { kind: 'bool'; value: boolean }
  | { kind: 'null' }
  | { kind: 'list'; items: HclValue[] }
  | { kind: 'object'; entries: { key: string; value: HclValue }[] }
  | { kind: 'traversal'; path: TraversalStep[] }
  | { kind: 'call'; name: string; args: HclValue[] }
  | { kind: 'unknown'; text: string };

export type StringSegment = { literal: string } | { interp: string };

export type TraversalStep =
  | { kind: 'attr'; name: string }
  | { kind: 'index'; value: number | string }
  | { kind: 'splat' };

export type ParseResult =
  | { ok: true; ast: HclAst }
  | { ok: false; error: string; line: number; col: number };

/* -------------------------------------------------------------------------- */
/* Lexer                                                                      */
/* -------------------------------------------------------------------------- */

type TokenKind =
  | 'IDENT'
  | 'STRING'
  | 'HEREDOC'
  | 'NUMBER'
  | 'BOOL'
  | 'NULL'
  | 'LBRACE'
  | 'RBRACE'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'DOT'
  | 'EQ'
  | 'COLON'
  | 'EOF';

interface Token {
  kind: TokenKind;
  text: string;
  /** For STRING tokens, the segments (literal + interpolated regions). */
  segments?: StringSegment[];
  /** For NUMBER tokens. */
  number?: number;
  /** For BOOL tokens. */
  bool?: boolean;
  line: number;
  col: number;
}

class LexError extends Error {
  constructor(
    msg: string,
    public line: number,
    public col: number,
  ) {
    super(msg);
  }
}

function isIdentStart(ch: string): boolean {
  return /[A-Za-z_]/.test(ch);
}

function isIdentCont(ch: string): boolean {
  return /[A-Za-z0-9_-]/.test(ch);
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function lex(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const advance = (n = 1) => {
    for (let k = 0; k < n; k++) {
      if (input[i] === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
    }
  };

  const peek = (offset = 0) => input[i + offset] ?? '';

  while (i < input.length) {
    const ch = input[i];

    // Whitespace and newlines.
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      advance();
      continue;
    }

    // Line comments.
    if (ch === '#' || (ch === '/' && peek(1) === '/')) {
      while (i < input.length && input[i] !== '\n') advance();
      continue;
    }

    // Block comments.
    if (ch === '/' && peek(1) === '*') {
      const startLine = line,
        startCol = col;
      advance(2);
      while (i < input.length && !(input[i] === '*' && peek(1) === '/')) advance();
      if (i >= input.length) throw new LexError('Unterminated block comment', startLine, startCol);
      advance(2);
      continue;
    }

    // Single-char tokens.
    const single: Record<string, TokenKind> = {
      '{': 'LBRACE',
      '}': 'RBRACE',
      '[': 'LBRACKET',
      ']': 'RBRACKET',
      '(': 'LPAREN',
      ')': 'RPAREN',
      ',': 'COMMA',
      '.': 'DOT',
      '=': 'EQ',
      ':': 'COLON',
    };
    if (single[ch]) {
      tokens.push({ kind: single[ch], text: ch, line, col });
      advance();
      continue;
    }

    // Splat star — only meaningful inside `[*]` for our subset. Emit as IDENT
    // text "*" so the traversal parser can recognize it via match('IDENT', '*').
    if (ch === '*') {
      tokens.push({ kind: 'IDENT', text: '*', line, col });
      advance();
      continue;
    }

    // Strings.
    if (ch === '"') {
      const startLine = line;
      const startCol = col;
      const segments: StringSegment[] = [];
      let literal = '';
      advance(); // opening "
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\') {
          const next = peek(1);
          const escapes: Record<string, string> = {
            n: '\n',
            r: '\r',
            t: '\t',
            '"': '"',
            '\\': '\\',
            '\n': '\n',
          };
          if (escapes[next] !== undefined) {
            literal += escapes[next];
            advance(2);
          } else {
            literal += input[i];
            advance();
          }
          continue;
        }
        if (input[i] === '$' && peek(1) === '{') {
          // Interpolation. Capture as opaque text, brace-balanced.
          if (literal) {
            segments.push({ literal });
            literal = '';
          }
          advance(2);
          let depth = 1;
          let interp = '';
          while (i < input.length && depth > 0) {
            if (input[i] === '{') depth++;
            else if (input[i] === '}') {
              depth--;
              if (depth === 0) break;
            } else if (input[i] === '"') {
              // Nested string — consume to the matching ".
              interp += input[i];
              advance();
              while (i < input.length && input[i] !== '"') {
                if (input[i] === '\\' && i + 1 < input.length) {
                  interp += input[i] + input[i + 1];
                  advance(2);
                  continue;
                }
                interp += input[i];
                advance();
              }
              if (i < input.length) {
                interp += input[i];
                advance();
              }
              continue;
            }
            interp += input[i];
            advance();
          }
          if (i >= input.length) throw new LexError('Unterminated interpolation', startLine, startCol);
          advance(); // closing }
          segments.push({ interp });
          continue;
        }
        literal += input[i];
        advance();
      }
      if (i >= input.length) throw new LexError('Unterminated string', startLine, startCol);
      advance(); // closing "
      if (literal) segments.push({ literal });
      tokens.push({ kind: 'STRING', text: '"..."', segments, line: startLine, col: startCol });
      continue;
    }

    // Heredoc.
    if (ch === '<' && peek(1) === '<') {
      const startLine = line,
        startCol = col;
      advance(2);
      let indented = false;
      if (peek() === '-') {
        indented = true;
        advance();
      }
      let tag = '';
      while (i < input.length && isIdentCont(input[i])) {
        tag += input[i];
        advance();
      }
      if (!tag) throw new LexError('Heredoc missing tag', startLine, startCol);
      while (i < input.length && input[i] !== '\n') advance();
      advance(); // newline
      let body = '';
      while (i < input.length) {
        // Check for terminator: optionally-indented `tag` at start of line.
        let probe = i;
        if (indented) while (probe < input.length && (input[probe] === ' ' || input[probe] === '\t')) probe++;
        if (input.slice(probe, probe + tag.length) === tag) {
          const after = input[probe + tag.length] ?? '';
          if (after === '\n' || after === '' || after === '\r') {
            // Consume up to and including the terminator (skip indent, tag).
            while (i < probe) advance();
            for (let k = 0; k < tag.length; k++) advance();
            break;
          }
        }
        body += input[i];
        advance();
      }
      tokens.push({
        kind: 'HEREDOC',
        text: body,
        segments: [{ literal: body }],
        line: startLine,
        col: startCol,
      });
      continue;
    }

    // Numbers.
    if (isDigit(ch) || (ch === '-' && isDigit(peek(1)))) {
      const startLine = line,
        startCol = col;
      let s = '';
      if (input[i] === '-') {
        s += input[i];
        advance();
      }
      while (i < input.length && isDigit(input[i])) {
        s += input[i];
        advance();
      }
      if (input[i] === '.' && isDigit(peek(1))) {
        s += input[i];
        advance();
        while (i < input.length && isDigit(input[i])) {
          s += input[i];
          advance();
        }
      }
      tokens.push({ kind: 'NUMBER', text: s, number: Number(s), line: startLine, col: startCol });
      continue;
    }

    // Identifiers / keywords.
    if (isIdentStart(ch)) {
      const startLine = line,
        startCol = col;
      let s = '';
      while (i < input.length && isIdentCont(input[i])) {
        s += input[i];
        advance();
      }
      if (s === 'true' || s === 'false') {
        tokens.push({ kind: 'BOOL', text: s, bool: s === 'true', line: startLine, col: startCol });
      } else if (s === 'null') {
        tokens.push({ kind: 'NULL', text: s, line: startLine, col: startCol });
      } else {
        tokens.push({ kind: 'IDENT', text: s, line: startLine, col: startCol });
      }
      continue;
    }

    throw new LexError(`Unexpected character ${JSON.stringify(ch)}`, line, col);
  }

  tokens.push({ kind: 'EOF', text: '', line, col });
  return tokens;
}

/* -------------------------------------------------------------------------- */
/* Parser                                                                     */
/* -------------------------------------------------------------------------- */

class ParseError extends Error {
  constructor(
    msg: string,
    public line: number,
    public col: number,
  ) {
    super(msg);
  }
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  peek(offset = 0): Token {
    return this.tokens[this.pos + offset];
  }

  advance(): Token {
    return this.tokens[this.pos++];
  }

  match(kind: TokenKind, text?: string): boolean {
    const t = this.peek();
    return t.kind === kind && (text === undefined || t.text === text);
  }

  expect(kind: TokenKind, text?: string): Token {
    const t = this.peek();
    if (t.kind !== kind || (text !== undefined && t.text !== text)) {
      throw new ParseError(
        `Expected ${text ?? kind}, got ${t.kind === 'EOF' ? 'end of input' : t.kind}(${JSON.stringify(t.text)})`,
        t.line,
        t.col,
      );
    }
    return this.advance();
  }

  parseFile(): HclAst {
    const blocks: HclBlock[] = [];
    while (!this.match('EOF')) {
      // Top-level can be: a block (IDENT [labels] {), or an attribute (IDENT =).
      // For our purposes top-level is always blocks; we tolerate stray attrs too.
      if (this.match('IDENT')) {
        // Look ahead: if next-after-IDENT is `=`, it's a top-level attribute
        // (rare in HCL but allowed). Otherwise it's a block.
        const lookahead = this.peek(1);
        if (lookahead.kind === 'EQ') {
          // Top-level attribute — swallow and continue.
          this.parseAttribute();
          continue;
        }
        blocks.push(this.parseBlock());
      } else {
        const t = this.peek();
        throw new ParseError(
          `Expected top-level block, got ${t.kind}(${JSON.stringify(t.text)})`,
          t.line,
          t.col,
        );
      }
    }
    return { blocks };
  }

  parseBlock(): HclBlock {
    const typeTok = this.expect('IDENT');
    const labels: string[] = [];
    while (!this.match('LBRACE')) {
      if (this.match('STRING')) {
        const s = this.advance();
        labels.push(joinSegments(s.segments ?? []));
      } else if (this.match('IDENT')) {
        labels.push(this.advance().text);
      } else {
        const t = this.peek();
        throw new ParseError(
          `Expected block label or '{', got ${t.kind}`,
          t.line,
          t.col,
        );
      }
    }
    this.expect('LBRACE');
    const body = this.parseBody();
    this.expect('RBRACE');
    return { type: typeTok.text, labels, body };
  }

  parseBody(): HclBlock['body'] {
    const attributes: HclAttribute[] = [];
    const blocks: HclBlock[] = [];
    while (!this.match('RBRACE') && !this.match('EOF')) {
      if (this.match('IDENT')) {
        // Either attribute (`x =`) or nested block (`type "label" {`).
        const lookahead = this.peek(1);
        if (lookahead.kind === 'EQ') {
          attributes.push(this.parseAttribute());
        } else {
          blocks.push(this.parseBlock());
        }
      } else {
        const t = this.peek();
        throw new ParseError(
          `Expected attribute or nested block, got ${t.kind}(${JSON.stringify(t.text)})`,
          t.line,
          t.col,
        );
      }
    }
    return { attributes, blocks };
  }

  parseAttribute(): HclAttribute {
    const name = this.expect('IDENT').text;
    this.expect('EQ');
    const value = this.parseExpression();
    return { name, value };
  }

  /**
   * Parse a single expression. Tolerant: when something unrecognized appears
   * (e.g., a `for` keyword inside `[...]`), capture the rest as `unknown`.
   */
  parseExpression(): HclValue {
    const t = this.peek();

    // Literal values.
    if (t.kind === 'STRING' || t.kind === 'HEREDOC') {
      const tok = this.advance();
      return { kind: 'string', segments: tok.segments ?? [] };
    }
    if (t.kind === 'NUMBER') {
      this.advance();
      return { kind: 'number', value: t.number ?? 0 };
    }
    if (t.kind === 'BOOL') {
      this.advance();
      return { kind: 'bool', value: t.bool === true };
    }
    if (t.kind === 'NULL') {
      this.advance();
      return { kind: 'null' };
    }

    // List or for-expression.
    if (t.kind === 'LBRACKET') {
      return this.parseListOrForList();
    }

    // Object or for-expression.
    if (t.kind === 'LBRACE') {
      return this.parseObjectOrForObject();
    }

    // Identifier — function call OR traversal OR for-expression keyword.
    if (t.kind === 'IDENT') {
      // for-expression heads aren't allowed at top of an expression directly
      // (they're inside [] or {}), so any IDENT here is a traversal-or-call.
      return this.parseTraversalOrCall();
    }

    // Anything else: capture raw text until end of attribute/line and call it unknown.
    return this.captureUnknown();
  }

  private parseListOrForList(): HclValue {
    const start = this.expect('LBRACKET');
    // Detect for-expression: `[for ... in ... : ...]`
    if (this.match('IDENT', 'for')) {
      return this.captureUntilMatching('LBRACKET', 'RBRACKET', start);
    }
    const items: HclValue[] = [];
    if (!this.match('RBRACKET')) {
      items.push(this.parseExpression());
      while (this.match('COMMA')) {
        this.advance();
        if (this.match('RBRACKET')) break; // trailing comma
        items.push(this.parseExpression());
      }
    }
    this.expect('RBRACKET');
    return { kind: 'list', items };
  }

  private parseObjectOrForObject(): HclValue {
    const start = this.expect('LBRACE');
    if (this.match('IDENT', 'for')) {
      return this.captureUntilMatching('LBRACE', 'RBRACE', start);
    }
    const entries: { key: string; value: HclValue }[] = [];
    while (!this.match('RBRACE') && !this.match('EOF')) {
      // Entry key: IDENT or STRING.
      let key: string;
      if (this.match('IDENT')) key = this.advance().text;
      else if (this.match('STRING')) key = joinSegments(this.advance().segments ?? []);
      else {
        const t = this.peek();
        throw new ParseError(`Expected object key, got ${t.kind}`, t.line, t.col);
      }
      // Allow `=` or `:` between key and value (HCL accepts both for object entries).
      if (this.match('EQ') || this.match('COLON')) this.advance();
      const value = this.parseExpression();
      entries.push({ key, value });
      if (this.match('COMMA')) this.advance();
    }
    this.expect('RBRACE');
    return { kind: 'object', entries };
  }

  private parseTraversalOrCall(): HclValue {
    const head = this.expect('IDENT').text;
    // Function call?
    if (this.match('LPAREN')) {
      this.advance();
      const args: HclValue[] = [];
      if (!this.match('RPAREN')) {
        args.push(this.parseExpression());
        while (this.match('COMMA')) {
          this.advance();
          if (this.match('RPAREN')) break;
          args.push(this.parseExpression());
        }
      }
      this.expect('RPAREN');
      return { kind: 'call', name: head, args };
    }
    // Traversal: head followed by .attr / [idx] / [*].
    const path: TraversalStep[] = [{ kind: 'attr', name: head }];
    while (true) {
      if (this.match('DOT')) {
        this.advance();
        if (this.match('IDENT')) {
          path.push({ kind: 'attr', name: this.advance().text });
        } else {
          // `something.` followed by an unexpected token — bail with unknown.
          break;
        }
      } else if (this.match('LBRACKET')) {
        this.advance();
        if (this.match('IDENT', '*')) {
          this.advance();
          this.expect('RBRACKET');
          path.push({ kind: 'splat' });
        } else if (this.match('NUMBER')) {
          const n = this.advance().number ?? 0;
          this.expect('RBRACKET');
          path.push({ kind: 'index', value: n });
        } else if (this.match('STRING')) {
          const s = joinSegments(this.advance().segments ?? []);
          this.expect('RBRACKET');
          path.push({ kind: 'index', value: s });
        } else {
          // Unknown index expression — treat as splat tolerantly and continue.
          while (!this.match('RBRACKET') && !this.match('EOF')) this.advance();
          if (this.match('RBRACKET')) this.advance();
          path.push({ kind: 'splat' });
        }
      } else {
        break;
      }
    }
    return { kind: 'traversal', path };
  }

  /**
   * Consume tokens until we hit a brace-balanced match of `close`. Used to
   * skip over expressions we don't fully parse (for-expressions). Returns
   * a placeholder `{ kind: 'unknown', text }` so validators can still see
   * the attribute exists.
   */
  private captureUntilMatching(open: TokenKind, close: TokenKind, _start: Token): HclValue {
    let depth = 1;
    const parts: string[] = [];
    while (!this.match('EOF') && depth > 0) {
      const t = this.peek();
      if (t.kind === open) depth++;
      else if (t.kind === close) {
        depth--;
        if (depth === 0) {
          this.advance();
          break;
        }
      }
      parts.push(t.text);
      this.advance();
    }
    return { kind: 'unknown', text: parts.join(' ') };
  }

  private captureUnknown(): HclValue {
    // For an unexpected leading token, gobble one token and return placeholder
    // so we make forward progress.
    const t = this.advance();
    return { kind: 'unknown', text: t.text };
  }
}

function joinSegments(segs: StringSegment[]): string {
  return segs.map((s) => ('literal' in s ? s.literal : `\${${s.interp}}`)).join('');
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export function parseHcl(input: string): ParseResult {
  try {
    const tokens = lex(input);
    const parser = new Parser(tokens);
    const ast = parser.parseFile();
    return { ok: true, ast };
  } catch (err) {
    if (err instanceof LexError || err instanceof ParseError) {
      return { ok: false, error: err.message, line: err.line, col: err.col };
    }
    return { ok: false, error: (err as Error).message ?? 'Unknown parse error', line: 1, col: 1 };
  }
}
