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

## 13. Dependency freshness (worklet bugs that look like app bugs)

**Only the versions `bare-pack` embedded in the bundle run in the worklet.** The same packages installed in the starter's `node_modules` are used for types and never execute, so a bug can be live on device while the starter's copies are fine. Always reproduce against **pear's** `node_modules`, never the starter's.

Two failures on 2026-08-03 were both pear pinning stale transitive deps, and both surfaced as errors that read like native or Android problems:

| Symptom (device) | Actual cause | Fixed by |
|---|---|---|
| Every EVM network: `Address "undefined" is invalid. … Version: viem@2.43.3` | `@wdk-safe-global/relay-kit@4.1.0` declares `predictSafeAddress({ owner })` (singular) while `wdk-wallet-evm-erc-4337` calls it with `{ owners: [owner] }`, so the Safe setup calldata encodes `owners: [undefined]` | relay-kit `4.1.2` renamed the param to `owners`; `@tetherto/wdk-wallet-evm-erc-4337@1.0.0-beta.14` drops the Safe kits entirely for `abstractionkit` |
| `spark`: `MODULE_NOT_FOUND: Cannot find module './wallet-account-spark.js'` | `wdk-wallet-spark@1.0.0-beta.6` `getAccount` uses `await import('./wallet-account-spark.js')`, which fails to resolve inside a packed bundle | `wdk-wallet-spark@1.0.0-beta.11` imports it statically |

The spark error is worth recognising on sight: the file **and** its resolution entry are both in the bundle, and the first listed candidate is the correct URL, so resolution worked and the bundle's `exists()` check is what rejected it. It could not be reproduced with a minimal bundle under bare `1.29.4` or `1.30.3`, so treat "dynamic `import()` in a packed module" as unsupported rather than trying to fix the resolution.

### 13.1 Reproduce in Node from pear's tree (no device, seconds)

```bash
cd pear-wrk-wdk
cat > /tmp/check.mjs <<'EOF'
import bip39 from 'bip39'
import WDK from '@tetherto/wdk'
import Manager from '@tetherto/wdk-wallet-evm-erc-4337'
const seed = new Uint8Array(bip39.mnemonicToSeedSync('test test test test test test test test test test test junk'))
const wdk = new WDK(seed)
wdk.registerWallet('ethereum', Manager, {
  chainId: 1, blockchain: 'ethereum', safeModulesVersion: '0.3.0',
  entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032'
})
const account = await wdk.getAccount('ethereum', 0)
console.log(await account.getAddress())
EOF
cp /tmp/check.mjs . && node check.mjs && rm check.mjs
```

- [ ] Prints an address. `Address "undefined" is invalid` here means the bundle would fail the same way on device.
- [ ] **Address must equal the currently shipped one** — for the reference mnemonic above, `0x97682ff1A980a96D65Ea606b717441E3662c557E`. A different address means existing users' funds move; stop and treat it as a migration, not a bump.
- [ ] `rg -c 'await import\(' node_modules/@tetherto/wdk-wallet-*/src/*.js` returns nothing.

### 13.2 Diff the addon set after `gen:mobile-bundle`

Refreshing `@tetherto` deps pulls a newer `bare-node-runtime`, which adds and removes native addons. Compare against the published manifest before publishing:

```bash
node -e "
const a = require('/path/to/starter/node_modules/@spacesops/pear-wrk-wdk/generated/pear-linked-addons.json').linkedAddons
const b = require('./generated/pear-linked-addons.json').linkedAddons
const A = new Set(a), B = new Set(b)
a.filter(x => !B.has(x)).forEach(x => console.log('-', x))
b.filter(x => !A.has(x)).forEach(x => console.log('+', x))
"
```

- [ ] Every **added** name exists in the starter's tree so bare-kit link can produce it, and passes the on-device `dlopen` sweep (starter `NOTES.md`) — new addon versions are exactly where the runtime ABI mismatches bite.
- [ ] `verify-pear-addons` compares the bundle against **`addons-lock.json`**, not against files on disk, so it can pass while a `.so` is missing. Harmless when the package maps the platform away — `bare-posix` has no Android prebuild and its `exports` resolve `android` to `unsupported.js` — but check any new name against its `prebuilds/` directory.

---

## 14. Every linked addon must be an exact direct dependency

`bare-pack --linked` bakes **exact** versions into the bundle (`linked:libbare-tcp.2.5.3.so`), but consumers install *later* and resolve the **caret ranges** of whatever transitively depends on those addons. Any addon left unpinned therefore drifts the moment a new version is published, and the bundle asks for a `.so` that the consumer's tree never produces.

So: for every name in `generated/pear-linked-addons.json`, `dependencies` carries that package at that **exact** version. Overrides alone are not enough — npm `overrides` are honoured only in the root manifest, so they pin pear's own pack tree and are **invisible to consumers**. Keep both: `dependencies` fix the consumer's edge, `overrides` stop a nested copy diverging at pack time.

This is what lets the starter drop its `bare-crypto` override, and it makes `verify-pear-addons` meaningful rather than tautological.

Regenerate the pins from the bundle after any `gen:mobile-bundle` that changes the addon set:

```bash
node -e "
const fs=require('fs'), p=JSON.parse(fs.readFileSync('package.json','utf8'));
const pins={};
for (const n of require('./generated/pear-linked-addons.json').linkedAddons) {
  const m=n.match(/^lib(.+)\.(\d+\.\d+\.\d+)\.so\$/); if(!m) throw new Error('unparsed: '+n);
  let k=m[1].replace(/__/g,'/'); if(!/^(bare-|sodium-native)/.test(k)) k='@'+k;
  pins[k]=m[2];
}
const srt=o=>Object.fromEntries(Object.entries(o).sort(([a],[b])=>a.localeCompare(b)));
p.dependencies=srt({...p.dependencies, ...pins});
p.overrides=srt({...p.overrides, ...pins});
fs.writeFileSync('package.json', JSON.stringify(p,null,2)+'\n');
console.log('pinned '+Object.keys(pins).length);
"
rm -rf node_modules package-lock.json && npm install && npm run gen:mobile-bundle
```

- [ ] Addon set is **unchanged** by the repin (`diff` the old and new `pear-linked-addons.json`). If it changed, the pins disagreed with what actually packs — investigate before publishing.
- [ ] No addon resolves to **two** copies. An exact pin below what a dependent's range prefers is fine *as long as the pin satisfies that range* — npm then dedupes to the pin. It does not, and you get a second nested copy plus a second `.so` in every consumer APK:

```bash
node -e "
const lock=require('./package-lock.json'), pins=require('./package.json').dependencies;
for (const [pkg,ver] of Object.entries(pins)) {
  if (!/^(bare-|sodium-native|@buildonspark)/.test(pkg)) continue;
  const e=Object.entries(lock.packages).filter(([k])=>k.endsWith('node_modules/'+pkg));
  if (e.length!==1 || e[0][0]!=='node_modules/'+pkg || e[0][1].version!==ver)
    console.log('CHECK', pkg, 'want', ver, e.map(([k,v])=>k+'@'+v.version).join(' | '));
}
console.log('done');
"
```

- [ ] Confirm from a **consumer with no overrides** (this is the whole point):

```bash
npm pack && cd $(mktemp -d) && npm init -y >/dev/null
npm i /path/to/spacesops-pear-wrk-wdk-<ver>.tgz
# every linked name must resolve to exactly the bundle's version, one copy each
```

`bare-subprocess` is deliberately **not** pinned as a dependency: it is not linked in the bundle, and the current `5.2.3` override contradicts `bare-node-runtime`'s `^6.0.0`, so declaring it would force a downgrade on consumers and create the duplicate this section exists to prevent. Both versions already get linked into consumer APKs as dead weight; worth cleaning up separately.

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
