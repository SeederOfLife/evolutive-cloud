import { describe, it, expect } from 'vitest';
import { isCodeBalanced, findAppFunctionEnd } from './sandboxUtils';

describe('isCodeBalanced', () => {
  it('code équilibré retourne true', () => {
    expect(isCodeBalanced('function App() { return null; }')).toBe(true);
  });

  it('chaîne vide retourne true', () => {
    expect(isCodeBalanced('')).toBe(true);
  });

  it('accolade ouverte non fermée → false (code tronqué)', () => {
    expect(isCodeBalanced('function App() {')).toBe(false);
  });

  it('parenthèse ouverte non fermée → false', () => {
    expect(isCodeBalanced('return (')).toBe(false);
  });

  it('crochets mélangés → false', () => {
    expect(isCodeBalanced('const x = [}')).toBe(false);
  });

  it('code imbriqué équilibré → true', () => {
    const code = 'function App() { const x = { a: [1, 2], b: { c: 3 } }; return null; }';
    expect(isCodeBalanced(code)).toBe(true);
  });
});

describe('findAppFunctionEnd', () => {
  it('trouve la fin d\'une arrow function App avec code après', () => {
    const code = 'const App = () => { return null; }\nconst x = 1;';
    const pos = findAppFunctionEnd(code);
    // pos doit pointer après } de App, pas à la fin totale
    expect(pos).toBeLessThan(code.length);
    expect(code.slice(0, pos).trimEnd().endsWith('}')).toBe(true);
  });

  it('trouve la fin d\'une function App déclarée', () => {
    const code = 'function App() { return null; }';
    const pos = findAppFunctionEnd(code);
    expect(pos).toBe(code.length);
  });

  it('retourne code.length si App introuvable', () => {
    const code = 'const x = 1;';
    expect(findAppFunctionEnd(code)).toBe(code.length);
  });
});
