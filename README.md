<p align="center">
  <img src="https://img.shields.io/badge/TrustAI-Agent%20Swarm-00ff9d?style=for-the-badge&labelColor=000" />
  <img src="https://img.shields.io/badge/Built%20on-Paytm%20MCP-002970?style=for-the-badge&labelColor=000" />
  <img src="https://img.shields.io/badge/FIN--O--HACK-2026-purple?style=for-the-badge&labelColor=000" />
</p>

# TrustAI

**AI agent swarm that turns merchant transaction patterns into trust scores — enabling instant credit decisions through Paytm's payment infrastructure.**

Built on [Paytm's Payment MCP Server](https://github.com/paytm/payment-mcp-server) and inspired by [Paytm Prism](https://github.com/paytm/prism) (ranked #2 globally on Spider 2.0).

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                 TrustAI Agent Swarm                   │
│                                                       │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │
│  │  Analyst   │  │  Verifier  │  │  Disburser   │   │
│  │  Agent     │  │  Agent     │  │  Agent       │   │
│  │ (GNN+TCN)  │  │ (Fraud)    │  │ (Payments)   │   │
│  └─────┬──────┘  └─────┬──────┘  └──────┬───────┘   │
│        │               │                │            │
│  ┌─────▼───────────────▼────────────────▼────────┐   │
│  │            Swarm Orchestrator                  │   │
│  │       (Prism-style self-organizing)            │   │
│  └────────────────────┬──────────────────────────┘   │
└───────────────────────┼──────────────────────────────┘
                        │
            ┌───────────▼───────────┐
            │   Paytm MCP Server    │
            │  (Payment APIs via    │
            │   Model Context       │
            │   Protocol)           │
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
| **Verify** | Verifier | Fraud detection (5 signals) + market price verification | ~1ms |
| **Validate** | Orchestrator | Cross-validates GNN/TCN/Fraud → composite risk → decision | ~1ms |
| **Disburse** | Disburser | Executes payment via Paytm MCP (`paytm_initiate_transaction`) | ~120ms |

**Total pipeline: < 200ms** (sub-second, matching Paytm's Groq-powered latency requirements)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Agent Engine** | Custom Prism-style swarm (Python, asyncio) |
| **Payments** | Paytm MCP Server (Model Context Protocol) |
| **ML — Graph** | 3-layer GCN on Paytm merchant transaction graph |
| **ML — Temporal** | TCN with causal dilated convolutions |
| **Backend** | FastAPI, uvicorn |
| **Frontend** | React 19, Vite, Tailwind CSS, Framer Motion |
| **Visualization** | Recharts, Three.js, D3 |

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
| `POST` | `/swarm/run` | Full swarm pipeline (analyze + verify + disburse) |
| `POST` | `/swarm/analyze` | Credit analysis only (GNN + TCN + fraud) |
| `GET` | `/swarm/health` | System health + model status |
| `GET` | `/graph/topology` | Merchant graph for frontend visualization |
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
# → http://localhost:8000
# → http://localhost:8000/docs (Swagger UI)
```

### Frontend

```bash
npm install
npm run dev
# → http://localhost:5173
```

### Train Models (optional)

```bash
cd backend_agents
python -m models.merchant_gnn   # Train merchant GNN
python -m models.tcn             # Train TCN stability model
```

---

## Features

- **Prism-style agent swarm** — Self-organizing agents with shared blackboard state
- **Parallel execution** — Analyst + Verifier run concurrently for sub-second latency
- **Paytm MCP payments** — AI agents execute payments through Paytm's infrastructure
- **Merchant transaction graph** — 21-node GCN aligned with Paytm's payment channels
- **Temporal stability scoring** — TCN analyzes 12-week financial patterns
- **Multi-signal fraud detection** — 5 independent fraud checks with explainable scores
- **Hindi language support** — Full i18n matching Paytm AI Soundbox's multilingual vision
- **Real-time swarm visualizer** — Watch agents execute with live latency tracking
- **Decision explainability** — SHAP-style feature contribution analysis
- **Structured financing** — Supply-based credit when direct lending is too risky

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
│   ├── api.py                 # FastAPI endpoints
│   ├── main.py                # Entry point
│   └── gnn_train.py           # Legacy GNN training
├── src/
│   ├── App.jsx                # Main app with routing + i18n
│   └── components/
│       ├── SwarmVisualizer.jsx # Real-time swarm execution view
│       ├── Navbar.jsx          # Navigation with Hindi toggle
│       ├── DecisionEngine.jsx  # AI underwriting dashboard
│       ├── UserDashboard.jsx   # Borrower interface
│       ├── ShopkeeperDashboard.jsx # Merchant interface
│       ├── CreditMesh.jsx      # GNN visualization
│       └── TCNAgentVisualizer.jsx  # TCN visualization
└── package.json
```

---

## Why This Architecture?

| Paytm's Direction | TrustAI's Implementation |
|-------------------|-------------------------|
| Prism multi-agent swarm (#2 on Spider 2.0) | Self-organizing agent swarm with parallel execution |
| Payment MCP Server (open-source) | AI agents disburse via MCP tool calls |
| AI Soundbox (11 languages) | Hindi/English toggle for merchant interface |
| Groq partnership (sub-second AI) | Full pipeline executes in < 200ms |
| Postpaid 2.0 (credit on UPI) | Structured supply financing with UPI escrow |
| Merchant-first strategy | Transaction graph built on Paytm payment channels |

---

<p align="center">
  <b>TrustAI</b> — Built for FIN-O-HACK 2026 | AI for Small Businesses Track
</p>
