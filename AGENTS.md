# AGENTS.md — @spacesops/pear-wrk-wdk

Builds the WDK worklet bundle that runs in the Bare runtime on device. `bare-pack --linked` packs the JS graph into `generated/bundle/wdk-worklet.mobile.bundle.js` and records the native addons it links in `generated/pear-linked-addons.json`.

**Only the versions baked into the bundle ever execute.** The same packages in a consuming app's `node_modules` are used for types and never run, so a bug can be live on device while the app's copies look correct. Always reproduce against **this repo's** `node_modules`.

## Non-obvious invariants

**Every linked addon must be an exact `dependencies` entry.** `bare-pack --linked` writes exact versions into the bundle, but consumers install later and resolve the *caret ranges* of whatever transitively depends on those addons. npm honours `overrides` only in the **root** manifest, so overrides here are invisible to consumers. Any addon left unpinned drifts the moment a new version is published and the bundle asks for a `.so` no consumer tree produces. `pre-publish.md` §14 has a script to regenerate the pins from the bundle.

An exact pin below what a dependent's range prefers is fine **as long as the pin satisfies that range** — npm then dedupes to it. If it does not, consumers get a second nested copy and a second `.so` in every APK.

`bare-subprocess` is deliberately **not** pinned as a dependency: it is not linked in the bundle, and the `5.2.3` override contradicts `bare-node-runtime`'s `^6.0.0`.

**Dynamic `import()` does not resolve inside a packed bundle.** Treat it as unsupported. It fails as `MODULE_NOT_FOUND` that lists the correct file as its first candidate, meaning resolution succeeded and the bundle's `exists()` check rejected it — so it looks like a packaging bug and is not.

**Refreshing `@tetherto` deps changes the native addon set.** Newer `bare-node-runtime` adds and removes addons, so diff `pear-linked-addons.json` against the published one and re-run the on-device `dlopen` sweep afterwards.

**Verify derived addresses are unchanged before publishing.** A wallet stack swap can silently move a Safe address, which moves existing users' funds. `pre-publish.md` §13.1 has a Node script that prints one without a device.

## Release

`prepublishOnly` runs `gen:mobile-bundle`, so the published bundle is regenerated from whatever is installed at publish time — confirm the tarball's pins still match its bundle afterwards. Publish before bumping `wdk-react-native-core`, which pins this package exactly. Never commit pack artifacts (`*.tgz`).
