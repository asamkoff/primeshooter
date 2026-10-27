# PrimeShooter

## Versioning and deployment

Pushes to `main` are versioned and deployed to GitHub Pages by
`.github/workflows/deploy.yml`. Put one of these markers in a commit message:

- `[patch]` for fixes and small changes
- `[minor]` for backwards-compatible features
- `[major]` for breaking changes

If a push contains multiple commits, the highest bump marker across those
commits wins. If no marker is present, the workflow uses a patch bump. With no
existing tags, the first patch bump is `v0.0.1` (or `v0.1.0` / `v1.0.0` for a
first minor / major bump). Versions are recorded as Git tags. The displayed
version is generated during deployment; the checked-in `version.json` is only a
local development fallback.

Before the first deployment, set **Settings → Pages → Build and deployment →
Source** to **GitHub Actions**. The workflow needs permission to write repository
contents so it can push version tags.
