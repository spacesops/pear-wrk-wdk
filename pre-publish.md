# Pre-publish checklist — `@spacesops/pear-wrk-wdk`

Use this on branch **`repackage`** before publishing to [npmjs.org](https://www.npmjs.com/package/@spacesops/pear-wrk-wdk).

**Context**

| Item | Value |
|------|--------|
| Upstream baseline (starter lockfile) | `github:tetherto/pear-wrk-wdk#v2` → commit `a800d4a0…` |
| Latest on npm today | `@spacesops/pear-wrk-wdk@1.0.0-beta.30` |
| BTC wallet module (Phase 1) | `@spacesops/wdk-wallet-btc@1.0.0-beta.20` |
| Runtime entry | `index.js` → `generated/bundle/wdk-worklet.mobile.bundle.js` + `generated/hrpc/` |

**Target:** npm tarball includes a **btc-enabled** mobile worklet bundle; apps must **not** patch `schema.json` or rebuild via starter `wire-worklet.js`.

---

## 1. Git and branch

- [ ] On branch `repackage`, synced with `origin/repackage`
- [ ] Working tree clean (no accidental `bundle/`, `NOTES.md`, or local experiments committed unless intentional)
- [ ] Remove or `.gitignore` local **`bundle/`** at repo root (use **`generated/bundle/`** only)
- [ ] Commit message documents: Spacesops repackage, btc enabled, bundle version bump

---

## 2. `package.json` — identity and publishing

- [ ] `"name": "@spacesops/pear-wrk-wdk"` (not `@wdk/bare`)
- [ ] **Version** bumped above npm latest (e.g. **`1.0.0-beta.31`** if `1.0.0-beta.30` is already published)
- [ ] `"publishConfig": { "access": "public", "registry": "https://registry.npmjs.org/" }`
- [ ] `"repository"` → `git+https://github.com/spacesops/pear-wrk-wdk.git`
- [ ] Optional: update `"author"` / description for Spacesops maintainership

---

## 3. Dependencies — enable Bitcoin in the bundle

- [ ] Add **`"@spacesops/wdk-wallet-btc": "1.0.0-beta.20"`** (or compatible `^1.0.0-beta.20`) under `dependencies`
- [ ] Keep existing evm/spark pins unless intentionally upgraded
- [ ] Run **`npm install`** and confirm `node_modules/@spacesops/wdk-wallet-btc` resolves from npm
- [ ] Optional **`overrides`** to dedupe `bare-tcp`, `bare-tls`, `bare-buffer`, `bare-performance` across evm + spark + btc (reduces native addon sprawl in downstream apps)

---

## 4. `schema.json` — wallet modules (no app patching)

- [ ] Add **`walletModules.btc`**:

```json
"btc": {
  "modulePath": "@spacesops/wdk-wallet-btc",
  "networks": ["bitcoin"]
}
```

- [ ] Leave **`rgb`** / `@utexo/*` out unless you explicitly want RGB native addons
- [ ] Decide on **`requiredNetworks`**: add `"bitcoin"` only if worklet init should fail when app omits bitcoin config
- [ ] **`preloadModules`**: keep `@buildonspark/spark-frost-bare-addon`; do not add rgb preload unless needed

---

## 5. Generate artifacts (required before publish)

- [ ] **`npm run gen:wallet-modules`**
  - [ ] `generated/wallet-modules.js` contains `require('@spacesops/wdk-wallet-btc')`
  - [ ] `walletManagers['bitcoin'] = …` is present
- [ ] **`npm run gen:hrpc`**
  - [ ] `generated/hrpc/index.js` exists
- [ ] **`npm run gen:mobile-bundle`**
  - [ ] Pin **`bare-pack@1.5.1`** in `devDependencies` (or document tested version)
  - [ ] Output: **`generated/bundle/wdk-worklet.mobile.bundle.js`**
  - [ ] Bundle size roughly **~18 MB+** with btc (vs ~14 MB evm+spark only)
  - [ ] Spot-check bundle for bitcoin / btc module graph (string search or smoke script)

---

## 6. Scripts — consumer install behavior

- [ ] Add **`"prepublishOnly": "npm run gen:mobile-bundle"`** (or full chain: wallet-modules + hrpc + mobile-bundle)
- [ ] **Remove or disable `postinstall`: `gen:mobile-bundle`** on published packages (slow, fragile in CI; tarball should ship prebuilt `generated/`)
- [ ] Keep maintainer scripts: `gen:wallet-modules`, `gen:hrpc`, `gen:mobile-bundle`, `gen:macos-bundle`

---

## 7. Tarball contents (`files` / `.npmignore`)

- [ ] **`index.js`**, **`schema.json`**, **`pack.imports.json`**, **`src/`**, **`types/`**
- [ ] **`generated/wallet-modules.js`**, **`generated/hrpc/`**, **`generated/bundle/wdk-worklet.mobile.bundle.js`**
- [ ] Exclude: `tests/`, `NOTES.md`, root **`bundle/`**, `.github` (if not needed), dev-only configs
- [ ] Run **`npm pack --dry-run`** and confirm:
  - [ ] Lists **`generated/bundle/wdk-worklet.mobile.bundle.js`**
  - [ ] Does **not** ship stray multi‑MB **`bundle/worklet.bundle.mjs`** from local experiments
  - [ ] Package name **`@spacesops/pear-wrk-wdk`** and intended version

---

## 8. Load-time sanity (must pass)

```bash
npm ci
npm run gen:mobile-bundle   # if not already committed
node -e "const m = require('./index.js'); console.log('bundle bytes', m.bundle?.length ?? m.bundle?.byteLength ?? 'ok'); console.log('HRPC', typeof m.HRPC);"
```

- [ ] No `Cannot find module './generated/...'` errors
- [ ] `bundle` and `HRPC` export successfully

---

## 9. Quality gates

- [ ] **`npm run build:types`** passes
- [ ] **`npm run test`** passes (or document known skips)
- [ ] **`npm run lint`** passes (fix Standard/ESLint if it crashes on this repo)
- [ ] Record bundle size and git commit SHA in release notes

---

## 10. Publish and verify

```bash
npm login
npm publish --access public
npm view @spacesops/pear-wrk-wdk version
```

- [ ] Published version matches git tag (e.g. `v1.0.0-beta.31`)
- [ ] From a clean temp dir: **`npm install @spacesops/pear-wrk-wdk@<version>`** and repeat load-time sanity (step 8)

---

## 11. Align `linked:` native names (republish after bare-* drift)

**Problem:** `bare-pack --linked` freezes **`linked:lib<pkg>.<version>.so`** from **pear’s** `node_modules` at pack time. Apps install **core → pear → wallets** and often hoist **newer** `bare-*` than pear’s lock. Then `react-native-bare-kit` link writes `libbare-fs.4.8.0.so` while the bundle asks for `libbare-fs.4.5.2.so` → `ADDON_NOT_FOUND` / `SIGABRT`.

**Fix:** Republish pear with a bundle built from the **same bare-* versions** the app will link (no starter alias script long-term).

### 11.1 Pick the canonical install tree

Use the same pins the app stack will use (example as of core **beta.47**):

| Source | Pin |
|--------|-----|
| `@spacesops/wdk-wallet-btc` | `1.0.0-beta.20` (or bumped btc) |
| `@spacesops/wdk-react-native-core` | documents `react-native-bare-kit` + nested bare graph |
| Starter `overrides` | e.g. `bare-crypto@1.12.0`, `@spacesops/react-native-bare-kit@0.11.0-beta.45` |

Pear must **`npm ci`** against that graph **before** `gen:mobile-bundle`, not an stale lock from months ago.

### 11.2 Refresh pear lock and pack

```bash
cd pear-wrk-wdk
# optional: add npm "overrides" in pear/package.json to match core/starter bare-* pins
rm -rf node_modules
npm install          # refresh package-lock.json
npm run gen:mobile-bundle   # also writes generated/pear-linked-addons.json
```

- [ ] **`generated/pear-linked-addons.json`** lists every `linked:` name (22 for current evm+spark+btc).
- [ ] Spot-check: `libbare-crypto.1.12.0.so` still present if apps pin `bare-crypto@1.12.0`.
- [ ] If the JS graph needs **two** `bare-tls` majors, bundle may list **`libbare-tls.2.1.4.so`** and **`libbare-tls.3.1.x.so`** — both must exist after downstream link (do not override away one copy).

### 11.3 Verify against a consumer (before `npm publish`)

In **wdk-starter-react-native-develop** (or clean temp dir):

```bash
npm install @spacesops/pear-wrk-wdk@<local-or-file>
# or npm pack + npm i ../pear-wrk-wdk/spacesops-pear-wrk-wdk-*.tgz
npm ci   # full starter tree with core + bare-kit
node node_modules/@spacesops/react-native-bare-kit/android/link.mjs
rg -o 'linked:lib[^"'\''\\]+' node_modules/@spacesops/pear-wrk-wdk/generated/bundle/wdk-worklet.mobile.bundle.js | sed 's/^linked://' | sort -u > /tmp/pear-linked.txt
ls node_modules/@spacesops/react-native-bare-kit/android/src/main/addons/arm64-v8a/*.so | xargs -n1 basename | sort -u > /tmp/link-out.txt
comm -23 /tmp/pear-linked.txt /tmp/link-out.txt   # must be empty (no missing names)
```

If `comm` prints names, fix pear **overrides** / wallet deps and **`gen:mobile-bundle`** again — do not rely on app-side alias copies.

### 11.4 Version and publish

- [ ] Bump pear **patch beta** (e.g. **`1.1.1-beta.41`**).
- [ ] Commit **`package-lock.json`**, **`generated/bundle/wdk-worklet.mobile.bundle.js`**, **`generated/pear-linked-addons.json`**.
- [ ] **`npm publish --access public`**
- [ ] Pin new pear in **`@spacesops/wdk-react-native-core`**, publish core, then bump starter.
- [ ] When starter **`verify-pear-addons`** passes **without** `alias-pear-linked-addons.mjs`, remove or narrow starter overrides and delete the alias script (sunset).

---

## 12. Downstream (after pear publish)

- [ ] Pin **`@spacesops/pear-wrk-wdk@<version>`** in `@spacesops/wdk-react-native-core` (`repackage` branch)
- [ ] Starter: remove `wire-worklet.js` postinstall once core ships btc-inclusive pear
- [ ] App config: `bitcoin` in `get-chains-config.ts` / token lists aligned with `networks: ["bitcoin"]`

---

## Quick status (fill in before publish)

| Check | Done? | Notes |
|-------|-------|--------|
| `@spacesops/wdk-wallet-btc` in dependencies | yes | 1.0.0-beta.20 |
| `walletModules.btc` in schema | yes | |
| `generated/bundle/wdk-worklet.mobile.bundle.js` | yes | ~18 MB |
| `walletManagers['bitcoin']` in generated modules | yes | |
| Version > `1.0.0-beta.30` on npm | yes | **1.1.1-beta.40 published** |
| `npm pack --dry-run` looks correct | yes | |
| `node -e "require('./index.js')"` OK | yes | |

**Phase 2 publish complete.** Downstream: wire `@spacesops/pear-wrk-wdk@1.1.1-beta.40` in `wdk-react-native-core` (see starter repo `docs/phase-2-pear-integration.md`).

---

## References

- Spacesops BTC wallet: `@spacesops/wdk-wallet-btc@1.0.0-beta.20`
- Starter today (legacy): `wdk-react-native-core` → `pear-wrk-wdk#v2` @ `a800d4a0…`, then starter **`wire-worklet.js`** strips btc — **replace with this package, do not patch in app**
