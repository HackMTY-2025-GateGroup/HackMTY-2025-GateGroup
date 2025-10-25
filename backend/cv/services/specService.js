import fs from 'node:fs/promises';
import path from 'node:path';

const SPECS_DIR = path.resolve(process.cwd(), 'cv', 'specs');
const cache = new Map();

export async function listSpecs() {
  try {
    const files = await fs.readdir(SPECS_DIR);
    return files.filter(f => f.endsWith('.json')).map(f => path.basename(f, '.json'));
  } catch {
    return [];
  }
}

export async function loadSpec(name = 'default.mx') {
  const base = name.endsWith('.json') ? name : `${name}.json`;
  const file = path.join(SPECS_DIR, base);
  if (cache.has(file)) return cache.get(file);
  const text = await fs.readFile(file, 'utf-8');
  const spec = JSON.parse(text);
  cache.set(file, spec);
  return spec;
}

export async function getClassAlias(spec) {
  // Returns a Map canonical->Set(aliases)
  const out = new Map();
  const aliases = spec?.class_alias || {};
  for (const [canon, arr] of Object.entries(aliases)) {
    out.set(canon, new Set([canon, ...arr]));
  }
  return out;
}
