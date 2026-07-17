# Install dependencies
npm install

# Development server (hot reload)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Run tests
npm test

# Scrape fresh job data from Bytedance (optional)
node scrape_bytedance_jobs.mjs --max-pages 10
