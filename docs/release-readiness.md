# Release readiness

Use this checklist before cutting a release or asking for a release review.

## Local verification

```sh
npm install
npm run check
npm run test
npm run smoke
npm run package:smoke
npm run release:check
```

## Package contents

Run `npm run package:smoke` when available and review the dry-run file list for only the built runtime, README, license, and other intentional release assets.

The tag workflow packs one tarball, verifies that exact file with `npm publish --dry-run`, publishes it to npm with public access and provenance, waits for the exact tagged version to appear on the public registry, installs that registry-resolved version in an isolated directory, and runs its packaged CLI. The GitHub release is created only after those checks pass. The dry-run workflow performs the same isolated install and CLI check against the local tarball without publishing.

If registry verification times out, confirm npm Trusted Publishing is configured for this repository and the `Release` workflow, inspect the publish step, and rerun the tag workflow after the package version is visible. Do not create the GitHub release manually until `npm view skillcrate@<version> version` and an isolated CLI install succeed.

## Notes

- Keep README examples aligned with the fixture-backed smoke command.
- Do not publish until CI is green on the release branch.
- Configure npm Trusted Publishing for this repository's `Release` workflow before tagging; provenance publication uses GitHub Actions OIDC rather than a long-lived npm token.
- Update CHANGELOG.md with user-facing changes before tagging.
