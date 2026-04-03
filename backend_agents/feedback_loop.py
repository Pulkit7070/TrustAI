"""
feedback_loop.py — Outcome Tracking, Drift Detection & Retraining Trigger

Closes the loop that was completely missing from TrustAI:
  1. Records every pipeline decision with outcome tracking
  2. Simulates repayment outcomes for demo (production: real MCP data)
  3. Detects model drift when decision distribution shifts
  4. Triggers retraining when enough labeled outcomes accumulate

This is what makes TrustAI a LEARNING system, not a static one.
"""

import time
import json
import hashlib
import threading
from pathlib import Path
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from typing import Optional

import numpy as np


# ---------------------------------------------------------------------------
# Decision Record
# ---------------------------------------------------------------------------

@dataclass
class DecisionRecord:
    """Single pipeline decision with optional outcome."""
    decision_id: str
    timestamp: float
    merchant_id: str
    loan_amount: float
    decision: str  # approved / structured / rejected
    composite_risk: float
    gnn_confidence: float = 0.0
    tcn_stability: float = 0.0
    fraud_score: float = 0.0
    # Outcome fields (filled later)
    outcome: Optional[str] = None  # on_time / late / default / null
    outcome_timestamp: Optional[float] = None
    repayment_pct: float = 0.0


# ---------------------------------------------------------------------------
# Feedback Tracker
# ---------------------------------------------------------------------------

class FeedbackTracker:
    """
    Tracks pipeline decisions and their outcomes.

    In production: outcomes come from real MCP settlement data.
    In demo mode: outcomes are simulated based on composite risk score.
    """

    def __init__(self, storage_path: Optional[str] = None):
        self._decisions: list[DecisionRecord] = []
        self._lock = threading.Lock()
        self._storage_path = storage_path or str(
            Path(__file__).parent / "feedback_log.json"
        )
        # Training distribution baseline (from merchant_profiles.csv)
        self._training_distribution = {
            "approved": 0.35,
            "structured": 0.30,
            "rejected": 0.25,
            "fraud": 0.10,
        }
        self._load()

    def _load(self):
        """Load persisted decisions from disk."""
        path = Path(self._storage_path)
        if path.exists():
            try:
                with open(str(path), "r") as f:
                    data = json.load(f)
                self._decisions = [
                    DecisionRecord(**d) for d in data.get("decisions", [])
                ]
            except (json.JSONDecodeError, TypeError):
                self._decisions = []

    def _save(self):
        """Persist decisions to disk."""
        path = Path(self._storage_path)
        data = {
            "last_updated": time.time(),
            "decisions": [asdict(d) for d in self._decisions[-1000:]],
        }
        with open(str(path), "w") as f:
            json.dump(data, f, indent=2)

    # --- Recording ---

    def record_decision(
        self,
        merchant_id: str,
        loan_amount: float,
        decision: str,
        composite_risk: float,
        gnn_confidence: float = 0.0,
        tcn_stability: float = 0.0,
        fraud_score: float = 0.0,
    ) -> str:
        """Record a new pipeline decision. Returns decision_id."""
        decision_id = hashlib.sha256(
            f"{merchant_id}{loan_amount}{time.time()}".encode()
        ).hexdigest()[:12]

        record = DecisionRecord(
            decision_id=decision_id,
            timestamp=time.time(),
            merchant_id=merchant_id,
            loan_amount=loan_amount,
            decision=decision,
            composite_risk=composite_risk,
            gnn_confidence=gnn_confidence,
            tcn_stability=tcn_stability,
            fraud_score=fraud_score,
        )

        with self._lock:
            self._decisions.append(record)
            # Auto-simulate outcome for demo mode
            self._simulate_outcome(record)
            self._save()

        return decision_id

    def record_outcome(
        self,
        decision_id: str,
        outcome: str,
        repayment_pct: float = 0.0,
    ) -> bool:
        """Record a real repayment outcome for a past decision."""
        with self._lock:
            for d in reversed(self._decisions):
                if d.decision_id == decision_id:
                    d.outcome = outcome
                    d.outcome_timestamp = time.time()
                    d.repayment_pct = repayment_pct
                    self._save()
                    return True
        return False

    def _simulate_outcome(self, record: DecisionRecord):
        """
        Simulate repayment outcome based on composite risk score.

        This is the demo-mode feedback loop. In production, this would
        be replaced by real MCP settlement tracking data.

        Outcome probabilities calibrated to MUDRA NPA rates:
          - Low risk (< 0.3):  90% on_time, 8% late, 2% default
          - Med risk (< 0.55): 60% on_time, 25% late, 15% default
          - High risk (>= 0.55): 20% on_time, 30% late, 50% default
        """
        if record.decision == "rejected":
            record.outcome = "not_disbursed"
            record.repayment_pct = 0.0
            return

        risk = record.composite_risk
        rng = np.random.RandomState(hash(record.decision_id) % 2**31)

        if risk < 0.3:
            probs = [0.90, 0.08, 0.02]
        elif risk < 0.55:
            probs = [0.60, 0.25, 0.15]
        else:
            probs = [0.20, 0.30, 0.50]

        outcome = rng.choice(["on_time", "late", "default"], p=probs)
        record.outcome = outcome
        record.outcome_timestamp = time.time()

        if outcome == "on_time":
            record.repayment_pct = 1.0
        elif outcome == "late":
            record.repayment_pct = round(rng.uniform(0.5, 0.95), 2)
        else:
            record.repayment_pct = round(rng.uniform(0.0, 0.3), 2)

    # --- Analytics ---

    def get_summary(self) -> dict:
        """Summary statistics for all tracked decisions."""
        with self._lock:
            total = len(self._decisions)
            if total == 0:
                return {
                    "total_decisions": 0,
                    "decisions_with_outcomes": 0,
                    "message": "No pipeline runs tracked yet. Run /swarm/run to start.",
                }

            decision_counts = defaultdict(int)
            outcome_counts = defaultdict(int)
            total_amount = 0.0
            total_repaid = 0.0
            outcomes_recorded = 0

            for d in self._decisions:
                decision_counts[d.decision] += 1
                total_amount += d.loan_amount
                if d.outcome:
                    outcome_counts[d.outcome] += 1
                    outcomes_recorded += 1
                    if d.decision != "rejected":
                        total_repaid += d.loan_amount * d.repayment_pct

            # Effective default rate
            disbursed = sum(1 for d in self._decisions if d.decision != "rejected")
            defaults = outcome_counts.get("default", 0)
            effective_default_rate = defaults / max(disbursed, 1)

            return {
                "total_decisions": total,
                "decisions_with_outcomes": outcomes_recorded,
                "decision_distribution": dict(decision_counts),
                "outcome_distribution": dict(outcome_counts),
                "total_loan_amount": round(total_amount),
                "total_repaid_amount": round(total_repaid),
                "recovery_rate": round(total_repaid / max(total_amount, 1), 4),
                "effective_default_rate": round(effective_default_rate, 4),
                "avg_composite_risk": round(
                    np.mean([d.composite_risk for d in self._decisions]), 4
                ),
                "model_learning_ready": outcomes_recorded >= 50,
                "note": (
                    "Outcomes are simulated for hackathon demo. "
                    "In production, outcomes come from MCP settlement tracking."
                ),
            }

    def get_drift_report(self) -> dict:
        """
        Detect model drift by comparing recent decisions to training distribution.

        Uses Jensen-Shannon divergence to measure distribution shift.
        Drift > 0.1 = warning, > 0.2 = critical (retrain recommended).
        """
        with self._lock:
            total = len(self._decisions)
            if total < 10:
                return {
                    "status": "insufficient_data",
                    "message": f"Need at least 10 decisions, have {total}.",
                    "drift_score": 0.0,
                }

            # Recent decision distribution
            recent = self._decisions[-min(100, total):]
            recent_dist = defaultdict(float)
            for d in recent:
                recent_dist[d.decision] += 1
            for k in recent_dist:
                recent_dist[k] /= len(recent)

            # Compare to training distribution
            categories = list(self._training_distribution.keys())
            p = np.array([self._training_distribution.get(c, 0.01) for c in categories])
            q = np.array([recent_dist.get(c, 0.01) for c in categories])

            # Normalize
            p = p / p.sum()
            q = q / q.sum()

            # Jensen-Shannon divergence
            m = 0.5 * (p + q)
            js = 0.5 * np.sum(p * np.log(p / m + 1e-10)) + \
                 0.5 * np.sum(q * np.log(q / m + 1e-10))
            js = float(np.sqrt(max(js, 0)))  # JS distance

            if js > 0.2:
                status = "critical_drift"
                action = "Model retraining recommended. Decision distribution has shifted significantly."
            elif js > 0.1:
                status = "warning"
                action = "Moderate drift detected. Monitor closely."
            else:
                status = "stable"
                action = "No significant drift. Model is performing consistently."

            # Outcome-based drift: are defaults increasing?
            recent_outcomes = [d for d in recent if d.outcome and d.decision != "rejected"]
            recent_default_rate = sum(1 for d in recent_outcomes if d.outcome == "default") / max(len(recent_outcomes), 1)

            return {
                "status": status,
                "drift_score": round(js, 4),
                "action": action,
                "recent_decisions": len(recent),
                "training_distribution": self._training_distribution,
                "current_distribution": dict(recent_dist),
                "recent_default_rate": round(recent_default_rate, 4),
                "expected_default_rate": 0.05,  # MUDRA NPA baseline
                "retrain_trigger": js > 0.2 or recent_default_rate > 0.15,
            }

    def get_learning_data(self) -> dict:
        """
        Export outcome-labeled data for model retraining.

        Returns merchant features + actual outcomes that can be used
        to retrain the GNN/TCN with real-world feedback.
        """
        with self._lock:
            labeled = [
                d for d in self._decisions
                if d.outcome and d.outcome != "not_disbursed"
            ]

            if len(labeled) < 50:
                return {
                    "ready": False,
                    "labeled_count": len(labeled),
                    "needed": 50,
                    "message": f"Need {50 - len(labeled)} more labeled outcomes for retraining.",
                }

            # Compute outcome-weighted risk labels
            retrain_data = []
            for d in labeled:
                if d.outcome == "on_time":
                    outcome_label = 0  # Low risk confirmed
                elif d.outcome == "late":
                    outcome_label = 1  # Moderate risk confirmed
                else:
                    outcome_label = 2  # High risk confirmed

                retrain_data.append({
                    "merchant_id": d.merchant_id,
                    "original_decision": d.decision,
                    "original_risk": d.composite_risk,
                    "outcome": d.outcome,
                    "outcome_label": outcome_label,
                    "repayment_pct": d.repayment_pct,
                })

            return {
                "ready": True,
                "labeled_count": len(labeled),
                "data": retrain_data,
                "message": "Sufficient labeled data available for retraining.",
            }


# Singleton instance
_tracker = None


def get_tracker() -> FeedbackTracker:
    global _tracker
    if _tracker is None:
        _tracker = FeedbackTracker()
    return _tracker
