# skillcrate 🎁

`skillcrate` is a local-first package format and CLI for moving reusable agent instruction bundles between ecosystems. It treats a skill folder as a small, auditable crate: metadata, instructions, checksums, and registry output with no hidden network behavior.

It is inspired by the broader public "skills" ecosystem, including Vincent Koc's `skills` project, but this repository is an original implementation and format. Attribution is preserved in docs and metadata; code and fixtures are not copied.

## Why this exists

Agent teams keep rediscovering the same prompts, safety boundaries, review checklists, and workflow recipes. `skillcrate` makes those bundles portable without turning them into a hosted platform.

## Install

The latest source checkout can be built locally with:

```bash
npm install
npm run build
node dist/src/cli.js --help
```

After a version is published to npm, install the CLI globally with:

```bash
npm install -g skillcrate
skillcrate --help
```

## Quickstart

```bash
node dist/src/cli.js inspect examples/fixtures/hello-skill
node dist/src/cli.js pack examples/fixtures/hello-skill .tmp/hello.skillcrate.json
node dist/src/cli.js verify .tmp/hello.skillcrate.json
node dist/src/cli.js unpack .tmp/hello.skillcrate.json .tmp/unpacked
node dist/src/cli.js index examples/fixtures .tmp/registry.json
node dist/src/cli.js check examples/fixtures/hello-skill --target claude-code
```

## Skill folder format

A skill folder contains:

- `skillcrate.json` — metadata: name, version, description, targets, entry file, attribution, safety notes.
- `SKILL.md` — human-readable agent instructions.
- Optional supporting files.

Packed crates are JSON documents with schema version `skillcrate/v1`, file contents, byte counts, and SHA-256 checksums. UTF-8 files retain the original v1 representation:

```json
{ "path": "SKILL.md", "content": "# Example\n", "bytes": 10, "sha256": "..." }
```

Files that cannot be represented losslessly as UTF-8 use canonical base64 and declare the encoding:

```json
{ "path": "assets/icon.bin", "content": "AP+AUE5HDQo=", "encoding": "base64", "bytes": 8, "sha256": "..." }
```

`bytes` and `sha256` always describe the original decoded file bytes. Readers continue to interpret entries without `encoding` as UTF-8 text. Unknown encodings and malformed base64 are rejected.

## CLI

- `inspect <skill-dir>`: print normalized metadata.
- `pack <skill-dir> <out.skillcrate.json>`: create a portable crate. The output may be inside the skill directory; the exact output file is excluded so repeated packs remain deterministic.
- `verify <crate-file>`: validate metadata, safe paths, byte counts, and SHA-256 digests without unpacking.
- `unpack <crate-file> <out-dir>`: verify checksums and restore files.
- `index <registry-root> <out.json>`: generate a registry index from skill folders containing the canonical `skillcrate.json` metadata marker. Similarly named archives and backups are ignored. The output may be anywhere under the registry root, including inside a skill directory; that exact file is excluded, and unchanged consecutive runs are byte-identical.
- `check <skill-dir> --target <target>`: run compatibility checks for `generic`, `claude-code`, or `openai-agents`.

Only `check` accepts an option; its `--target` value defaults to `generic`. Unknown options,
missing option values, unsupported targets, and surplus arguments print a concise diagnostic
and usage text, then exit with status 2. Command failures and unsuccessful verification or
compatibility results exit with status 1; valid commands and help exit with status 0.

## Safety notes

- Local-first by design: no telemetry, publishing, or external API calls.
- Unpack rejects path traversal, absolute paths, ambiguous destinations, and symlinked destination components.
- Verify checks crates before writing files to disk.
- Checksums are verified before files are written.
- Compatibility reports encourage explicit attribution and safety boundaries.

## Development

```bash
npm install
npm run check
npm test
npm run build
npm run smoke
bash scripts/validate.sh
```

Tagged releases are published with npm provenance. Before GitHub release creation, automation verifies the exact tagged version through the public npm registry, installs it in isolation, and executes the packaged CLI. See `docs/release-readiness.md` for the release gate and recovery steps.

## Status

MVP: metadata parsing, pack/unpack, registry export, compatibility checks, fixtures, tests, and CLI smoke. The source checkout is usable now; the global install command requires a published npm release.


## Release readiness

Use [docs/release-readiness.md](docs/release-readiness.md) before opening release PRs or tagging a release.
