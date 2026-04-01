"""
Paytm MCP (Model Context Protocol) Client

Compatible with Paytm's open-source payment-mcp-server:
  https://github.com/paytm/payment-mcp-server

This client enables AI agents to interact with Paytm's Payment APIs
through structured tool calls, following the MCP specification.

In production: connects to Paytm's MCP server
In demo mode: simulates the responses with realistic data
"""

import time
import hashlib
import uuid
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class MCPToolCall:
    """Represents a single MCP tool invocation."""
    tool_name: str
    arguments: dict
    call_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    timestamp: float = field(default_factory=time.time)


@dataclass
class MCPToolResult:
    """Result from an MCP tool call."""
    call_id: str
    tool_name: str
    success: bool
    data: dict
    latency_ms: float
    error: Optional[str] = None


class PaytmMCPClient:
    """
    MCP Client for Paytm Payment APIs.

    Supported tools (matching Paytm's MCP server):
      - paytm_initiate_transaction
      - paytm_transaction_status
      - paytm_refund
      - paytm_create_subscription
      - paytm_check_balance

    In demo mode, all tools return simulated but realistic responses.
    In production, set `base_url` to the actual MCP server endpoint.
    """

    def __init__(self, merchant_id: str = "TRUSTAI_DEMO", merchant_key: str = "", base_url: str = "", demo_mode: bool = True):
        self.merchant_id = merchant_id
        self.merchant_key = merchant_key
        self.base_url = base_url
        self.demo_mode = demo_mode
        self._call_log: list[MCPToolResult] = []

    async def initiate_transaction(
        self,
        merchant_id: str,
        amount: float,
        order_id: str,
        items: list = None,
        payment_mode: str = "UPI",
        customer_id: str = "",
    ) -> dict:
        """
        MCP Tool: paytm_initiate_transaction

        Initiates a payment transaction through Paytm.
        In TrustAI's context, this pays the merchant directly (escrow pattern).
        """
        tool_call = MCPToolCall(
            tool_name="paytm_initiate_transaction",
            arguments={
                "mid": self.merchant_id,
                "order_id": order_id,
                "amount": str(amount),
                "currency": "INR",
                "payment_mode": payment_mode,
                "channel_id": "WEB",
                "industry_type": "RETAIL",
                "website": "TRUSTAI",
                "customer_id": customer_id or f"CUST_{order_id}",
                "items": items or [],
            },
        )

        if self.demo_mode:
            return await self._simulate_initiate(tool_call, merchant_id, amount, order_id)
        else:
            return await self._call_mcp_server(tool_call)

    async def check_transaction_status(self, order_id: str) -> dict:
        """MCP Tool: paytm_transaction_status"""
        tool_call = MCPToolCall(
            tool_name="paytm_transaction_status",
            arguments={"mid": self.merchant_id, "order_id": order_id},
        )

        if self.demo_mode:
            return await self._simulate_status(tool_call, order_id)
        else:
            return await self._call_mcp_server(tool_call)

    async def create_subscription(
        self,
        customer_id: str,
        plan_id: str,
        amount: float,
        frequency: str = "MONTHLY",
        max_deductions: int = 12,
    ) -> dict:
        """
        MCP Tool: paytm_create_subscription

        Sets up auto-deduction for loan repayment linked to repayment cycles.
        """
        tool_call = MCPToolCall(
            tool_name="paytm_create_subscription",
            arguments={
                "mid": self.merchant_id,
                "customer_id": customer_id,
                "plan_id": plan_id,
                "subscription_amount": str(amount),
                "frequency": frequency,
                "max_deductions": max_deductions,
                "grace_period": "7",
            },
        )

        if self.demo_mode:
            return await self._simulate_subscription(tool_call, customer_id, amount)
        else:
            return await self._call_mcp_server(tool_call)

    async def check_balance(self, customer_id: str) -> dict:
        """MCP Tool: paytm_check_balance"""
        tool_call = MCPToolCall(
            tool_name="paytm_check_balance",
            arguments={"mid": self.merchant_id, "customer_id": customer_id},
        )

        if self.demo_mode:
            import random
            result = MCPToolResult(
                call_id=tool_call.call_id,
                tool_name=tool_call.tool_name,
                success=True,
                data={
                    "balance": round(random.uniform(500, 25000), 2),
                    "currency": "INR",
                    "wallet_type": "PAYTM_WALLET",
                    "last_updated": time.time(),
                },
                latency_ms=45.0,
            )
            self._call_log.append(result)
            return result.data
        else:
            return await self._call_mcp_server(tool_call)

    # --- Simulation methods for demo ---

    async def _simulate_initiate(self, tool_call: MCPToolCall, merchant_id: str, amount: float, order_id: str) -> dict:
        start = time.time()

        txn_hash = hashlib.sha256(
            f"{order_id}{merchant_id}{amount}{time.time()}".encode()
        ).hexdigest()[:16]

        txn_id = f"PTM{txn_hash.upper()}"

        data = {
            "status": "TXN_SUCCESS",
            "txn_id": txn_id,
            "order_id": order_id,
            "amount": str(amount),
            "currency": "INR",
            "payment_mode": tool_call.arguments.get("payment_mode", "UPI"),
            "gateway": "PAYTM_UPI",
            "bank_name": "State Bank of India",
            "merchant_id": merchant_id,
            "mid": self.merchant_id,
            "response_code": "01",
            "response_message": "Transaction Successful",
            "txn_date": time.strftime("%Y-%m-%d %H:%M:%S"),
            "escrow": {
                "held": True,
                "release_condition": "delivery_confirmation",
                "auto_release_hours": 48,
            },
        }

        latency = (time.time() - start) * 1000 + 120  # Simulate network latency
        result = MCPToolResult(
            call_id=tool_call.call_id,
            tool_name=tool_call.tool_name,
            success=True,
            data=data,
            latency_ms=latency,
        )
        self._call_log.append(result)

        return {
            "status": "success",
            "txn_id": txn_id,
            "amount": amount,
            "merchant_id": merchant_id,
            "payment_mode": "UPI_ESCROW",
            "mcp_tool": "paytm_initiate_transaction",
            "mcp_call_id": tool_call.call_id,
            "gateway_response": data,
            "timestamp": time.time(),
        }

    async def _simulate_status(self, tool_call: MCPToolCall, order_id: str) -> dict:
        data = {
            "status": "TXN_SUCCESS",
            "order_id": order_id,
            "result_code": "01",
            "result_msg": "Transaction fetched successfully",
        }
        result = MCPToolResult(
            call_id=tool_call.call_id,
            tool_name=tool_call.tool_name,
            success=True,
            data=data,
            latency_ms=85.0,
        )
        self._call_log.append(result)
        return data

    async def _simulate_subscription(self, tool_call: MCPToolCall, customer_id: str, amount: float) -> dict:
        sub_id = f"SUB_{hashlib.md5(customer_id.encode()).hexdigest()[:8].upper()}"
        data = {
            "status": "ACTIVE",
            "subscription_id": sub_id,
            "customer_id": customer_id,
            "amount": str(amount),
            "frequency": tool_call.arguments.get("frequency", "MONTHLY"),
            "next_deduction_date": "auto_on_next_cycle",
            "mandate_type": "UPI_AUTOPAY",
        }
        result = MCPToolResult(
            call_id=tool_call.call_id,
            tool_name=tool_call.tool_name,
            success=True,
            data=data,
            latency_ms=200.0,
        )
        self._call_log.append(result)
        return data

    async def _call_mcp_server(self, tool_call: MCPToolCall) -> dict:
        """
        Production MCP call — sends tool invocation to Paytm's MCP server.

        In production, this would:
          1. Connect to the MCP server at self.base_url
          2. Send the tool_call as a JSON-RPC request
          3. Return the parsed response

        For the hackathon, this falls back to simulation.
        """
        # TODO: Implement actual MCP server connection
        # import httpx
        # async with httpx.AsyncClient() as client:
        #     response = await client.post(
        #         f"{self.base_url}/tools/{tool_call.tool_name}",
        #         json=tool_call.arguments,
        #         headers={"Authorization": f"Bearer {self.merchant_key}"}
        #     )
        #     return response.json()

        # Fallback to simulation for hackathon
        return {"status": "demo_mode", "tool": tool_call.tool_name, "note": "Connect MCP server for production"}

    def get_call_log(self) -> list:
        """Returns all MCP tool calls made in this session."""
        return [
            {
                "call_id": r.call_id,
                "tool": r.tool_name,
                "success": r.success,
                "latency_ms": r.latency_ms,
            }
            for r in self._call_log
        ]
