#!/usr/bin/env node
/**
 * Garde-fou #1 : vérifie qu'aucun fichier src ne dépasse 300 lignes.
 * Commande : npm run check:sizes
 * Règle : 300 lignes max, cible 150-200.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', 'src');
const LIMIT = 300;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.name.match(/\.(ts|tsx)$/) && !entry.name.includes('.test.')) {
      out.push(full);
    }
  }
  return out;
}

const violations = walk(SRC)
  .map(f => ({ rel: 'src/' + relative(SRC, f), lines: readFileSync(f, 'utf8').split('\n').length }))
  .filter(f => f.lines > LIMIT)
  .sort((a, b) => b.lines - a.lines);

if (violations.length === 0) {
  console.log('✅  Tous les fichiers src sont sous 300 lignes. Architecture saine.');
  process.exit(0);
} else {
  console.log(`\n🚨  ${violations.length} fichier(s) dépassent ${LIMIT} lignes :\n`);
  for (const { rel, lines } of violations) {
    const icon = lines > 600 ? '🔴' : lines > 400 ? '🟠' : '🟡';
    console.log(`  ${icon}  ${String(lines).padStart(5)} lignes  →  ${rel}`);
  }
  console.log('\n  → Règle : découper AVANT d\'ajouter des features.\n');
  process.exit(1);
}
