#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const packageRoot = path.join(__dirname, '..')

/**
 * When pear-wrk-wdk is installed as a dependency, npm often hoists deps to a
 * parent node_modules, so ./node_modules may not exist here. Walk up to find
 * every node_modules directory that participates in resolution.
 */
function collectNodeModulesDirs (startDir, maxHops = 20) {
  const dirs = []
  let dir = path.resolve(startDir)
  for (let i = 0; i < maxHops; i++) {
    const nm = path.join(dir, 'node_modules')
    if (fs.existsSync(nm) && fs.statSync(nm).isDirectory()) {
      dirs.push(nm)
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return dirs
}

function createStub (dir) {
  const bufferutilDir = path.join(dir, 'bufferutil')
  const utf8ValidateDir = path.join(dir, 'utf-8-validate')

  // Create bufferutil stub
  if (!fs.existsSync(bufferutilDir)) {
    fs.mkdirSync(bufferutilDir, { recursive: true })
    fs.writeFileSync(path.join(bufferutilDir, 'index.js'), 'module.exports = {}\n')
    fs.writeFileSync(
      path.join(bufferutilDir, 'package.json'),
      JSON.stringify({ name: 'bufferutil', version: '1.0.0', main: 'index.js' }, null, 2) + '\n'
    )
  }

  // Create utf-8-validate stub
  if (!fs.existsSync(utf8ValidateDir)) {
    fs.mkdirSync(utf8ValidateDir, { recursive: true })
    fs.writeFileSync(path.join(utf8ValidateDir, 'index.js'), 'module.exports = {}\n')
    fs.writeFileSync(
      path.join(utf8ValidateDir, 'package.json'),
      JSON.stringify({ name: 'utf-8-validate', version: '1.0.0', main: 'index.js' }, null, 2) + '\n'
    )
  }
}

function createLedgerBitcoinStub (nodeModulesRoot) {
  const ledgerBitcoinDir = path.join(nodeModulesRoot, 'ledger-bitcoin')
  if (!fs.existsSync(ledgerBitcoinDir)) {
    fs.mkdirSync(ledgerBitcoinDir, { recursive: true })
    fs.writeFileSync(path.join(ledgerBitcoinDir, 'index.js'), 'module.exports = {}\n')
    fs.writeFileSync(
      path.join(ledgerBitcoinDir, 'package.json'),
      JSON.stringify({ name: 'ledger-bitcoin', version: '1.0.0', main: 'index.js' }, null, 2) + '\n'
    )
  }
}

/**
 * Packages whose `ws` runs in Node at dev time (Metro bundler, RN dev tooling,
 * Expo CLI). These instances need either a real `bufferutil` (with `unmask`) or
 * none at all so they fall back to the pure-JS implementation. An empty stub
 * anywhere their resolver can reach makes `bu.unmask` undefined and crashes the
 * dev server the moment a WebSocket frame >= 32 bytes arrives.
 */
const TOOLCHAIN_PACKAGES = new Set([
  'metro',
  'react-native',
  '@react-native',
  'react-devtools-core',
  'expo',
  '@expo',
  'dev-middleware'
])

/**
 * Do not stub optional deps that participate in a Node-runtime toolchain's `ws`
 * resolution. Two cases are skipped:
 *   1. The `ws` lives inside a known dev toolchain package tree (Metro, RN,
 *      Expo, dev-middleware, react-devtools-core). An empty stub written there
 *      is reached by Node's resolver walking up from that `ws` and shadows the
 *      real bufferutil.
 *   2. The `ws` lives directly in the consuming app's root `node_modules`
 *      (detected by sibling `expo` / `react-native` / `metro` packages), whose
 *      stub is reached by every nested toolchain `ws` walking up to the root.
 */
function shouldSkipStubForWsParent (wsParentDir) {
  const n = path.normalize(wsParentDir)
  const parts = n.split(path.sep)
  for (const part of parts) {
    if (TOOLCHAIN_PACKAGES.has(part)) return true
  }

  if (path.basename(n) === 'node_modules') {
    for (const pkg of ['expo', 'react-native', 'metro']) {
      if (fs.existsSync(path.join(n, pkg))) return true
    }
  }
  return false
}

function findWsDirectories (dir, depth = 0) {
  if (depth > 10) return // Prevent infinite recursion
  if (!fs.existsSync(dir)) return

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(dir, entry.name)
      if (entry.name === 'ws') {
        if (!shouldSkipStubForWsParent(dir)) {
          createStub(dir)
        }
      } else if (entry.name !== '.bin' && !entry.name.startsWith('@')) {
        findWsDirectories(fullPath, depth + 1)
      } else if (entry.name.startsWith('@')) {
        // Handle scoped packages
        const scopedEntries = fs.readdirSync(fullPath, { withFileTypes: true })
        for (const scopedEntry of scopedEntries) {
          if (scopedEntry.isDirectory()) {
            findWsDirectories(path.join(fullPath, scopedEntry.name), depth + 1)
          }
        }
      }
    }
  }
}

const nodeModulesDirs = collectNodeModulesDirs(packageRoot)

if (nodeModulesDirs.length === 0) {
  console.warn('node_modules directory not found (no hoisted or local node_modules in parent path)')
  process.exit(1)
}

for (const nm of nodeModulesDirs) {
  findWsDirectories(nm)
  createLedgerBitcoinStub(nm)
}
console.log('Created ws optional dependency stubs')
