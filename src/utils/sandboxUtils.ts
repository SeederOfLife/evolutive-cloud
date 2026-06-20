// Advance index past a quoted string (single or double quote). Caller passes
// the opening-quote index; returns index AFTER the closing quote.
function skipString(code: string, i: number): number {
  const q = code[i];
  i++;
  while (i < code.length) {
    if (code[i] === '\\') { i += 2; continue; }
    if (code[i] === q) return i + 1;
    i++;
  }
  return i;
}

// Advance index past a template literal, handling ${...} expressions.
// Caller passes the opening backtick index; returns index AFTER closing backtick.
function skipTemplate(code: string, i: number): number {
  i++; // skip opening `
  while (i < code.length) {
    if (code[i] === '\\') { i += 2; continue; }
    if (code[i] === '$' && code[i + 1] === '{') {
      i += 2;
      let depth = 1;
      while (i < code.length && depth > 0) {
        const ch = code[i];
        if (ch === '"' || ch === "'") { i = skipString(code, i); continue; }
        if (ch === '`') { i = skipTemplate(code, i); continue; }
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        i++;
      }
      continue;
    }
    if (code[i] === '`') return i + 1;
    i++;
  }
  return i;
}

// Advance index past a line or block comment.
function skipComment(code: string, i: number): number {
  if (code[i + 1] === '/') {
    while (i < code.length && code[i] !== '\n') i++;
    return i;
  }
  // block comment
  i += 2;
  while (i < code.length) {
    if (code[i] === '*' && code[i + 1] === '/') return i + 2;
    i++;
  }
  return i;
}

export function isCodeBalanced(code: string): boolean {
  const stack: string[] = [];
  const pairs: Record<string, string> = { '{': '}', '(': ')', '[': ']' };
  const closing = new Set([')', '}', ']']);
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === '"' || ch === "'") { i = skipString(code, i); continue; }
    if (ch === '`') { i = skipTemplate(code, i); continue; }
    if (ch === '/' && (code[i + 1] === '/' || code[i + 1] === '*')) { i = skipComment(code, i); continue; }
    if (pairs[ch]) stack.push(pairs[ch]);
    else if (closing.has(ch) && stack.pop() !== ch) return false;
    i++;
  }
  return stack.length === 0;
}

export function findAppFunctionEnd(code: string): number {
  const appMatch = code.match(/(?:const|function)\s+App\s*[=(]/);
  if (!appMatch || appMatch.index === undefined) return code.length;
  let i = code.indexOf('{', appMatch.index);
  if (i < 0) return code.length;
  let depth = 1;
  i++;
  while (i < code.length && depth > 0) {
    const ch = code[i];
    if (ch === '"' || ch === "'") { i = skipString(code, i); continue; }
    if (ch === '`') { i = skipTemplate(code, i); continue; }
    if (ch === '/' && (code[i + 1] === '/' || code[i + 1] === '*')) { i = skipComment(code, i); continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { i++; break; } }
    i++;
  }
  return i;
}
