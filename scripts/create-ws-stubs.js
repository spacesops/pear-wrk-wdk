#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

// Find all ws directories and create stubs for bufferutil and utf-8-validate
const nodeModulesPath = path.join(__dirname, '..', 'node_modules')

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

function createLedgerBitcoinStub () {
  const ledgerBitcoinDir = path.join(nodeModulesPath, 'ledger-bitcoin')
  if (!fs.existsSync(ledgerBitcoinDir)) {
    fs.mkdirSync(ledgerBitcoinDir, { recursive: true })
    fs.writeFileSync(path.join(ledgerBitcoinDir, 'index.js'), 'module.exports = {}\n')
    fs.writeFileSync(
      path.join(ledgerBitcoinDir, 'package.json'),
      JSON.stringify({ name: 'ledger-bitcoin', version: '1.0.0', main: 'index.js' }, null, 2) + '\n'
    )
  }
}

function findWsDirectories (dir, depth = 0) {
  if (depth > 10) return // Prevent infinite recursion
  if (!fs.existsSync(dir)) return

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(dir, entry.name)
      if (entry.name === 'ws') {
        createStub(dir)
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

if (fs.existsSync(nodeModulesPath)) {
  findWsDirectories(nodeModulesPath)
  createLedgerBitcoinStub()
  console.log('Created ws optional dependency stubs')
} else {
  console.warn('node_modules directory not found')
  process.exit(1)
}
