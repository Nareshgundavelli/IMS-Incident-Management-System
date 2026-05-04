🚀 Mission-Critical Incident Management System (IMS)

A full-stack Incident Management System designed for SRE workflows.
It handles high-volume failure signals, processes them asynchronously, and converts them into structured incidents with lifecycle enforcement, RCA tracking, and observability.

🧠 Overview

This system ingests failure signals from distributed systems, debounces duplicate events, stores raw data for auditing, and maintains structured incident workflows.

It ensures:

Reliable incident tracking
Mandatory Root Cause Analysis (RCA)
MTTR (Mean Time To Resolution) calculation
Real-time observability with Prometheus
🏗️ Architecture
React Dashboard → Express API → Queue → Debouncer
                        ↓
     PostgreSQL (Incidents & RCA)
     MongoDB (Raw Signals)
     Redis (Cache & Debounce)
     Prometheus (Metrics)
⚙️ Key Features
✅ High-Throughput Signal Ingestion
Handles large volumes of failure signals
Uses a bounded in-memory queue for stability
✅ Debouncing
Multiple signals for same component → single incident
Prevents alert flooding
✅ Incident Lifecycle (State Machine)
OPEN → INVESTIGATING → RESOLVED → CLOSED
Enforced transitions
Cannot close without RCA
✅ RCA Enforcement

Each incident must include:

Incident start & end time
Root cause category
Fix applied
Prevention steps
✅ MTTR Calculation
Automatically calculated using incident start & end time
✅ Observability
/metrics endpoint exposed
Prometheus integration
Tracks:
Signals accepted
Signals processed
Throughput rate
✅ Data Separation
System	Purpose
PostgreSQL	Incidents, RCA, workflow
MongoDB	Raw signals (audit log)
Redis	Cache, debounce, rate limiting
🧩 Design Patterns
Strategy Pattern → Alert routing based on severity/component
State Pattern → Enforces incident lifecycle
🚀 Setup Instructions
1. Clone & Setup
cp .env.example .env
docker compose --env-file .env up --build
2. Access Services
Service	URL
Frontend	http://localhost:5173

Backend	http://localhost:8080

Health	http://localhost:8080/health

Metrics	http://localhost:8080/metrics

Prometheus	http://localhost:9090
🌱 Seed Sample Data
docker compose exec backend npm run seed

This will:

Insert sample failure signals
Generate incidents
Demonstrate debouncing
📊 API Examples
Send Signal
curl -X POST http://localhost:8080/signals \
-H "Content-Type: application/json" \
-d '{
  "componentId":"RDBMS_PRIMARY_01",
  "componentType":"RDBMS",
  "severity":"P0",
  "message":"database timeout"
}'
Get Incidents
curl http://localhost:8080/incidents
🔁 Incident Workflow (UI)
Open Dashboard
Select incident
Change status:
OPEN → INVESTIGATING
INVESTIGATING → RESOLVED
Add RCA
Close incident

🚨 Closing without RCA → Rejected

🧪 Testing
cd backend
npm install
npm test
⚠️ Troubleshooting
Queue full (503 error)
Increase SIGNAL_QUEUE_MAX_SIZE
Metrics showing 0
Run seed again
Prometheus metrics reset on restart
MongoDB empty
Ensure worker processed queue
Increase processing interval if needed
Cannot close incident
Ensure RCA fields are filled
🛠️ Deployment Notes

For production:

Use managed PostgreSQL, MongoDB, Redis
Add authentication & TLS
Use load balancer
Store secrets securely (Vault / env manager)
