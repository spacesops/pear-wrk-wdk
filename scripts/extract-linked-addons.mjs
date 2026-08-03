#!/usr/bin/env node
/**
 * Write generated/pear-linked-addons.json from the mobile bundle (after gen:mobile-bundle).
 * Downstream bare-kit / starter can use this to verify link output without alias hacks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = path.join(
  root,
  'generated/bundle/wdk-worklet.mobile.bundle.js'
);

if (!fs.existsSync(bundlePath)) {
  console.error('[extract-linked-addons] Missing bundle:', bundlePath);
  console.error('Run: npm run gen:mobile-bundle');
  process.exit(1);
}

const bundle = fs.readFileSync(bundlePath, 'utf8');
const linked = [
  ...new Set(
    [
      ...bundle.matchAll(/linked:lib[^"'\\]+/g),
      ...bundle.matchAll(/linked\\:lib[^"'\\]+/g),
    ].map((m) => m[0].replace(/^linked\\?:/, '').replace(/\\$/, ''))
  ),
].sort();

const outPath = path.join(root, 'generated/pear-linked-addons.json');
const payload = {
  generatedFrom: 'generated/bundle/wdk-worklet.mobile.bundle.js',
  generatedAt: new Date().toISOString(),
  linkedAddons: linked,
};

fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`[extract-linked-addons] Wrote ${linked.length} name(s) → ${outPath}`);
