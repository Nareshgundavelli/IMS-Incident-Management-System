# Mission-Critical Incident Management System (IMS)

This repository implements the uploaded SRE assignment as an end-to-end full-stack application. The source prompt requires high-throughput signal ingestion, debouncing, raw signal storage, transactional incident workflow, mandatory RCA, MTTR calculation, observability, rate limiting, Docker Compose, sample data, and documentation.

> Note: the chat request mentioned ecommerce, but the attached assignment and Notion page are for an Incident Management System. This repository follows the assignment requirements and includes a dashboard UI rather than a shopping cart.

## Architecture

```mermaid
flowchart LR
  UI[React Dashboard] --> API[Express API]
  API --> Rate[Rate Limiter]
  Rate --> Q[Bounded In-Memory Queue]
  Q --> Debounce[10s Component Debouncer]
  Debounce --> PG[(Postgres Source of Truth)]
  Debounce --> MG[(Mongo Raw Signal Data Lake)]
  Debounce --> RD[(Redis Hot Dashboard Cache)]
  Debounce --> Agg[(Postgres Timeseries Aggregates)]
  API --> Metrics[/health and /metrics]
  Prom[Prometheus] --> Metrics
```

## Backpressure handling

Signals are accepted into a bounded in-memory queue controlled by `SIGNAL_QUEUE_MAX_SIZE`. If the queue is full, the ingestion endpoint returns `503` rather than crashing the server. A worker drains the queue in batches using `SIGNAL_BATCH_SIZE` and `SIGNAL_PROCESS_INTERVAL_MS`. Persistence operations use retry with exponential backoff via `DB_RETRY_ATTEMPTS` and `DB_RETRY_BASE_DELAY_MS`.

## Design patterns

- Strategy pattern: `backend/src/patterns/alertStrategies.js` chooses alert routing by component type and severity.
- State pattern: `backend/src/patterns/workItemState.js` enforces `OPEN -> INVESTIGATING -> RESOLVED -> CLOSED` and rejects closing without a complete RCA.

## Data separation

- MongoDB: raw signal audit log and payload data.
- PostgreSQL: source-of-truth work items, RCA, state transitions, and minute buckets.
- Redis: active dashboard state to avoid repeatedly querying PostgreSQL.

## Setup

```bash
cp .env.example .env
docker compose --env-file .env up --build
```

Open:
- Frontend: http://localhost:5173
- Backend health: http://localhost:8080/health
- Metrics: http://localhost:8080/metrics
- Prometheus: http://localhost:9090

## Seed data

In another terminal:

```bash
docker compose --env-file .env exec backend npm run seed
```

The seed script loads `sample-data/failure-events.json`, including an RDBMS outage, MCP failure, and cache incident. The RDBMS sample includes over 100 signals for the same component to demonstrate debouncing.

## API examples

```bash
curl -X POST http://localhost:8080/signals \
  -H 'Content-Type: application/json' \
  -d '{"componentId":"RDBMS_PRIMARY_01","componentType":"RDBMS","severity":"P0","message":"checkout db timeout","payload":{"latencyMs":2200}}'

curl http://localhost:8080/incidents
curl http://localhost:8080/incidents/<incident-id>
```

## RCA and close flow

1. Move incident to `INVESTIGATING`.
2. Move incident to `RESOLVED`.
3. Submit the RCA form.
4. Move incident to `CLOSED`.

Attempting to close without a complete RCA returns `400` with `Cannot close incident without complete RCA`.

## Testing

```bash
cd backend
npm install
npm test
```

The included unit tests cover mandatory RCA validation and state transition checks.

## Troubleshooting

- `503 Backpressure`: increase `SIGNAL_QUEUE_MAX_SIZE`, tune batch size, or inspect database latency.
- `Health degraded`: run `docker compose ps`, inspect container logs, and verify `.env` connection values.
- Frontend cannot reach API: check `VITE_API_BASE_URL` and `CORS_ORIGIN`.
- Cannot close incident: ensure RCA has incident start/end, category, fix applied, and prevention steps.

## Deployment notes

For production, run backend and frontend as separate containers behind a load balancer, use managed PostgreSQL/MongoDB/Redis, configure TLS, add a real alert provider, and keep secrets in a vault instead of a checked-in `.env` file.
