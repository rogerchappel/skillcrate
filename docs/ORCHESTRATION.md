# Orchestration

This repository was built as a local-first OSS MVP. Agents working here should keep changes scoped, test fixtures before claiming success, and preserve attribution without copying external source code.

## Work lanes

1. **Format**: metadata, manifest, registry schema.
2. **CLI/library**: inspect, pack, unpack, index, check.
3. **Quality**: tests, smoke, validation script, CI.
4. **Docs**: README, PRD, tasks, safety, contribution guidance.

## Guardrails

- Do not add telemetry or background network calls.
- Do not read secrets or global credentials for skill operations.
- Do not unpack unsafe paths.
- Prefer deterministic fixture-backed behavior.
- Keep generated artifacts out of git unless they are fixtures or docs.

## Release readiness

Run:

```bash
npm run check
npm test
npm run build
npm run smoke
bash scripts/validate.sh
```
