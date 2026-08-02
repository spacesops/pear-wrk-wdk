#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('url')

const root = path.join(__dirname, '..')
const outPath = path.join(root, 'pack.imports.resolved.json')

function shim (relativePath) {
  return pathToFileURL(path.join(root, relativePath)).href
}

const imports = {
  'node:crypto': 'bare-crypto',
  http: 'bare-http1',
  http2: 'bare-http1',
  bufferutil: shim('shims/bufferutil/index.js'),
  'utf-8-validate': shim('shims/utf-8-validate/index.js'),
  'ledger-bitcoin': shim('shims/ledger-bitcoin/index.js'),
  '@ledgerhq/ledger-bitcoin': shim('shims/ledger-bitcoin/index.js'),
  'bare-crypto': 'bare-crypto',
  'bare-tcp': 'bare-tcp',
  'sodium-native': 'sodium-native'
}

fs.writeFileSync(outPath, `${JSON.stringify(imports, null, 2)}\n`)
console.log(`✓ Wrote ${outPath}`)
