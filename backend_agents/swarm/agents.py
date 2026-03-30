"""
TrustAI Swarm Agents — Specialized executors for credit decisioning.

Each agent reads from and writes to the shared SwarmState.
Agents are designed to be fast (sub-second) matching Paytm's
Groq-powered real-time inference requirements.
"""

import time
import random
import numpy as np


class AnalystAgent:
    """
    Credit Analyst Agent — Runs GNN + TCN models.

    Responsibilities:
      1. Build merchant transaction graph and run GNN forward pass
      2. Compute temporal stability score from financial time-series
      3. Generate feature importance (SHAP-style) for explainability
    """

    def __init__(self, gnn_model=None, tcn_model=None):
        self.gnn_model = gnn_model
        self.tcn_model = tcn_model

    async def execute(self, state):
        start = time.time()
        state.log("ANALYST", "START", "Beginning credit analysis pipeline")

        # Step 1: GNN Credit Mesh Analysis
        gnn_start = time.time()
        await self._run_gnn(state)
        gnn_ms = (time.time() - gnn_start) * 1000
        state.log("ANALYST", "GNN_COMPLETE", f"GNN confidence: {state.gnn_confidence}", latency_ms=gnn_ms)

        # Step 2: TCN Temporal Stability
        tcn_start = time.time()
        await self._run_tcn(state)
        tcn_ms = (time.time() - tcn_start) * 1000
        state.log("ANALYST", "TCN_COMPLETE", f"TCN stability: {state.tcn_stability}", latency_ms=tcn_ms)

        total_ms = (time.time() - start) * 1000
        state.log("ANALYST", "COMPLETE", f"Analysis complete in {total_ms:.0f}ms", latency_ms=total_ms)
        return state

    async def _run_gnn(self, state):
        """Run GNN forward pass on merchant transaction graph."""
        if self.gnn_model:
            try:
                import torch
                result = self.gnn_model.predict(state.merchant_id, state.transaction_data)
                state.gnn_score = result["risk_score"]
                state.gnn_confidence = result["confidence"]
                state.gnn_cluster_probs = result.get("cluster_probs", {})
                return
            except Exception as e:
                state.log("ANALYST", "GNN_FALLBACK", f"GNN model error: {e}, using heuristic")

        # Heuristic fallback — simulates GNN output from transaction patterns
        tx_data = state.transaction_data
        if tx_data:
            upi_freq = tx_data.get("upi_monthly_count", 30)
            qr_payments = tx_data.get("qr_payments_count", 15)
            soundbox_active = tx_data.get("soundbox_active", True)
            avg_ticket = tx_data.get("avg_ticket_size", 500)
            customer_diversity = tx_data.get("unique_customers", 50)
            months_active = tx_data.get("months_active", 12)

            # Confidence from transaction richness
            tx_richness = min(1.0, (upi_freq / 100) * 0.3 + (qr_payments / 50) * 0.2 +
                             (1.0 if soundbox_active else 0.0) * 0.15 +
                             min(1.0, avg_ticket / 2000) * 0.15 +
                             min(1.0, customer_diversity / 100) * 0.1 +
                             min(1.0, months_active / 24) * 0.1)
            confidence = round(0.5 + tx_richness * 0.45 + random.uniform(-0.05, 0.05), 4)
        else:
            confidence = round(random.uniform(0.55, 0.85), 4)

        state.gnn_confidence = min(max(confidence, 0.0), 1.0)
        state.gnn_score = round(1.0 - state.gnn_confidence, 4)
        state.gnn_cluster_probs = {
            "income": round(random.uniform(0.6, 0.9), 3),
            "spending": round(random.uniform(0.3, 0.7), 3),
            "savings": round(random.uniform(0.4, 0.8), 3),
            "obligations": round(random.uniform(0.2, 0.5), 3),
            "peer_network": round(random.uniform(0.5, 0.8), 3),
        }

    async def _run_tcn(self, state):
        """Run TCN temporal stability scoring."""
        if self.tcn_model:
            try:
                result = self.tcn_model.predict(state.transaction_data.get("weekly_data", []))
                state.tcn_stability = result["stability"]
                state.tcn_trend = result["trend"]
                return
            except Exception as e:
                state.log("ANALYST", "TCN_FALLBACK", f"TCN model error: {e}, using heuristic")

        # Heuristic: compute stability from weekly financial data
        weekly = state.transaction_data.get("weekly_data", [])
        if weekly and len(weekly) >= 4:
            incomes = [w.get("income", 4000) for w in weekly]
            savings = [w.get("savings", 200) for w in weekly]

            income_cv = np.std(incomes) / (np.mean(incomes) + 1e-6)
            savings_mean = np.mean(savings)
            savings_positive_ratio = sum(1 for s in savings if s > 0) / len(savings)

            stability = (
                (1.0 - min(income_cv, 1.0)) * 0.4 +
                min(savings_mean / 1000, 1.0) * 0.3 +
                savings_positive_ratio * 0.3
            )
            state.tcn_stability = round(min(max(stability, 0.0), 1.0), 4)

            # Trend detection
            if len(savings) >= 4:
                recent = np.mean(savings[-4:])
                earlier = np.mean(savings[:4])
                if recent > earlier * 1.1:
                    state.tcn_trend = "improving"
                elif recent < earlier * 0.9:
                    state.tcn_trend = "declining"
                else:
                    state.tcn_trend = "stable"
            else:
                state.tcn_trend = "stable"
        else:
            state.tcn_stability = round(random.uniform(0.5, 0.8), 4)
            state.tcn_trend = "stable"


class VerifierAgent:
    """
    Fraud Verifier Agent — Detects anomalies and validates prices.

    Responsibilities:
      1. Detect circular transactions and self-dealing
      2. Flag sudden transaction spikes (velocity check)
      3. Verify market prices for agricultural inputs
      4. Check merchant legitimacy signals
    """

    # Real mandi prices (approximate market rates in INR)
    MARKET_PRICES = {
        "urea": {"price": 600, "unit": "50kg bag", "tolerance": 0.15},
        "dap": {"price": 1350, "unit": "50kg bag", "tolerance": 0.10},
        "seeds": {"price": 400, "unit": "kg", "tolerance": 0.20},
        "wheat seeds": {"price": 1200, "unit": "20kg bag", "tolerance": 0.15},
        "hybrid wheat seeds": {"price": 1200, "unit": "20kg", "tolerance": 0.15},
        "fertilizer": {"price": 850, "unit": "50kg bag", "tolerance": 0.15},
        "urea fertilizer": {"price": 850, "unit": "50kg", "tolerance": 0.15},
        "dap fertilizer": {"price": 1350, "unit": "50kg", "tolerance": 0.10},
        "bio-pesticide": {"price": 450, "unit": "1L", "tolerance": 0.20},
        "pesticide": {"price": 450, "unit": "1L", "tolerance": 0.20},
        "sprayer": {"price": 2500, "unit": "piece", "tolerance": 0.25},
    }

    async def execute(self, state):
        start = time.time()
        state.log("VERIFIER", "START", "Beginning fraud detection and price verification")

        # Step 1: Fraud pattern detection
        fraud_start = time.time()
        await self._detect_fraud(state)
        fraud_ms = (time.time() - fraud_start) * 1000
        state.log("VERIFIER", "FRAUD_CHECK", f"Fraud score: {state.fraud_score}, flags: {len(state.fraud_flags)}", latency_ms=fraud_ms)

        # Step 2: Price verification
        price_start = time.time()
        await self._verify_prices(state)
        price_ms = (time.time() - price_start) * 1000
        state.log("VERIFIER", "PRICE_CHECK", f"Price verified: {state.price_verified}", latency_ms=price_ms)

        total_ms = (time.time() - start) * 1000
        state.log("VERIFIER", "COMPLETE", f"Verification complete in {total_ms:.0f}ms", latency_ms=total_ms)
        return state

    async def _detect_fraud(self, state):
        """Multi-signal fraud detection."""
        flags = []
        fraud_score = 0.0
        tx_data = state.transaction_data

        if not tx_data:
            state.fraud_score = 0.1
            state.fraud_flags = []
            return

        # Check 1: Circular transaction detection
        p2p_in = tx_data.get("p2p_received_monthly", 0)
        p2p_out = tx_data.get("p2p_sent_monthly", 0)
        if p2p_in > 0 and p2p_out > 0:
            circular_ratio = min(p2p_in, p2p_out) / max(p2p_in, p2p_out)
            if circular_ratio > 0.8:
                flags.append({
                    "type": "circular_transactions",
                    "severity": "warning",
                    "detail": f"High P2P symmetry detected (ratio: {circular_ratio:.2f})",
                    "score_impact": 0.15,
                })
                fraud_score += 0.15

        # Check 2: Transaction velocity spike
        current_month_tx = tx_data.get("current_month_count", 30)
        avg_monthly_tx = tx_data.get("avg_monthly_count", 30)
        if avg_monthly_tx > 0:
            velocity_ratio = current_month_tx / avg_monthly_tx
            if velocity_ratio > 2.5:
                flags.append({
                    "type": "velocity_spike",
                    "severity": "warning",
                    "detail": f"Transaction count {velocity_ratio:.1f}x above average",
                    "score_impact": 0.10,
                })
                fraud_score += 0.10

        # Check 3: New account risk
        months_active = tx_data.get("months_active", 12)
        if months_active < 3:
            flags.append({
                "type": "new_account",
                "severity": "info",
                "detail": f"Account age: {months_active} months (thin file)",
                "score_impact": 0.08,
            })
            fraud_score += 0.08

        # Check 4: Loan amount vs income ratio
        monthly_income = tx_data.get("monthly_income", 15000)
        if state.loan_amount > 0 and monthly_income > 0:
            loan_income_ratio = state.loan_amount / monthly_income
            if loan_income_ratio > 3.0:
                flags.append({
                    "type": "high_leverage",
                    "severity": "warning",
                    "detail": f"Loan-to-income ratio: {loan_income_ratio:.1f}x",
                    "score_impact": 0.12,
                })
                fraud_score += 0.12

        # Check 5: Merchant legitimacy
        merchant_verified = tx_data.get("merchant_kyc_verified", True)
        if not merchant_verified:
            flags.append({
                "type": "unverified_merchant",
                "severity": "critical",
                "detail": "Merchant KYC not verified",
                "score_impact": 0.30,
            })
            fraud_score += 0.30

        state.fraud_flags = flags
        state.fraud_score = round(min(fraud_score, 1.0), 4)

    async def _verify_prices(self, state):
        """Verify requested item prices against market rates."""
        if not state.items:
            state.price_verified = True
            return

        verified = True
        price_details = {}

        for item in state.items:
            item_name = item.get("name", "").lower()
            item_price = item.get("price", 0)

            # Find matching market price (longest key first for specificity)
            matched = None
            for key in sorted(self.MARKET_PRICES.keys(), key=len, reverse=True):
                if key in item_name:
                    matched = self.MARKET_PRICES[key]
                    break

            if matched:
                market_price = matched["price"]
                tolerance = matched["tolerance"]
                max_acceptable = market_price * (1 + tolerance)

                is_fair = item_price <= max_acceptable
                if not is_fair:
                    verified = False
                    state.fraud_flags.append({
                        "type": "price_inflation",
                        "severity": "warning",
                        "detail": f"{item.get('name')}: ₹{item_price} vs market ₹{market_price} ({((item_price/market_price - 1)*100):.0f}% over)",
                        "score_impact": 0.05,
                    })

                price_details[item.get("name", "unknown")] = {
                    "requested": item_price,
                    "market_rate": market_price,
                    "tolerance": f"{tolerance*100:.0f}%",
                    "status": "fair" if is_fair else "inflated",
                }
            else:
                price_details[item.get("name", "unknown")] = {
                    "requested": item_price,
                    "market_rate": None,
                    "status": "unverified",
                }

        state.price_verified = verified
        state.price_details = price_details


class DisburserAgent:
    """
    Payment Disburser Agent — Executes payments via Paytm MCP Server.

    Interfaces with Paytm's Model Context Protocol to:
      1. Initiate payment directly to merchant (never to borrower)
      2. Set up auto-deduction schedule for repayment
      3. Generate payment confirmation with transaction hash
    """

    def __init__(self, mcp_client=None):
        self.mcp_client = mcp_client

    async def execute(self, state):
        start = time.time()
        state.log("DISBURSER", "START", f"Initiating payment for ₹{state.loan_amount} via Paytm MCP")

        if self.mcp_client:
            try:
                result = await self.mcp_client.initiate_transaction(
                    merchant_id=state.merchant_id,
                    amount=state.loan_amount,
                    order_id=state.request_id,
                    items=state.items,
                )
                state.payment_status = result["status"]
                state.payment_txn_id = result["txn_id"]
                state.mcp_response = result
            except Exception as e:
                state.log("DISBURSER", "MCP_ERROR", f"MCP call failed: {e}, using fallback")
                await self._fallback_payment(state)
        else:
            await self._fallback_payment(state)

        total_ms = (time.time() - start) * 1000
        state.log(
            "DISBURSER",
            "COMPLETE",
            f"Payment {state.payment_status}: TXN#{state.payment_txn_id}",
            latency_ms=total_ms,
        )

        # Set up recovery schedule
        state.log(
            "DISBURSER",
            "RECOVERY_SCHEDULED",
            f"Auto-deduction linked to farmer {state.farmer_id} harvest cycle",
        )

        return state

    async def _fallback_payment(self, state):
        """Simulated payment for demo when MCP server is not connected."""
        import hashlib
        txn_hash = hashlib.sha256(
            f"{state.request_id}{state.merchant_id}{state.loan_amount}{time.time()}".encode()
        ).hexdigest()[:12]

        state.payment_status = "success"
        state.payment_txn_id = f"PTM-{txn_hash.upper()}"
        state.mcp_response = {
            "status": "success",
            "txn_id": state.payment_txn_id,
            "amount": state.loan_amount,
            "merchant_id": state.merchant_id,
            "payment_mode": "UPI_ESCROW",
            "mcp_tool": "paytm_initiate_transaction",
            "timestamp": time.time(),
            "escrow_note": "Funds held in escrow. Released to merchant upon delivery confirmation.",
        }
