"""
TrustAI Swarm Engine — Prism-Inspired Self-Organizing Agent Swarm

Architecture mirrors Paytm's Prism system:
  1. PLANNER   — Decomposes the credit request into sub-tasks
  2. EXECUTORS — Specialized agents execute sub-tasks concurrently
  3. VALIDATOR — Cross-validates outputs, detects conflicts, produces final decision

Agents communicate through a shared SwarmState (blackboard pattern).
Every action is logged with nanosecond timestamps for latency tracking.
"""

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

import numpy as np

try:
    from feedback_loop import get_tracker
except ImportError:
    # Fallback to avoid breaking standalone runs during dev
    def get_tracker():
        class DummyTracker:
            def record_decision(self, *args, **kwargs): return "dummy_id"
        return DummyTracker()


class AgentRole(str, Enum):
    PLANNER = "planner"
    ANALYST = "analyst"
    VERIFIER = "verifier"
    DISBURSER = "disburser"
    VALIDATOR = "validator"


class StepStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class SwarmLog:
    timestamp: float
    agent: str
    action: str
    detail: str
    latency_ms: float = 0.0

    def to_dict(self):
        return {
            "timestamp": self.timestamp,
            "agent": self.agent,
            "action": self.action,
            "detail": self.detail,
            "latency_ms": round(self.latency_ms, 2),
        }


@dataclass
class SwarmState:
    """Shared blackboard for inter-agent communication."""

    request_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])

    # Input
    merchant_id: str = ""
    merchant_name: str = ""
    transaction_data: dict = field(default_factory=dict)
    loan_amount: float = 0.0
    items: list = field(default_factory=list)
    borrower_id: str = ""
    borrower_name: str = ""

    # Agent outputs
    gnn_score: Optional[float] = None
    gnn_confidence: Optional[float] = None
    gnn_cluster_probs: Optional[dict] = None
    gnn_neighbor_risk: Optional[float] = None
    tcn_stability: Optional[float] = None
    tcn_trend: Optional[str] = None
    fraud_flags: list = field(default_factory=list)
    fraud_score: Optional[float] = None
    price_verified: bool = False
    price_details: dict = field(default_factory=dict)
    payment_status: Optional[str] = None
    payment_txn_id: Optional[str] = None
    mcp_response: Optional[dict] = None

    # Internal state
    _enhanced_fraud: bool = False
    _decision_id: Optional[str] = None

    # Explainability (SHAP-like feature attribution)
    feature_importance: list = field(default_factory=list)

    # Final decision
    decision: Optional[str] = None  # "approved" | "rejected" | "structured"
    decision_reason: str = ""
    composite_risk: Optional[float] = None

    # Execution log
    logs: list = field(default_factory=list)
    total_latency_ms: float = 0.0

    # Optional streaming callback for WebSocket
    _on_log: Any = None

    def log(self, agent: str, action: str, detail: str, latency_ms: float = 0.0):
        entry = SwarmLog(
            timestamp=time.time(),
            agent=agent,
            action=action,
            detail=detail,
            latency_ms=latency_ms,
        )
        self.logs.append(entry)
        # Stream to WebSocket if callback is set
        if self._on_log:
            try:
                self._on_log(entry.to_dict())
            except Exception:
                pass

    def to_dict(self):
        return {
            "request_id": self.request_id,
            "merchant_id": self.merchant_id,
            "merchant_name": self.merchant_name,
            "borrower_id": self.borrower_id,
            "borrower_name": self.borrower_name,
            "loan_amount": self.loan_amount,
            "items": self.items,
            "gnn_score": self.gnn_score,
            "gnn_confidence": self.gnn_confidence,
            "gnn_cluster_probs": self.gnn_cluster_probs,
            "tcn_stability": self.tcn_stability,
            "tcn_trend": self.tcn_trend,
            "fraud_flags": self.fraud_flags,
            "fraud_score": self.fraud_score,
            "price_verified": self.price_verified,
            "price_details": self.price_details,
            "payment_status": self.payment_status,
            "payment_txn_id": self.payment_txn_id,
            "feature_importance": self.feature_importance,
            "decision": self.decision,
            "decision_reason": self.decision_reason,
            "composite_risk": self.composite_risk,
            "total_latency_ms": self.total_latency_ms,
            "logs": [l.to_dict() for l in self.logs],
        }


@dataclass
class SwarmResult:
    success: bool
    decision: str
    state: dict
    logs: list
    total_latency_ms: float

    def to_dict(self):
        return {
            "success": self.success,
            "decision": self.decision,
            "state": self.state,
            "logs": self.logs,
            "total_latency_ms": round(self.total_latency_ms, 2),
        }


class SwarmEngine:
    """
    Self-organizing swarm orchestrator.

    Pipeline:
      Plan → [Analyst + Verifier] (parallel) → Validator → Disburser (if approved)

    This mirrors Prism's Planner→Generator→Validator architecture
    but adapted for real-time credit decisioning.
    """

    def __init__(self, agents: dict):
        """
        agents: dict mapping AgentRole -> agent instance
        Each agent must implement: async execute(state: SwarmState) -> SwarmState
        """
        self.agents = agents

    async def run(self, state: SwarmState) -> SwarmResult:
        swarm_start = time.time()
        state.log("SWARM", "INIT", f"Swarm initialized for request {state.request_id}")

        try:
            # Phase 1: PLAN
            state.log("PLANNER", "PLAN", "Decomposing credit request into sub-tasks")
            plan = self._create_plan(state)
            state.log(
                "PLANNER",
                "PLAN_COMPLETE",
                f"Generated {len(plan)} execution steps",
                latency_ms=(time.time() - swarm_start) * 1000,
            )

            # Phase 2: EXECUTE — Analyst + Verifier run in parallel
            exec_start = time.time()
            state.log("SWARM", "EXECUTE", "Launching Analyst and Verifier agents in parallel")

            analyst = self.agents.get(AgentRole.ANALYST)
            verifier = self.agents.get(AgentRole.VERIFIER)

            if analyst and verifier:
                # Parallel execution — this is the key differentiator
                await asyncio.gather(
                    analyst.execute(state),
                    verifier.execute(state),
                )
            elif analyst:
                await analyst.execute(state)

            exec_latency = (time.time() - exec_start) * 1000
            state.log("SWARM", "EXECUTE_COMPLETE", "Analyst and Verifier finished", latency_ms=exec_latency)

            # Phase 3: VALIDATE — Cross-validate and produce final decision
            val_start = time.time()
            state = self._validate(state)
            val_latency = (time.time() - val_start) * 1000
            state.log("VALIDATOR", "VALIDATE_COMPLETE", f"Decision: {state.decision}", latency_ms=val_latency)

            # Phase 4: DISBURSE — Only if approved
            if state.decision == "approved" or state.decision == "structured":
                disburser = self.agents.get(AgentRole.DISBURSER)
                if disburser:
                    await disburser.execute(state)

            total_ms = (time.time() - swarm_start) * 1000
            state.total_latency_ms = total_ms
            state.log("SWARM", "COMPLETE", f"Swarm completed in {total_ms:.0f}ms", latency_ms=total_ms)

            # Record feedback
            tracker = get_tracker()
            decision_id = tracker.record_decision(
                merchant_id=state.merchant_id or state.request_id,
                loan_amount=state.loan_amount,
                decision=state.decision or "rejected",
                composite_risk=state.composite_risk or 1.0,
                gnn_confidence=state.gnn_confidence or 0.0,
                tcn_stability=state.tcn_stability or 0.0,
                fraud_score=state.fraud_score or 0.0,
            )
            state._decision_id = decision_id

            out_state = state.to_dict()
            out_state["decision_id"] = decision_id

            return SwarmResult(
                success=True,
                decision=state.decision or "pending",
                state=out_state,
                logs=[l.to_dict() for l in state.logs],
                total_latency_ms=total_ms,
            )

        except Exception as e:
            total_ms = (time.time() - swarm_start) * 1000
            state.log("SWARM", "ERROR", str(e), latency_ms=total_ms)
            return SwarmResult(
                success=False,
                decision="error",
                state=state.to_dict(),
                logs=[l.to_dict() for l in state.logs],
                total_latency_ms=total_ms,
            )

    def _create_plan(self, state: SwarmState) -> list:
        """Dynamic planner — adapts execution based on input signals."""
        steps = []
        
        # Always run analyst first (GNN + TCN)
        steps.append({"step": 1, "agent": "analyst", "task": "GNN + TCN analysis"})
        
        # Dynamic decision: should we run enhanced fraud checks?
        tx = state.transaction_data
        if tx:
            p2p_ratio = (tx.get("p2p_received_monthly", 0) + tx.get("p2p_sent_monthly", 0)) / max(tx.get("monthly_income", 1), 1)
            velocity = tx.get("current_month_count", 0) / max(tx.get("avg_monthly_count", 1), 1)
            kyc = tx.get("merchant_kyc_verified", True)
            
            if p2p_ratio > 2.0 or velocity > 3.0 or not kyc:
                # High-risk signals → run enhanced fraud pipeline
                steps.append({"step": 2, "agent": "verifier", "task": "ENHANCED fraud detection (triggered by risk signals)", "enhanced": True})
                state._enhanced_fraud = True
            else:
                steps.append({"step": 2, "agent": "verifier", "task": "Standard verification"})
                state._enhanced_fraud = False
        else:
            steps.append({"step": 2, "agent": "verifier", "task": "Standard verification"})
            state._enhanced_fraud = False
        
        # Validation always runs
        steps.append({"step": 3, "agent": "validator", "task": "Cross-validate and decide"})
        
        # Disbursement only if approved
        steps.append({"step": 4, "agent": "disburser", "task": "Execute payment if approved"})
        
        return steps

    def _validate(self, state: SwarmState) -> SwarmState:
        """
        Validator agent — cross-validates outputs from Analyst and Verifier.
        Computes composite risk score and makes final decision.

        Decision matrix:
          - composite_risk < 0.3  → approved (direct)
          - composite_risk < 0.55 → structured (supply-based financing)
          - composite_risk >= 0.55 → rejected
          - Any critical fraud flags → rejected immediately
        """
        # Check for critical fraud
        critical_frauds = [f for f in state.fraud_flags if f.get("severity") == "critical"]
        if critical_frauds:
            state.decision = "rejected"
            state.decision_reason = f"Critical fraud detected: {critical_frauds[0].get('type', 'unknown')}"
            state.composite_risk = 1.0
            return state

        # Compute composite risk from GNN + TCN + Fraud
        gnn_risk = 1.0 - (state.gnn_confidence or 0.5)
        tcn_risk = 1.0 - (state.tcn_stability or 0.5)
        fraud_risk = state.fraud_score or 0.0

        # Weighted composite: GNN 40%, TCN 35%, Fraud 25%
        composite = (gnn_risk * 0.40) + (tcn_risk * 0.35) + (fraud_risk * 0.25)
        state.composite_risk = round(composite, 4)

        # Price verification penalty
        if not state.price_verified and state.items:
            composite += 0.05
            state.composite_risk = round(min(composite, 1.0), 4)

        # Decision
        if composite < 0.3:
            state.decision = "approved"
            state.decision_reason = f"Low risk ({composite:.2f}). Strong relational stability and behavioral consistency."
        elif composite < 0.55:
            state.decision = "structured"
            state.decision_reason = (
                f"Moderate risk ({composite:.2f}). Recommending structured supply financing "
                "to mitigate cash misuse risk while enabling productive investment."
            )
        else:
            state.decision = "rejected"
            state.decision_reason = f"High risk ({composite:.2f}). Insufficient trust signals across GNN and TCN models."

        # Re-evaluation loop (Dynamic Swarm Reasoning)
        if state.decision == "rejected" and (state.gnn_confidence or 0.0) > 0.8:
            state.log(
                "VALIDATOR",
                "RECHECK",
                "Decision was 'rejected', but GNN expressed high confidence. Re-evaluating composite risk."
            )
            # Perform a double check: if fraud risk is low, overrule TCN
            if fraud_risk < 0.15:
                state.decision = "structured"
                state.decision_reason = f"High GNN confidence (>0.8) and low fraud risk (<0.15) overrules rejection. Structured financing approved."
                state.composite_risk -= 0.10
                composite -= 0.10

        state.log(
            "VALIDATOR",
            "RISK_COMPUTED",
            f"GNN={gnn_risk:.2f} TCN={tcn_risk:.2f} Fraud={fraud_risk:.2f} -> Composite={composite:.2f} -> {state.decision}",
        )

        # Feature importance fallback (only when GNN gradient attribution unavailable)
        if not state.feature_importance and state.transaction_data:
            tx = state.transaction_data
            monthly_income = tx.get("monthly_income", 15000)
            monthly_expense = tx.get("monthly_expense", 12000)
            savings_ratio = (monthly_income - monthly_expense) / (monthly_income + 1e-6)
            weekly = tx.get("weekly_data", [])
            income_stability = 1.0 - (np.std([w.get("income", 4000) for w in weekly]) / (np.mean([w.get("income", 4000) for w in weekly]) + 1e-6)) if weekly else 0.5

            state.feature_importance = [
                {"name": "Income Stability", "value": round(income_stability * 0.18, 4)},
                {"name": "Savings Discipline", "value": round(savings_ratio * 0.15, 4)},
                {"name": "UPI Transaction Volume", "value": round(min(tx.get("upi_monthly_count", 0) / 100, 1.0) * 0.12, 4)},
                {"name": "Customer Diversity", "value": round(min(tx.get("unique_customers", 0) / 100, 1.0) * 0.09, 4)},
                {"name": "Merchant Tenure", "value": round(min(tx.get("months_active", 0) / 24, 1.0) * 0.08, 4)},
                {"name": "Repayment History", "value": round(min(tx.get("loans_repaid", 0) / 3, 1.0) * 0.07, 4)},
                {"name": "Spending Volatility", "value": round(-0.04 - fraud_risk * 0.03, 4)},
                {"name": "P2P Asymmetry", "value": round(-min(tx.get("p2p_sent_monthly", 0) / (tx.get("p2p_received_monthly", 1) + 1e-6), 1.0) * 0.05, 4)},
            ]
            state.feature_importance.sort(key=lambda x: x["value"], reverse=True)

        return state
