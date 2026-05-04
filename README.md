# 🚨 Mission-Critical Incident Management System

> A production-grade, full-stack SRE platform for high-throughput signal ingestion, automated incident lifecycle management, mandatory RCA enforcement, and real-time observability.

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)](https://mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)

---

## Table of Contents

- [Architecture](#architecture)
- [Key Features](#key-features)
- [Data Storage Strategy](#data-storage-strategy)
- [Design Patterns](#design-patterns)
- [Getting Started](#getting-started)
- [Seed Data](#seed-data)
- [API Reference](#api-reference)
- [Incident Lifecycle](#incident-lifecycle)
- [Testing](#testing)
- [Observability](#observability)
- [Troubleshooting](#troubleshooting)
- [Production Deployment Notes](#production-deployment-notes)

---

## Architecture

```
┌─────────────────┐
│  React Dashboard │  ← http://localhost:5173
└────────┬────────┘
         │ HTTP
┌────────▼────────┐        ┌──────────────┐
│   Express API    │───────▶│ Rate Limiter  │
│  :8080           │        └──────┬───────┘
│  /health         │               │
│  /metrics        │        ┌──────▼───────────────┐
└────────┬─────────┘        │ Bounded In-Memory Queue│
         │                  │ (backpressure @ 503)   │
         │                  └──────┬───────────────-─┘
         │                         │ batch drain
         │                  ┌──────▼──────────────────┐
         │                  │  10s Component Debouncer  │
         │                  └──┬──────┬──────┬─────┬───┘
         │                     │      │      │     │
         │              ┌──────┘  ┌───┘  ┌──┘  ┌──┘
         │              ▼         ▼      ▼     ▼
         │          Postgres   Mongo  Redis  Postgres
         │          (source  (raw    (hot   (timeseries
         │           of truth) audit)  cache)  aggregates)
         │
┌────────▼─────────┐
│   Prometheus      │  ← http://localhost:9090
└──────────────────┘
```

---

## Key Features

| Feature | Details |
|---|---|
| **Signal Ingestion** | High-throughput HTTP endpoint with bounded in-memory queue |
| **Backpressure** | Returns `503` when queue is full instead of crashing |
| **Debouncing** | 10-second per-component debounce prevents alert storms |
| **Incident Workflow** | Enforced state machine: `OPEN → INVESTIGATING → RESOLVED → CLOSED` |
| **Mandatory RCA** | Cannot close an incident without a complete Root Cause Analysis |
| **MTTR Tracking** | Automatically calculated from state transition timestamps |
| **Observability** | Prometheus metrics + `/health` endpoint |
| **Rate Limiting** | Configurable per-IP rate limiting on the ingestion endpoint |
| **Retry Logic** | Exponential backoff on all DB persistence operations |

---

## Data Storage Strategy

Three purpose-specific stores, each used for what it does best:

```
MongoDB ──────── Raw signal audit log & payload data (append-only, schema-free)
PostgreSQL ────── Work items, RCA records, state transitions, minute-bucket aggregates
Redis ─────────── Active dashboard state (hot cache, avoids repeated PG queries)
```

This separation ensures the audit trail is preserved in full fidelity (Mongo), business logic stays transactional (Postgres), and the dashboard stays fast (Redis).

---

## Design Patterns

**Strategy Pattern** — `backend/src/patterns/alertStrategies.js`
Routes alerts to the correct channel based on component type and severity. Adding a new strategy requires no changes to the core ingestion path.

**State Pattern** — `backend/src/patterns/workItemState.js`
Enforces the incident state machine and rejects illegal transitions. Attempting to close an incident without a complete RCA raises an explicit `400` error.

---

## Getting Started

**Prerequisites:** Docker & Docker Compose

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/incident-management-system.git
cd incident-management-system

# 2. Configure environment
cp .env.example .env

# 3. Start all services
docker compose --env-file .env up --build
```

| Service | URL |
|---|---|
| React Dashboard | http://localhost:5173 |
| API Health | http://localhost:8080/health |
| Prometheus Metrics | http://localhost:8080/metrics |
| Prometheus UI | http://localhost:9090 |

### Environment Variables

Key variables to configure in `.env`:

| Variable | Default | Description |
|---|---|---|
| `SIGNAL_QUEUE_MAX_SIZE` | `1000` | Max queue depth before `503` backpressure |
| `SIGNAL_BATCH_SIZE` | `50` | Signals processed per drain cycle |
| `SIGNAL_PROCESS_INTERVAL_MS` | `500` | Queue drain interval in milliseconds |
| `DB_RETRY_ATTEMPTS` | `3` | Max retry attempts on DB failure |
| `DB_RETRY_BASE_DELAY_MS` | `200` | Base delay for exponential backoff |
| `VITE_API_BASE_URL` | `http://localhost:8080` | Frontend API base URL |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |

---

## Seed Data

Load sample incidents in a separate terminal after services are up:

```bash
docker compose --env-file .env exec backend npm run seed
```

The seed script ingests `sample-data/failure-events.json` which includes:

- **RDBMS Outage** — 100+ signals from the same component, demonstrating debounce in action
- **MCP Service Failure** — Mid-severity component failure workflow
- **Cache Incident** — Resolved incident with a complete RCA example

---

## API Reference

### Ingest a Signal

```bash
curl -X POST http://localhost:8080/signals \
  -H 'Content-Type: application/json' \
  -d '{
    "componentId":   "RDBMS_PRIMARY_01",
    "componentType": "RDBMS",
    "severity":      "P0",
    "message":       "checkout db timeout",
    "payload":       { "latencyMs": 2200 }
  }'
```

### List All Incidents

```bash
curl http://localhost:8080/incidents
```

### Get a Specific Incident

```bash
curl http://localhost:8080/incidents/<incident-id>
```

### Response Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Signal accepted and queued |
| `400` | Validation error (e.g. missing RCA fields on close) |
| `503` | Queue full — backpressure active |

---

## Incident Lifecycle

Incidents follow a strict one-way state machine. No skipping steps, no closing without a completed RCA.

```
   ┌────────┐     investigate     ┌───────────────┐
   │  OPEN  │ ─────────────────▶  │ INVESTIGATING  │
   └────────┘                     └───────┬───────┘
                                          │ resolve
                                   ┌──────▼──────┐
                                   │  RESOLVED   │
                                   └──────┬──────┘
                                          │ submit RCA
                                          │ then close
                                   ┌──────▼──────┐
                                   │   CLOSED    │
                                   └─────────────┘
```

**To close an incident, the RCA must include all of the following:**

- Incident start and end timestamps
- Failure category
- Fix that was applied
- Prevention steps for the future

Attempting to close without a complete RCA returns:

```json
{ "error": "Cannot close incident without complete RCA" }
```

---

## Testing

```bash
cd backend
npm install
npm test
```

Unit tests cover:

- Mandatory RCA validation — all required fields enforced
- State transition rules — illegal transitions rejected
- Debounce behaviour — duplicate signals collapsed correctly

---

## Observability

### Health Check

```bash
curl http://localhost:8080/health
```

Returns `200 OK` with service status. Degraded state is indicated in the response body when any dependency is unreachable.

### Prometheus Metrics

Scraped automatically at `http://localhost:8080/metrics`. Key metrics exposed:

| Metric | Description |
|---|---|
| `signals_ingested_total` | Total signals received |
| `signals_debounced_total` | Signals collapsed by the debouncer |
| `queue_depth` | Current in-memory queue size |
| `incidents_open` | Active open incidents |
| `incident_mttr_seconds` | Mean time to resolution (histogram) |

Open Prometheus at `http://localhost:9090` to explore and graph metrics.

---

## Troubleshooting

**`503 Backpressure` on signal ingestion**
- Increase `SIGNAL_QUEUE_MAX_SIZE` in `.env`
- Tune `SIGNAL_BATCH_SIZE` and `SIGNAL_PROCESS_INTERVAL_MS` for faster drain cycles
- Check database latency — slow writes stall the drain worker

**`Health degraded` response**
```bash
docker compose ps              # verify all containers are running
docker compose logs backend    # inspect error messages
```
Verify all connection strings in `.env` match the running container ports.

**Frontend cannot reach the API**
- Confirm `VITE_API_BASE_URL` in `.env` points to `http://localhost:8080`
- Confirm `CORS_ORIGIN` matches the frontend URL exactly (no trailing slash)
- Rebuild after any `.env` change: `docker compose up --build`

**Cannot close an incident**
The RCA form requires all fields: incident start time, incident end time, failure category, fix applied, and prevention steps. All are mandatory.

---

## Production Deployment Notes

| Concern | Recommendation |
|---|---|
| **Services** | Run backend and frontend as separate containers behind a load balancer |
| **Databases** | Use managed PostgreSQL, MongoDB Atlas, and Redis (ElastiCache / Upstash) |
| **TLS** | Terminate SSL at the load balancer or reverse proxy (nginx / Caddy) |
| **Secrets** | Store credentials in a vault (AWS Secrets Manager, HashiCorp Vault) — never commit `.env` |
| **Alerting** | Replace the stub alert strategy with a real provider (PagerDuty, OpsGenie) |
| **Scaling** | Horizontally scale the backend; use a shared external queue if running multiple replicas |

---

## License

MIT
