export function isCodeBalanced(code: string): boolean {
  const stack: string[] = [];
  const pairs: Record<string, string> = { '{': '}', '(': ')', '[': ']' };
  const closing = new Set([')', '}', ']']);
  for (const ch of code) {
    if (pairs[ch]) stack.push(pairs[ch]);
    else if (closing.has(ch) && stack.pop() !== ch) return false;
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
    if (code[i] === '{') depth++;
    else if (code[i] === '}') depth--;
    i++;
  }
  return i;
}
