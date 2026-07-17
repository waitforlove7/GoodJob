# JobCloud

Interactive recruitment and skill-graph visualization built with React, Vite, and Three.js.

## Project structure

```text
data/        Recruitment datasets used by the application
docs/        Research notes, reviews, and project documents
scripts/     Data collection and maintenance utilities
src/         Application source code and company adapters
tests/       Automated tests and test fixtures
```

## Development

```bash
npm install
npm run dev
```

Create and preview a production build:

```bash
npm run build:data
npm run build
npm run preview
```

`npm run build:data` regenerates the compact role indexes, lazy-loaded job details in `data/processed/`, and the complete merge audit in `docs/role_merge_report.md` after source datasets change.

Run the automated test suite:

```bash
npm test
```

Refresh the ByteDance dataset when needed:

```bash
node scripts/scrape_bytedance_jobs.mjs --max-pages 10
```

The scraper writes its default output to `data/bytedance_jobs.json`.
