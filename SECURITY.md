# Security Policy

## Reporting

Please report security issues privately through GitHub security advisories if enabled, or by opening a minimal issue that asks for maintainer contact without exploit details.

## Scope

Security-sensitive behavior includes:

- path traversal during unpack;
- checksum verification bypasses;
- hidden network calls;
- credential or secret exposure;
- unsafe generated registry content.

## Design stance

`skillcrate` is local-first. The CLI should not publish, phone home, read credentials, or install into external agent directories unless a future command makes that behavior explicit and opt-in.
