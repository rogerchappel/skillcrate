# skillcrate PRD

## Product

`skillcrate` is a cross-agent skill package format and registry exporter for reusable instruction bundles. It is local-first, deterministic, and easy to inspect in a code review.

## Problem

Agent users accumulate useful prompts and workflow instructions, but those skills are hard to move between Claude Code, OpenAI agent workflows, and generic local agents without losing safety notes or attribution.

## Goals

- Parse skill metadata from local folders.
- Pack and unpack skill folders into auditable crate files.
- Generate a registry index for a folder of skills.
- Run compatibility checks against common agent targets.
- Preserve attribution to inspiration without copying implementation.

## Non-goals

- Hosted registry or publishing service.
- Automatic installation into external agents.
- Telemetry, credential use, or hidden network calls.
- Compatibility with every proprietary skill shape in V1.

## MVP users

- Developers maintaining personal agent instruction libraries.
- OSS maintainers sharing reusable agent workflows.
- Teams that need portable prompts with safety boundaries.

## Acceptance criteria

- Functional TypeScript library and CLI.
- Fixture-backed tests for metadata, packing, registry, and compatibility.
- Real CLI smoke using local fixtures.
- README, safety docs, contribution docs, security policy.
- Public GitHub repository with meaningful atomic commit history.
