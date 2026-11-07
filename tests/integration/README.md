# Isolated PostgreSQL regression checks

Run `npm install --ignore-scripts` inside this directory, then `npm test`. Install the root dependencies first. Uses PGlite entirely in memory, synthetic users and records, and never reads a production connection string.

Covers additive migration, empty/zero amounts, per-item template copying, duplicate template/history loads, credit-card day 10 and persistence, request idempotency, stale edit conflict, category ownership, durable rate limiting and setup field preservation.

The MonthSync check uses jsdom and an in-memory bundle to verify late GET protection, serialized PUTs, failed-write preservation, visible retry and cleanup. It does not measure layout or use a browser.
