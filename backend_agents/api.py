"""
TrustAI API — FastAPI endpoints for the Swarm Credit Engine

Built on:
  - Prism-style self-organizing agent swarm
  - Paytm MCP Server integration for payments
  - GNN + TCN ML models for credit decisioning

Endpoints:
  POST /swarm/run          — Full swarm execution (credit assessment + payment)
  POST /swarm/analyze      — Credit analysis only (GNN + TCN)
  GET  /swarm/health       — System health + model status
  GET  /graph/topology     — Merchant graph for frontend visualization
  POST /mcp/transaction    — Direct MCP payment initiation
  GET  /mcp/status/{id}    — Transaction status check

Legacy (kept for backward compatibility):
  POST /run-agents         — Original CrewAI endpoint
  GET  /predict-risk       — Original GNN risk endpoint
"""

import time
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

app = FastAPI(
    title="TrustAI Swarm API",
    description="AI-powered merchant credit decisioning built on Paytm's MCP infrastructure",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request/Response Models ---

class SwarmRequest(BaseModel):
    merchant_id: str = "KSK-901"
    merchant_name: str = "Kisan Sewa Kendra"
    farmer_id: str = "FARMER-001"
    farmer_name: str = "Rajesh Kumar"
    loan_amount: float = 6650
    items: list = Field(default_factory=lambda: [
        {"name": "Hybrid Wheat Seeds (20kg)", "qty": 2, "price": 1200},
        {"name": "Urea Fertilizer (50kg)", "qty": 5, "price": 850},
    ])
    transaction_data: dict = Field(default_factory=lambda: {
        "upi_monthly_count": 45,
        "qr_payments_count": 22,
        "soundbox_active": True,
        "soundbox_txn_count": 30,
        "avg_ticket_size": 650,
        "unique_customers": 78,
        "months_active": 18,
        "monthly_income": 15000,
        "monthly_expense": 12000,
        "p2p_received_monthly": 5000,
        "p2p_sent_monthly": 3000,
        "current_month_count": 50,
        "avg_monthly_count": 45,
        "merchant_kyc_verified": True,
        "repeat_customers": 45,
        "new_customers_monthly": 12,
        "settlement_amount": 200000,
        "loans_repaid": 2,
        "default_rate": 0.0,
        "merchant_tier": 2,
        "weekly_data": [
            {"week": "W1", "income": 4000, "spending": 3800, "savings": 200},
            {"week": "W2", "income": 4200, "spending": 4000, "savings": 200},
            {"week": "W3", "income": 3800, "spending": 4100, "savings": -300},
            {"week": "W4", "income": 4500, "spending": 3500, "savings": 1000},
            {"week": "W5", "income": 4100, "spending": 3900, "savings": 200},
            {"week": "W6", "income": 4300, "spending": 4200, "savings": 100},
            {"week": "W7", "income": 4000, "spending": 3800, "savings": 200},
            {"week": "W8", "income": 4600, "spending": 3600, "savings": 1000},
            {"week": "W9", "income": 4200, "spending": 4000, "savings": 200},
            {"week": "W10", "income": 4400, "spending": 4100, "savings": 300},
            {"week": "W11", "income": 4100, "spending": 3900, "savings": 200},
            {"week": "W12", "income": 4500, "spending": 3700, "savings": 800},
        ],
    })


class AnalyzeRequest(BaseModel):
    merchant_id: str = "KSK-901"
    transaction_data: dict = Field(default_factory=dict)


class MCPTransactionRequest(BaseModel):
    merchant_id: str
    amount: float
    order_id: str = ""
    items: list = Field(default_factory=list)
    customer_id: str = ""


# Legacy model
class LoanRequest(BaseModel):
    item: str
    quantity: int
    vendor_id: str
    farmer_id: str


# --- Initialize Swarm Components ---

def get_swarm_engine():
    """Lazy initialization of the swarm engine."""
    from swarm.engine import SwarmEngine, AgentRole
    from swarm.agents import AnalystAgent, VerifierAgent, DisburserAgent
    from mcp.paytm_client import PaytmMCPClient

    mcp_client = PaytmMCPClient(
        merchant_id="TRUSTAI_DEMO",
        demo_mode=True,
    )

    agents = {
        AgentRole.ANALYST: AnalystAgent(),
        AgentRole.VERIFIER: VerifierAgent(),
        AgentRole.DISBURSER: DisburserAgent(mcp_client=mcp_client),
    }

    return SwarmEngine(agents=agents), mcp_client


_engine = None
_mcp_client = None


def engine():
    global _engine, _mcp_client
    if _engine is None:
        _engine, _mcp_client = get_swarm_engine()
    return _engine


def mcp():
    global _engine, _mcp_client
    if _mcp_client is None:
        _engine, _mcp_client = get_swarm_engine()
    return _mcp_client


# --- Swarm Endpoints ---

@app.post("/swarm/run")
async def swarm_run(request: SwarmRequest):
    """
    Execute the full TrustAI swarm pipeline.

    Pipeline:
      1. PLAN — Decompose credit request
      2. ANALYZE — GNN credit mesh + TCN temporal stability (parallel)
      3. VERIFY — Fraud detection + price verification (parallel with analyze)
      4. VALIDATE — Cross-validate and produce decision
      5. DISBURSE — Execute payment via Paytm MCP (if approved)

    Returns the complete swarm execution result with latency metrics.
    """
    from swarm.engine import SwarmState

    state = SwarmState(
        merchant_id=request.merchant_id,
        merchant_name=request.merchant_name,
        farmer_id=request.farmer_id,
        farmer_name=request.farmer_name,
        loan_amount=request.loan_amount,
        items=request.items,
        transaction_data=request.transaction_data,
    )

    result = await engine().run(state)
    return result.to_dict()


@app.post("/swarm/analyze")
async def swarm_analyze(request: AnalyzeRequest):
    """
    Credit analysis only — runs GNN + TCN without payment.
    Useful for pre-qualification and risk assessment.
    """
    from swarm.engine import SwarmState
    from swarm.agents import AnalystAgent, VerifierAgent

    state = SwarmState(
        merchant_id=request.merchant_id,
        transaction_data=request.transaction_data,
    )

    analyst = AnalystAgent()
    verifier = VerifierAgent()

    import asyncio
    await asyncio.gather(
        analyst.execute(state),
        verifier.execute(state),
    )

    return {
        "gnn_score": state.gnn_score,
        "gnn_confidence": state.gnn_confidence,
        "gnn_cluster_probs": state.gnn_cluster_probs,
        "tcn_stability": state.tcn_stability,
        "tcn_trend": state.tcn_trend,
        "fraud_score": state.fraud_score,
        "fraud_flags": state.fraud_flags,
        "logs": [l.to_dict() for l in state.logs],
    }


@app.get("/swarm/health")
async def swarm_health():
    """System health check with model status."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "engine": "TrustAI Swarm (Prism-inspired)",
        "agents": ["analyst", "verifier", "disburser"],
        "mcp": {
            "provider": "Paytm Payment MCP Server",
            "status": "connected (demo mode)",
            "tools": [
                "paytm_initiate_transaction",
                "paytm_transaction_status",
                "paytm_create_subscription",
                "paytm_check_balance",
            ],
        },
        "models": {
            "gnn": "MerchantGNN (3-layer GCN, 21 nodes, 6 clusters)",
            "tcn": "TCNStabilityModel (3 blocks, 12-week window)",
        },
        "architecture": {
            "pattern": "Self-organizing agent swarm",
            "pipeline": "Plan → [Analyze ∥ Verify] → Validate → Disburse",
            "inspiration": "Paytm Prism (Spider 2.0 #2 globally)",
        },
    }


@app.get("/graph/topology")
async def graph_topology():
    """Return merchant graph structure for frontend visualization."""
    from models.merchant_gnn import MerchantGraphBuilder
    return MerchantGraphBuilder.get_graph_topology()


# --- MCP Endpoints ---

@app.post("/mcp/transaction")
async def mcp_transaction(request: MCPTransactionRequest):
    """Initiate a payment transaction via Paytm MCP."""
    result = await mcp().initiate_transaction(
        merchant_id=request.merchant_id,
        amount=request.amount,
        order_id=request.order_id or f"ORD-{int(time.time())}",
        items=request.items,
        customer_id=request.customer_id,
    )
    return result


@app.get("/mcp/status/{order_id}")
async def mcp_status(order_id: str):
    """Check transaction status via Paytm MCP."""
    result = await mcp().check_transaction_status(order_id)
    return result


@app.get("/mcp/log")
async def mcp_call_log():
    """Get all MCP tool calls made in this session."""
    return {"calls": mcp().get_call_log()}


# --- Legacy Endpoints (backward compatibility) ---

@app.post("/run-agents")
async def run_agents_legacy(request: LoanRequest):
    """Legacy endpoint — redirects to swarm pipeline."""
    swarm_req = SwarmRequest(
        merchant_id=request.vendor_id,
        farmer_id=request.farmer_id,
        loan_amount=request.quantity * 600,
        items=[{"name": request.item, "qty": request.quantity, "price": 600}],
    )
    return await swarm_run(swarm_req)


@app.get("/predict-risk")
async def predict_risk_legacy():
    """Legacy GNN risk endpoint."""
    req = AnalyzeRequest(merchant_id="default")
    return await swarm_analyze(req)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
