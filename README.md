# SentinelNet – Privacy-Preserving Threat Intel Sharing

A **minimal but real** system where multiple organizations can submit structured incident reports about **AI-enabled attacks** and see **aggregated, anonymized campaigns** across orgs – without exposing which specific orgs got hit or sharing raw logs.

## Quick Start (Docker)

### Prerequisites

- Docker
- Docker Compose

### Installation & Setup

1. **Install Docker and Docker Compose (if not already installed):**
   ```bash
   ./install-docker.sh
   ```

2. **Start the application:**
   ```bash
   ./docker-start.sh up
   ```

3. **Access the application:**
   - **Frontend:** http://localhost:3165
   - **Backend API:** http://localhost:8000
   - **API Docs:** http://localhost:8000/docs

### Demo Organizations

Pre-seeded demo organizations with API keys:
- `org_alice` (Alice Hospital) - API Key: `alice_key_12345`
- `org_bob` (Bob Energy Corp) - API Key: `bob_key_67890`
- `org_charlie` (Charlie Water Utility) - API Key: `charlie_key_11111`

### Common Commands

```bash
./docker-start.sh up         # Start all services
./docker-start.sh down       # Stop all services
./docker-start.sh logs       # View logs
./docker-start.sh rebuild    # Rebuild Docker images
./docker-start.sh clean      # Remove all containers and volumes
./docker-start.sh ps         # Show running services
./docker-start.sh restart    # Restart services
./docker-start.sh test       # Run tests
```

## Development (Local Setup)

If you prefer to run services locally without Docker:

### Prerequisites

- Python 3.11+ (backend)
- Node.js 18+ (frontend)
- uv (Python package manager) or pip

### Backend Setup

1. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Seed the database:**
   ```bash
   python -m backend.db.seed
   ```

3. **Run the backend server:**
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```

   API will be available at http://localhost:8000
   Interactive docs at http://localhost:8000/docs

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

   Frontend will be available at http://localhost:5173

### Running Tests

**Backend:**
```bash
cd backend
pytest
```

**Frontend:**
```bash
cd frontend
npm test
```

## Usage

### Demo Flow

1. **Select Organization:** Use the dropdown in the UI to simulate different organizations
2. **Submit Incident:** Navigate to "Submit Incident" and fill out the form
3. **View Campaigns:** See aggregated campaigns across all organizations
4. **Check "Am I Alone?":** After submitting an incident, see if others are experiencing similar attacks

### Key Features Demonstrated

#### 1. Privacy-Preserving (K-Anonymity)
- Campaigns with `num_orgs < 2` suppress sector/region information
- No organization identities are exposed
- Only aggregate statistics are shown

#### 2. Clustering
- Incidents are automatically clustered into campaigns based on:
  - Attack vector
  - Time window (±7 days)
  - Region
  - IOCs

#### 3. Query Budget
- Each organization has a daily query budget (default: 100)
- Budget is enforced server-side
- Resets automatically after 24 hours

#### 4. Audit Logging
- All queries and submissions are logged
- Enables future privacy audits

## Architecture

### Backend (FastAPI + SQLAlchemy + SQLite)

- **API Endpoints:**
  - `POST /incidents` – Submit incident (auto-clusters into campaigns)
  - `GET /incidents/{id}` – Get incident (own org only)
  - `GET /campaigns` – List campaigns (with filters)
  - `GET /campaigns/{id}` – Campaign details
  - `GET /campaigns/am-i-alone/{incident_id}` – Check campaign membership

- **Privacy Enforcement:**
  - K-anonymity rules applied in backend services
  - Redaction before JSON response
  - Frontend never reconstructs org identity

- **Authentication:**
  - API key via `Authorization: Bearer <key>` header
  - Keys hashed in database (bcrypt)

### Frontend (React + TypeScript + Vite)

- **Pages:**
  - `/submit` – Incident submission form
  - `/campaigns` – Campaign list with filters
  - `/campaigns/:id` – Campaign detail view
  - `/alone/:id` – "Am I alone?" view

- **State Management:**
  - React Query for server state
  - Context API for current org (demo)

## Docker Compose Services

### Backend Service
- **Image:** Built from `backend/Dockerfile`
- **Port:** 8000 (accessible at http://localhost:8000)
- **Database:** SQLite at `/app/backend/db.sqlite3`
- **Volumes:** Persists data and database between restarts
- **Health Check:** HTTP GET to `/health` endpoint

### Frontend Service
- **Image:** Built from `frontend/Dockerfile`
- **Port:** 3165 (mapped from 3000 internally)
- **Environment:** `VITE_API_BASE_URL=http://localhost:8000`
- **Dependencies:** Waits for backend to be healthy before starting
- **Health Check:** HTTP GET to internal port 3000

Both services run on a `sentinelwatch` bridge network and restart automatically unless stopped.

## Privacy Mechanisms

### K-Anonymity
Campaigns with fewer than 2 organizations suppress sector/region information to prevent org identification.

### Pseudonymous IDs
Organization IDs (e.g., `org_alice`) are never exposed in campaign responses.

### Audit Logging
All data-bearing queries are logged with:
- Organization ID
- Action type
- Filters/parameters
- Result count
- Timestamp

## Future Work

- **TEEs (Trusted Execution Environments):** Ensure even the server operator can't see raw incidents
- **Formal Differential Privacy:** Add noise to counts, maintain privacy budgets
- **Federated Aggregation:** Local instances share only aggregated stats
- **Trust/Reputation System:** Weight reports from new orgs differently
- **Advanced Inference Attack Defenses:** Rate-limiting, query pattern analysis

## Documentation

- `AGENTS.md` – Top-level instructions + dev env
- `docs/PRD.md` – Product requirements
- `blueprints/01-backend-api.md` – API specification
- `blueprints/02-data-model-and-clustering.md` – Data models and clustering logic
- `blueprints/03-frontend-ui.md` – UI specification
- `blueprints/04-privacy-and-governance.md` – Privacy mechanisms

## License

MIT