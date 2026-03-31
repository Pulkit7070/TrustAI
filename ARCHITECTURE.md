# TrustAI — Architecture Deep Dive

## System Overview

TrustAI is an **agentic AI system** that replaces traditional binary lending decisions (approve/reject) with an intelligent **Triangular Financing Loop**. Instead of leaving rejected borrowers without support, the system autonomously restructures risky loans into supply-based micro-credit routed through trusted local merchants — all powered by Paytm's MCP payment infrastructure.

---

## 1. Core Architecture: Agentic Triangular Financing Loop

### The Problem with Linear Lending

```
User -> Bank -> Model says "Risky" -> REJECTED -> Dead End
```

70% of loan applications from underserved borrowers — in rural India and urban small businesses alike — are rejected. These users have real needs (supplies, inventory, equipment) but insufficient credit history. The money is lost, the user is unserved, and the bank loses a potential customer.

### The Triangular Solution

```
       Borrower (needs supplies/inventory)
          |
          | (1) Loan application
          v
    +-----------+
    | TrustAI   |  (2) AI swarm evaluates risk
    | Swarm     |  (3) Too risky for direct cash? Restructure.
    | Engine    |
    +-----------+
          |
          | (4) Pay merchant DIRECTLY via Paytm MCP (UPI Escrow)
          v
    Shopkeeper (gets payment, delivers supplies)
          |
          | (5) Auto-repayment from borrower's income cycle
          v
    Bank/NBFC (lower risk, supply-backed loan, reduced NPAs)
```

### Why This Works

| Stakeholder | Traditional Model | Triangular Model |
|-------------|------------------|------------------|
| **Borrower** | Rejected, no support | Gets supplies/inventory via merchant |
| **Shopkeeper** | Lost sale | Gets guaranteed payment + new customer |
| **Bank** | Lost lead, no revenue | Lower-risk supply-backed loan, auto-repayment |
| **Paytm** | One failed transaction | Multiple MCP transactions (payment + subscription + tracking) |

---

## 2. Agent Architecture

### Swarm Engine (Prism-inspired)

The engine uses a **shared blackboard pattern** (like Paytm's Prism) where all agents read/write to a common `SwarmState` object.

```
SwarmState (Shared Blackboard)
├── merchant_id, borrower_id, loan_amount, items
├── transaction_data (UPI counts, income, expenses, etc.)
├── gnn_score, gnn_confidence, gnn_cluster_probs  [written by Analyst]
├── tcn_stability, tcn_trend                       [written by Analyst]
├── fraud_score, fraud_flags                       [written by Verifier]
├── price_verified, price_details                  [written by Verifier]
├── composite_risk, decision, decision_reason      [written by Orchestrator]
├── feature_importance (SHAP)                      [written by Orchestrator]
├── payment_txn_id, payment_status                 [written by Disburser]
└── logs[] (timestamped, per-agent)                [written by all]
```

### Agent Roles

| Agent | Role | Reads From State | Writes To State |
|-------|------|-----------------|-----------------|
| **Orchestrator** | Decomposes task, cross-validates, decides | All fields | composite_risk, decision, feature_importance |
| **Analyst** | GNN + TCN scoring | transaction_data | gnn_*, tcn_* |
| **Verifier** | Fraud checks + price verification | transaction_data, items | fraud_*, price_* |
| **Disburser** | Paytm MCP payment execution | decision, loan_amount, merchant_id | payment_* |

### Execution Flow

```
[Orchestrator: PLAN]
    |
    ├── [Analyst: ANALYZE]  ──┐
    │     GNN forward pass     │  PARALLEL
    │     TCN stability        │  (asyncio.gather)
    ├── [Verifier: VERIFY]  ──┘
    │     5 fraud signals
    │     Price verification
    |
[Orchestrator: VALIDATE]
    |  Cross-validate GNN + TCN + Fraud
    |  Compute composite risk
    |  3-way decision: approve / structured / reject
    |  SHAP feature attribution
    |
[Disburser: DISBURSE]  (only if not rejected)
    |  paytm_initiate_transaction (UPI Escrow to merchant)
    |  paytm_create_subscription (auto-repayment schedule)
```

---

## 3. ML Models

### 3.1 Merchant GNN (Graph Neural Network)

**Purpose**: Score merchant creditworthiness based on their position and behavior in the Paytm transaction network.

**Graph Structure** (21 nodes, 42 edges, 6 clusters):

```
                    ┌─ upi_p2m
                    ├─ qr_dynamic
        revenue ────├─ qr_static
                    ├─ soundbox
                    ├─ pos_terminal
                    └─ online_pg

                    ┌─ cust_regular
        customers ──├─ cust_new
                    ├─ cust_high_value
                    └─ cust_seasonal

MERCHANT ──┤
                    ┌─ settlement
        financial ──├─ refunds
                    ├─ chargeback
                    └─ cashflow

                    ┌─ postpaid_usage
        credit ─────├─ loan_history
                    └─ credit_line

                    ┌─ inventory
        business ───├─ suppliers
                    └─ operating_costs
```

**Model**: 3-layer Graph Convolutional Network (GCN)
- Input: 24-dim node features (built from transaction_data)
- Hidden: 48-dim with ReLU + Dropout(0.3)
- Output: 6-class cluster probabilities
- Confidence: weighted average of cluster probabilities

### 3.2 TCN (Temporal Convolutional Network)

**Purpose**: Score behavioral stability from 12-week financial time-series.

**Input**: 3 channels x 12 timesteps
- Channel 0: Normalized weekly income
- Channel 1: Normalized weekly spending
- Channel 2: Normalized weekly savings

**Architecture**:
- 3 TCN blocks with causal dilated convolutions
- Dilation factors: 1, 2, 4 (receptive field = 12 weeks)
- Residual connections per block
- Final: AdaptiveAvgPool1d -> Linear -> Sigmoid

**Output**: Stability score [0, 1] + trend label (improving/stable/declining)

### 3.3 Fraud Detection (5-signal)

| Signal | Detection Method | Severity |
|--------|-----------------|----------|
| Circular transactions | P2P received/sent ratio > 0.85 | Warning |
| Velocity spike | Current month count > 2x average | Warning |
| New account risk | Months active < 3 | Warning |
| High leverage | Loan amount > 3x monthly income | Warning |
| Unverified merchant | KYC not verified | Critical |

Any **critical** flag = automatic rejection.
Fraud score = weighted sum of all flags (0 to 1).

### 3.4 SHAP-style Explainability

10 features with positive/negative attribution:

| Feature | Direction | Weight |
|---------|-----------|--------|
| Income Stability | + | 0.18 |
| Savings Discipline | + | 0.15 |
| UPI Transaction Volume | + | 0.12 |
| Merchant Tenure | + | 0.10 |
| Customer Retention | + | 0.08 |
| Default History | - | variable |
| Spending Volatility | - | variable |
| P2P Asymmetry | - | variable |

---

## 4. Paytm MCP Integration

### What is MCP?

Model Context Protocol (MCP) is an open standard that allows AI agents to interact with external tools and APIs through structured function calls. Paytm's [Payment MCP Server](https://github.com/paytm/payment-mcp-server) exposes payment APIs as MCP tools.

### Tools Used

```python
# In Disburser Agent:

# 1. Pay the merchant (UPI Escrow)
result = await mcp.initiate_transaction(
    merchant_id="KSK-901",
    amount=6650,
    order_id="ORD-123",
    items=[{"name": "Business Supplies", "qty": 5, "price": 850}],
)

# 2. Schedule auto-repayment
result = await mcp.create_subscription(
    merchant_id="KSK-901",
    amount=1108,  # monthly installment
    frequency="monthly",
    plan_id="REPAY-CYCLE-001",
)

# 3. Check transaction status
status = await mcp.check_transaction_status("ORD-123")

# 4. Verify balance before disbursement
balance = await mcp.check_balance("KSK-901")
```

### Connection Modes

| Mode | Transport | Usage |
|------|-----------|-------|
| **Demo** (current) | In-process simulation | Hackathon demo with realistic responses |
| **Local** | STDIO | Connect to locally running `paytm_mcp.py` |
| **Remote** | SSE | Connect to `https://paytm-mcp.pg2prod.paytm.com/sse/` |

### Required Config for Production

```env
PAYTM_MID=your_merchant_id
PAYTM_KEY_SECRET=your_key_secret
```

---

## 5. Frontend Architecture

### Views

| View | Component | Data Source |
|------|-----------|-------------|
| Landing Page | `App.jsx` | Live `/swarm/run` result in terminal |
| Swarm Visualizer | `SwarmVisualizer.jsx` | WebSocket `/swarm/ws` or REST fallback |
| Decision Engine | `DecisionEngine.jsx` | `/swarm/analyze` (SHAP data) |
| Credit Mesh | `CreditMesh.jsx` | `/graph/topology` + `/swarm/analyze` |
| Borrower Dashboard | `UserDashboard.jsx` | Local state |
| Merchant Dashboard | `ShopkeeperDashboard.jsx` | Local state + MCP |

### Real-time Features

- **WebSocket streaming**: Agent logs stream live during pipeline execution
- **Hindi voice input**: Web Speech API (`hi-IN`) for voice commands
- **Profile selector**: Switch between 4 merchant risk profiles
- **Fraud alerts**: Red-flash overlay animation on critical fraud detection
- **Benchmark**: Run p50/p95/p99 latency measurement from UI

---

## 6. What Is Implemented

| Component | File | Status |
|-----------|------|--------|
| Swarm Engine (orchestrator) | `backend_agents/swarm/engine.py` | Done |
| Analyst Agent (GNN + TCN) | `backend_agents/swarm/agents.py` | Done |
| Verifier Agent (fraud + prices) | `backend_agents/swarm/agents.py` | Done |
| Disburser Agent (Paytm MCP) | `backend_agents/swarm/agents.py` | Done |
| Paytm MCP Client | `backend_agents/mcp/paytm_client.py` | Done (demo mode) |
| Merchant GNN model | `backend_agents/models/merchant_gnn.py` | Done |
| TCN model | `backend_agents/models/tcn.py` | Done |
| FastAPI + WebSocket | `backend_agents/api.py` | Done |
| 4 Merchant Profiles | `backend_agents/api.py` | Done |
| Benchmark endpoint | `backend_agents/api.py` | Done |
| SHAP feature importance | `backend_agents/swarm/engine.py` | Done |
| Swarm Visualizer (WS + voice) | `src/components/SwarmVisualizer.jsx` | Done |
| Decision Engine (SHAP chart) | `src/components/DecisionEngine.jsx` | Done |
| Credit Mesh (D3 graph) | `src/components/CreditMesh.jsx` | Done |
| Hindi/English i18n | `src/App.jsx` | Done |

---

## 7. What Could Be Added Next

### High Impact

| Enhancement | Effort | Impact |
|-------------|--------|--------|
| **Connect to real Paytm MCP Server** (SSE endpoint) | Medium | Production-ready payments |
| **Deploy live** (Vercel frontend + Railway backend) | Low | Live demo link for judges |
| **Actual ML training on real data** | High | Move from heuristic to trained model weights |
| **WhatsApp integration** (Paytm Business API) | Medium | Borrowers interact via WhatsApp, not web |

### Medium Impact

| Enhancement | Effort | Impact |
|-------------|--------|--------|
| **Repayment tracking dashboard** | Medium | Show actual triangular loop completion |
| **Multi-language voice** (11 languages like Soundbox) | Low | Beyond Hindi: Tamil, Telugu, Marathi |
| **Shopkeeper onboarding flow** | Medium | Self-serve merchant registration |
| **Credit limit optimization** | Medium | Dynamic limits based on GNN cluster scores |
| **Historical risk trend** | Low | Show how merchant risk changes over time |

### Research Ideas

| Enhancement | Effort | Impact |
|-------------|--------|--------|
| **Graph Attention Networks** (GAT) instead of GCN | High | Better attention on important edges |
| **Federated learning** across merchants | High | Privacy-preserving model training |
| **Smart contract repayment** | High | Automated blockchain-based escrow |
| **Reinforcement learning** for loan structuring | High | Agent learns optimal loan terms |

---

## 8. Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                          INPUTS                                   │
│                                                                   │
│  User Financial Data    Merchant Graph Data    Temporal Logs      │
│  (income, KYC)          (UPI, QR, Soundbox)   (12-week series)  │
│  Fraud Signals          Item Prices            Market Rates       │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                   TrustAI Agent Swarm Engine                      │
│                                                                   │
│  Parallel Analyst + Verifier -> Cross-validation -> SHAP ->      │
│  3-way Decision (Approve / Structured / Reject) ->               │
│  Paytm MCP Disbursal (UPI Escrow to Merchant)                   │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                         OUTPUTS                                   │
│                                                                   │
│  Operational Impact        Risk Mitigation       Ecosystem Value  │
│  - Sub-200ms decisions     - Supply-backed loans  - Retained users│
│  - Real-time streaming     - Fraud prevention     - Merchant growth│
│  - Explainable AI          - Reduced NPAs         - B2B2C revenue │
└──────────────────────────────────────────────────────────────────┘
```

---

<p align="center">
  <b>TrustAI</b> — Agentic Triangular Financing for Underserved Borrowers<br/>
  FIN-O-HACK 2026 | Built on Paytm MCP Server & Prism Architecture
</p>
