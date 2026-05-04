# skillcrate 🎁

`skillcrate` is a local-first package format and CLI for moving reusable agent instruction bundles between ecosystems. It treats a skill folder as a small, auditable crate: metadata, instructions, checksums, and registry output with no hidden network behavior.

It is inspired by the broader public "skills" ecosystem, including Vincent Koc's `skills` project, but this repository is an original implementation and format. Attribution is preserved in docs and metadata; code and fixtures are not copied.

## Why this exists

Agent teams keep rediscovering the same prompts, safety boundaries, review checklists, and workflow recipes. `skillcrate` makes those bundles portable without turning them into a hosted platform.

## Install

```bash
npm install
npm run build
node dist/cli.js --help
```

## Quickstart

```bash
skillcrate inspect examples/fixtures/hello-skill
skillcrate pack examples/fixtures/hello-skill .tmp/hello.skillcrate.json
skillcrate unpack .tmp/hello.skillcrate.json .tmp/unpacked
skillcrate index examples/fixtures .tmp/registry.json
skillcrate check examples/fixtures/hello-skill --target claude-code
```

During development, use `node dist/cli.js ...` after `npm run build`.

## Skill folder format

A skill folder contains:

- `skillcrate.json` — metadata: name, version, description, targets, entry file, attribution, safety notes.
- `SKILL.md` — human-readable agent instructions.
- Optional supporting files.

Packed crates are JSON documents with schema version `skillcrate/v1`, file contents, byte counts, and SHA-256 checksums.

## CLI

- `inspect <skill-dir>`: print normalized metadata.
- `pack <skill-dir> <out.skillcrate.json>`: create a portable crate.
- `unpack <crate-file> <out-dir>`: verify checksums and restore files.
- `index <registry-root> <out.json>`: generate a registry index from fixture folders.
- `check <skill-dir> --target <target>`: run compatibility checks for `generic`, `claude-code`, or `openai-agents`.

## Safety notes

- Local-first by design: no telemetry, publishing, or external API calls.
- Unpack rejects path traversal and absolute archive paths.
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

## Status

MVP: metadata parsing, pack/unpack, registry export, compatibility checks, fixtures, tests, and CLI smoke.
