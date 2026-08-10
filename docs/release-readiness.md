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

The tag workflow packs one tarball, verifies that exact file with `npm publish --dry-run`, publishes it to npm with public access and provenance, and only then creates the GitHub release. If npm publication fails, no GitHub release is created. After publication, confirm that `npm install -g skillcrate` installs the tagged CLI; local source-checkout verification continues to use `npm install` and `npm run build`.

## Notes

- Keep README examples aligned with the fixture-backed smoke command.
- Do not publish until CI is green on the release branch.
- Configure npm Trusted Publishing for this repository's `Release` workflow before tagging; provenance publication uses GitHub Actions OIDC rather than a long-lived npm token.
- Update CHANGELOG.md with user-facing changes before tagging.
