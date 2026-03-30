"""
Paytm MCP (Model Context Protocol) integration layer.
Enables AI agents to interact with Paytm Payment APIs via structured tool calls.
"""

from .paytm_client import PaytmMCPClient

__all__ = ["PaytmMCPClient"]
