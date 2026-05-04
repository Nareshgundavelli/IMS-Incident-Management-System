# IMS Build Documentation

## Assignment Summary

Build a mission-critical Incident Management System that ingests high-volume operational signals, debounces duplicate component failures, stores raw events as an audit log, persists structured incidents transactionally, presents a live dashboard, enforces an RCA before closure, calculates MTTR, and exposes observability endpoints.

## Delivered Repository

The ZIP contains a single repository with:

- `/backend`: Node.js Express API, ingestion worker, retry handling, rate limiting, health checks, metrics, state validation, alert strategy logic, seed script, and tests.
- `/frontend`: React/Vite incident dashboard with live feed, incident detail, raw signals, status actions, and RCA form.
- `/sample-data`: JSON failure simulation across RDBMS, MCP host, and cache components.
- `/infra/prometheus`: Prometheus scrape configuration.
- `/docs` and `/prompts`: supporting assignment notes.
- `docker-compose.yml` and `.env.example` for end-to-end local execution.

## Architecture

```mermaid
flowchart LR
  UI[React Dashboard] --> API[Express Backend]
  API --> RL[Rate Limiter]
  RL --> Q[Bounded Async Queue]
  Q --> D[Component Debouncer]
  D --> M[(MongoDB Raw Signals)]
  D --> P[(PostgreSQL Work Items/RCA)]
  D --> R[(Redis Dashboard Cache)]
  D --> A[(Timeseries Aggregations)]
  Prometheus --> Metrics[/metrics]
```

## Environment Configuration

All runtime values are loaded from `.env`. Use `.env.example` as the template. No database URLs, ports, rate limits, debounce windows, or API origins are hard-coded in application logic.

Important variables:

- `BACKEND_PORT`, `FRONTEND_PORT`
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `MONGO_URL`, `MONGO_DB`
- `REDIS_URL`
- `INGESTION_RATE_LIMIT_WINDOW_MS`, `INGESTION_RATE_LIMIT_MAX`
- `SIGNAL_QUEUE_MAX_SIZE`, `SIGNAL_BATCH_SIZE`, `SIGNAL_PROCESS_INTERVAL_MS`
- `DEBOUNCE_WINDOW_MS`
- `DB_RETRY_ATTEMPTS`, `DB_RETRY_BASE_DELAY_MS`
- `VITE_API_BASE_URL`, `CORS_ORIGIN`

## Local Setup

1. Copy the environment file.

```bash
cp .env.example .env
```

2. Start all services.

```bash
docker compose --env-file .env up --build
```

3. Validate the backend.

```bash
curl http://localhost:8080/health
```

Expected output includes `status: ok` and dependency checks for PostgreSQL, MongoDB, and Redis.

4. Open the UI.

```text
http://localhost:5173
```

## Seed and Test Data

Load sample incidents with:

```bash
docker compose --env-file .env exec backend npm run seed
```

The sample file simulates:

- RDBMS outage with more than 100 signals for `RDBMS_PRIMARY_01`.
- MCP host failure for `MCP_HOST_07`.
- Cache timeout burst for `CACHE_CLUSTER_01`.

The debouncer creates one work item per component within the configured debounce window while linking all raw signals to that incident in MongoDB.

## End-to-End Workflow

1. Ingest signals through `POST /signals`.
2. The rate limiter protects the API from cascading overload.
3. Accepted signals enter the bounded async queue.
4. Worker batches drain the queue.
5. Debounce logic maps repeated component signals to one work item.
6. Raw payloads are stored in MongoDB.
7. Structured work items, RCA, status transitions, and aggregations are stored in PostgreSQL.
8. Active incident state is cached in Redis.
9. React dashboard polls the incident feed and displays active incidents by severity.
10. Users investigate, resolve, submit RCA, then close.

## RCA Enforcement

The state layer rejects `RESOLVED -> CLOSED` unless a complete RCA exists. Required RCA fields:

- Incident start
- Incident end
- Root cause category
- Fix applied
- Prevention steps

The backend calculates MTTR from the first signal timestamp to the RCA incident end timestamp.

## Observability

Endpoints:

- `GET /health`: dependency health and service status.
- `GET /metrics`: Prometheus-compatible counters and queue depth.

Console logging:

Every `METRICS_LOG_INTERVAL_MS`, the backend prints accepted, processed, rejected, queue depth, and signals/sec.

Prometheus:

The included Prometheus container scrapes the backend metrics endpoint every 10 seconds.

## Error Handling

- Invalid signal payloads return `400` with validation details.
- Rate limit violations return `429`.
- Full queue returns `503 Backpressure: signal queue is full`.
- Invalid state transitions return `400`.
- Closing without RCA returns `400`.
- Missing incidents return `404`.
- Database write failures are retried with exponential backoff.

## Troubleshooting

### Backend health is degraded

Run:

```bash
docker compose ps
docker compose logs backend postgres mongo redis
```

Check `.env` hostnames and ports. Inside Docker, service names must be `postgres`, `mongo`, and `redis`.

### UI is empty

Run the seed command and check `VITE_API_BASE_URL`. The frontend must point at the backend URL.

### Cannot close an incident

Confirm the incident is in `RESOLVED` state and has a complete RCA record.

### Too many 503 responses

Increase `SIGNAL_QUEUE_MAX_SIZE`, tune `SIGNAL_BATCH_SIZE`, check database latency, or scale backend workers behind a queue broker.

### Rate limit responses

Tune `INGESTION_RATE_LIMIT_WINDOW_MS` and `INGESTION_RATE_LIMIT_MAX` according to expected traffic.

## Deployment Guide

1. Build immutable backend and frontend images.
2. Store secrets in a secret manager, not in source control.
3. Use managed PostgreSQL, MongoDB, and Redis.
4. Run database migrations before starting the backend.
5. Configure ingress and TLS.
6. Set `CORS_ORIGIN` to the production frontend origin.
7. Configure horizontal scaling carefully. For multiple backend replicas, move the in-memory queue/debounce to Redis Streams, Kafka, SQS, RabbitMQ, or another shared broker.
8. Configure alert delivery integrations such as PagerDuty, Slack, Opsgenie, or email.
9. Export `/metrics` to Prometheus and configure SLO dashboards and alerts.
10. Back up PostgreSQL and MongoDB regularly.

## Monitoring Recommendations

Track:

- Signal acceptance rate
- Signal processing rate
- Queue depth
- Queue saturation/rejection count
- DB retry count
- Active incident count by severity
- MTTR by component type
- RCA completion time
- API latency and error rate

Suggested alerts:

- Queue depth above 80 percent for 5 minutes
- Health check degraded for 2 minutes
- P0 incident open longer than target SLO
- DB retry attempts exceeding threshold
- Ingestion 5xx rate above threshold

## Testing

Run backend unit tests:

```bash
cd backend
npm install
npm test
```

The included tests verify RCA completeness and state transition behavior.

## Known Limitations and Production Hardening

This implementation is intentionally compact for assignment submission. For production, replace the in-memory queue with a durable broker, add authentication and RBAC, add OpenTelemetry traces, add migration tooling, add synthetic monitoring, use real alert delivery providers, and add load tests for the 10,000 signals/sec target.
