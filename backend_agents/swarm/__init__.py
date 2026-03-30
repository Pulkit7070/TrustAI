"""
TrustAI Swarm Engine — Inspired by Paytm's Prism Architecture.

A self-organizing multi-agent swarm for merchant credit decisioning.
Agents collaborate through a shared blackboard (SwarmState) with
Planner → Executor → Validator pipeline.
"""

from .engine import SwarmEngine, SwarmState, SwarmResult
from .agents import AnalystAgent, VerifierAgent, DisburserAgent

__all__ = [
    "SwarmEngine",
    "SwarmState",
    "SwarmResult",
    "AnalystAgent",
    "VerifierAgent",
    "DisburserAgent",
]
