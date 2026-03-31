<p align="center">
  <img src="https://img.shields.io/badge/TrustAI-Agent%20Swarm-00ff9d?style=for-the-badge&labelColor=000" />
  <img src="https://img.shields.io/badge/Built%20on-Paytm%20MCP-002970?style=for-the-badge&labelColor=000" />
  <img src="https://img.shields.io/badge/FIN--O--HACK-2026-purple?style=for-the-badge&labelColor=000" />
</p>

# TrustAI

**An AI agent swarm that restructures rejected loans into supply-based micro-credit through a Triangular Financing Loop — powered by Paytm's MCP infrastructure.**

Built on [Paytm's Payment MCP Server](https://github.com/paytm/payment-mcp-server) and inspired by [Paytm Prism](https://github.com/paytm/prism) (ranked #2 globally on Spider 2.0).

---

## The Core Idea

Traditional lending is **linear and wasteful**:

```
User → Bank → Rejected → Dead End
```

TrustAI introduces an **Agentic Triangular Financing Loop** that restructures rejected loans into supply-based credit:

```
         ┌─────────────┐
         │  🧑 Borrower  │ Needs supplies/inventory (not cash)
         │  (User)       │
         └──────┬───────┘
                │ ① Loan rejected by risk model
                ▼
         ┌─────────────┐
         │  🏪 Shopkeeper│ Wants more sales, inventory growth
         │  (Merchant)   │
         └──────┬───────┘
                │ ② Funds go directly to merchant (UPI Escrow)
                ▼
         ┌─────────────┐
         │  🏦 Bank/NBFC │ Gets lower risk, structured repayment
         │  (Lender)     │
         └──────┬───────┘
                │ ③ Auto-deduction from borrower's income cycle
                └───────→ Back to Borrower (supplies received)
```

**Instead of rejecting risky borrowers, we restructure their loans through trusted local merchants.** The borrower gets supplies, the shopkeeper gets a sale, and the bank gets a lower-risk, supply-backed loan with auto-repayment.

---

## How It Works

1. **Borrower applies for credit** (e.g., Rs 6,650 for business supplies or inventory)
2. **AI Agent Swarm analyzes in parallel** (<200ms):
   - **Analyst Agent** — GNN scores the Paytm merchant graph (21 nodes) + TCN checks 12-week behavioral stability
   - **Verifier Agent** — Runs 5 fraud checks + verifies item prices against market rates
3. **Instead of binary approve/reject**, the Orchestrator makes a 3-way decision:
   - **Approved** — Direct credit (low risk)
   - **Structured Financing** — Triangular loop via merchant (moderate risk)
   - **Rejected** — Only for fraud/critical risk
4. **Disburser Agent pays the shopkeeper directly** via Paytm MCP (UPI Escrow) — funds never touch the borrower
5. **Auto-repayment** scheduled against the borrower's next income cycle

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    TrustAI Agent Swarm Engine                   │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐       │
│  │  Analyst      │  │  Verifier    │  │  Disburser     │       │
│  │  Agent        │  │  Agent       │  │  Agent         │       │
│  │  GNN (21-node │  │  5-signal    │  │  Paytm MCP     │       │
│  │  merchant     │  │  fraud       │  │  payment       │       │
│  │  graph) + TCN │  │  detection + │  │  execution     │       │
│  │  (12-week     │  │  price       │  │  (UPI Escrow)  │       │
│  │  stability)   │  │  verification│  │                │       │
│  └───────┬───────┘  └───────┬──────┘  └───────┬────────┘       │
│          │                  │                  │                │
│  ┌───────▼──────────────────▼──────────────────▼─────────┐     │
│  │              Swarm Orchestrator                        │     │
│  │         (Prism-style self-organizing)                  │     │
│  │   Autonomous Loan Restructuring (Triangular Loop)     │     │
│  │   SHAP Explainability | WebSocket Streaming           │     │
│  └──────────────────────┬────────────────────────────────┘     │
└─────────────────────────┼──────────────────────────────────────┘
                          │
              ┌───────────▼───────────┐
              │   Paytm MCP Server    │
              │  (Model Context       │
              │   Protocol)           │
              │  UPI Escrow Payments  │
              │  Subscription Mgmt    │
              └───────────────────────┘
```

### Execution Pipeline

```
PLAN → [ ANALYZE ∥ VERIFY ] → VALIDATE → DISBURSE
         (parallel)
```

| Stage | Agent | What it does | Latency |
|-------|-------|-------------|---------|
| **Plan** | Orchestrator | Decomposes credit request into 6 sub-tasks | ~1ms |
| **Analyze** | Analyst | GNN credit mesh (21 nodes, 6 clusters) + TCN temporal stability (12-week) | ~1ms |
| **Verify** | Verifier | Fraud detection (5 signals) + market price verification against current rates | ~1ms |
| **Validate** | Orchestrator | Cross-validates GNN/TCN/Fraud -> composite risk -> 3-way decision (approve / structured / reject) | ~1ms |
| **Disburse** | Disburser | Executes UPI Escrow payment via Paytm MCP to merchant (never to borrower) | ~120ms |

**Total pipeline: < 200ms** (sub-second, matching Paytm's Groq-powered latency requirements)

---

## Impact and Benefits

### Inputs
| Data Source | Description |
|-------------|-------------|
| **User Financial Data** | Loan requests, stated income, basic KYC |
| **Merchant Graph Data** | 21-node Paytm transaction mesh (UPI, Soundbox, QR, POS) |
| **Temporal Behavior Logs** | 12-week income, spending, and savings time-series |
| **Fraud Signals** | Velocity spikes, circular transactions, KYC gaps |

### Direct Benefits
| Benefit | Detail |
|---------|--------|
| **Sub-200ms Underwriting** | Instantaneous credit decisions and restructuring matching Paytm's Groq latency requirements |
| **Proactive Risk Mitigation** | Shifts lending from high-risk cash transfers to secure, supply-backed merchant inventory |
| **Ecosystem Retention** | Retains historically "rejected" users within the Paytm network by mediating needs through trusted shopkeepers |
| **Explainable AI Trust** | SHAP-style reasoning for every approval, rejection, or structural modification |

### Credit Ecosystem Trajectory
| Phase | Outcome |
|-------|---------|
| **Dynamic Graph Updates** | Merchant trust mesh updates with every new Paytm transaction |
| **Live Escrow Tracking** | Real-time fund flow tracking to the merchant via MCP |
| **Predictive Default Modeling** | Anticipating repayment friction before it happens |
| **Reduced NPAs** | Eliminating cash misallocation drastically lowers loan default rates |

### Economic & Strategic Value
- **Untapped Market** — Re-captures the massive "rejected loan" demographic, turning lost leads into active supply-based credit consumers within the Paytm ecosystem
- **Structural De-risking** — Risk is dynamically shifted from high-risk individuals to lower-risk operational SMBs, maximizing lending ROI and safety
- **Commercial Model** — B2B2C Lending Ecosystem: merchant transaction fees, increased Paytm POS/Soundbox usage, scaled SMB loan interest
- **Future Expansion** — From retail supplies to universal financing across verticals (agriculture, services, gig economy) with smart-contract repayments based on live merchant ledger data

---

## Features

| # | Feature | Status |
|---|---------|--------|
| 1 | **Prism-style Agent Swarm** — Self-organizing agents with shared blackboard state | Done |
| 2 | **Triangular Financing Loop** — Autonomous loan restructuring through merchant escrow | Done |
| 3 | **Paytm MCP Integration** — AI agents disburse via Paytm's Payment MCP Server | Done |
| 4 | **GNN Merchant Graph** — 21-node GCN on Paytm payment channels (UPI, QR, Soundbox, POS) | Done |
| 5 | **TCN Temporal Stability** — Causal dilated convolutions on 12-week financial series | Done |
| 6 | **Multi-Signal Fraud Detection** — 5 independent fraud checks with severity levels | Done |
| 7 | **SHAP Explainability** — Feature contribution analysis for every credit decision | Done |
| 8 | **WebSocket Live Streaming** — Real-time agent log streaming during execution | Done |
| 9 | **Hindi Voice Input** — Web Speech API for Hindi commands (matching Paytm Soundbox) | Done |
| 10 | **Multi-Merchant Profiles** — 4 demo profiles: approved, structured, rejected, fraud | Done |
| 11 | **Fraud Alert System** — Visual red-flash alerts for critical fraud detection | Done |
| 12 | **Benchmark Endpoint** — p50/p95/p99 latency measurement over N runs | Done |
| 13 | **Graph Topology API** — Live 21-node merchant graph wired to D3 visualization | Done |
| 14 | **Hindi/English i18n** — Full interface translation matching Paytm's multilingual vision | Done |
| 15 | **Real-time Swarm Visualizer** — Pipeline stage animation with live log terminal | Done |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Agent Engine** | Custom Prism-style swarm (Python, asyncio, parallel execution) |
| **Payments** | Paytm MCP Server (Model Context Protocol, UPI Escrow) |
| **ML — Graph** | 3-layer GCN on 21-node Paytm merchant transaction graph |
| **ML — Temporal** | TCN with causal dilated convolutions (12-week series) |
| **ML — Explainability** | SHAP-style feature attribution (10 features) |
| **Backend** | FastAPI, WebSocket, uvicorn |
| **Frontend** | React 19, Vite, Tailwind CSS, Framer Motion |
| **Visualization** | D3.js (graph), Recharts (charts), Three.js |
| **Voice** | Web Speech API (Hindi/English) |
| **Streaming** | WebSocket (real-time agent log streaming) |

---

## Paytm MCP Integration

TrustAI uses Paytm's [Payment MCP Server](https://github.com/paytm/payment-mcp-server) to enable AI agents to interact with payment APIs through structured tool calls:

| MCP Tool | Usage in TrustAI |
|----------|------------------|
| `paytm_initiate_transaction` | Disburser agent pays merchants directly (UPI escrow) |
| `paytm_transaction_status` | Real-time transaction tracking |
| `paytm_create_subscription` | Auto-deduction schedules for loan repayment |
| `paytm_check_balance` | Pre-disbursement balance verification |

The Disburser agent **never transfers funds to the borrower** — payments go directly to the merchant via UPI escrow, preventing cash misuse.

---

## ML Models

### Merchant GNN (Graph Neural Network)

A 3-layer GCN operating on a **21-node Paytm merchant transaction graph** with nodes representing:

- **Revenue channels**: UPI P2M, QR Dynamic/Static, Soundbox, POS, Online PG
- **Customer segments**: Regular, New, High-Value, Seasonal
- **Financial health**: Settlements, Refunds, Chargebacks, Cashflow
- **Credit signals**: Postpaid usage, Loan history, Credit line utilization
- **Business indicators**: Inventory turnover, Supplier payments, Operating costs

### TCN (Temporal Convolutional Network)

Causal dilated convolutions analyzing **12-week financial time-series** (income, spending, savings) to predict behavioral stability and repayment reliability.

### Fraud Detection (5-signal)

1. Circular transaction detection (P2P symmetry)
2. Transaction velocity spike detection
3. New account risk scoring
4. Loan-to-income ratio check
5. Merchant KYC verification

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `WS` | `/swarm/ws` | WebSocket — real-time agent log streaming |
| `POST` | `/swarm/run` | Full swarm pipeline (analyze + verify + disburse) |
| `POST` | `/swarm/analyze` | Credit analysis with SHAP feature importance |
| `GET` | `/swarm/health` | System health + model status |
| `GET` | `/swarm/profiles` | List available merchant demo profiles |
| `GET` | `/swarm/profiles/{id}` | Full profile data for a merchant |
| `GET` | `/swarm/benchmark` | p50/p95/p99 latency benchmark |
| `GET` | `/graph/topology` | 21-node merchant graph for D3 visualization |
| `POST` | `/mcp/transaction` | Direct Paytm MCP payment |
| `GET` | `/mcp/status/{id}` | Transaction status check |
| `GET` | `/mcp/log` | All MCP tool calls in session |

---

## Quick Start

### Backend

```bash
cd backend_agents
pip install -r requirements.txt
python main.py
# -> http://localhost:8000
# -> http://localhost:8000/docs (Swagger UI)
```

### Frontend

```bash
npm install
npm run dev
# -> http://localhost:5173
```

### Train Models (optional)

```bash
cd backend_agents
python -m models.merchant_gnn   # Train merchant GNN
python -m models.tcn             # Train TCN stability model
```

---

## Why This Architecture?

| Paytm's Direction | TrustAI's Implementation |
|-------------------|-------------------------|
| Prism multi-agent swarm (#2 on Spider 2.0) | Self-organizing agent swarm with parallel execution |
| Payment MCP Server (open-source) | AI agents disburse via MCP tool calls (UPI Escrow) |
| AI Soundbox (11 languages) | Hindi voice input + Hindi/English UI toggle |
| Groq partnership (sub-second AI) | Full pipeline executes in < 200ms |
| Postpaid 2.0 (credit on UPI) | Triangular financing loop with supply-based credit |
| Merchant-first strategy | 21-node transaction graph built on Paytm payment channels |
| Lending expansion (rural India and urban SMBs) | Restructures rejected loans through local shopkeepers |

---

## Project Structure

```
TrustAI/
├── backend_agents/
│   ├── swarm/
│   │   ├── engine.py          # Swarm orchestrator (Prism-inspired)
│   │   └── agents.py          # Analyst, Verifier, Disburser agents
│   ├── mcp/
│   │   └── paytm_client.py    # Paytm MCP client (payment APIs)
│   ├── models/
│   │   ├── merchant_gnn.py    # 3-layer GCN on merchant graph
│   │   └── tcn.py             # Temporal convolutional network
│   ├── api.py                 # FastAPI + WebSocket endpoints
│   └── main.py                # Entry point
├── src/
│   ├── App.jsx                # Main app with routing + i18n
│   ├── lib/
│   │   └── api.js             # API base URL config
│   └── components/
│       ├── SwarmVisualizer.jsx # Real-time swarm + voice + profiles
│       ├── DecisionEngine.jsx  # AI underwriting + SHAP dashboard
│       ├── CreditMesh.jsx      # GNN graph visualization (D3)
│       ├── Navbar.jsx          # Navigation with Hindi toggle
│       ├── UserDashboard.jsx   # Borrower interface
│       ├── ShopkeeperDashboard.jsx # Merchant interface
│       └── TCNAgentVisualizer.jsx  # TCN visualization
├── ARCHITECTURE.md             # Detailed architecture & roadmap
└── package.json
```

---

<p align="center">
  <b>TrustAI</b> — Built for FIN-O-HACK 2026 | AI for Small Businesses Track
</p>
