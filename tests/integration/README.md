# Isolated PostgreSQL regression checks

Run `npm install --ignore-scripts` inside this directory, then `npm test`. Install the root dependencies first. Uses PGlite entirely in memory, synthetic users and records, and never reads a production connection string.

Covers additive migration, empty/zero amounts, per-item template copying, duplicate template/history loads, credit-card day 10 and persistence, request idempotency, stale edit conflict, category ownership, durable rate limiting and setup field preservation.
