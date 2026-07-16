# CI / Pages workflow templates

These GitHub Actions workflows are kept here as templates rather than under
`.github/workflows/` because the token used to publish this repo lacks the
`workflow` scope (so it cannot push files into `.github/workflows/`).

To enable them, copy both files into `.github/workflows/` from a machine whose
`gh`/token has the `workflow` scope, then commit and push:

```bash
mkdir -p .github/workflows
cp docs/workflow-templates/ci.yml .github/workflows/
cp docs/workflow-templates/deploy-pages.yml .github/workflows/
git add .github/workflows && git commit -m "Add CI + Pages workflows" && git push
```

- `ci.yml` — typecheck, unit tests, build, and Playwright e2e on every push/PR.
- `deploy-pages.yml` — builds with the repo-name `BASE_PATH` and deploys to GitHub Pages.

Until then, Pages is served from the `gh-pages` branch built locally
(`BASE_PATH=/delivery-challan-assistant/ npm run build`).
