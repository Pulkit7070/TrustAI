"""
TrustAI Backend — Entry Point

Start the server:
  cd backend_agents
  python main.py

Or with uvicorn directly:
  cd backend_agents
  uvicorn api:app --reload --host 0.0.0.0 --port 8000
"""

import uvicorn

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  TrustAI Swarm Engine v2.0.0")
    print("  Built on Paytm MCP Server & Prism Architecture")
    print("=" * 60)
    print("\n  Endpoints:")
    print("    POST /swarm/run       — Full swarm pipeline")
    print("    POST /swarm/analyze   — Credit analysis only")
    print("    GET  /swarm/health    — System health")
    print("    GET  /graph/topology  — Merchant graph")
    print("    POST /mcp/transaction — Paytm MCP payment")
    print("    GET  /mcp/status/{id} — Transaction status")
    print(f"\n  Server: http://localhost:8000")
    print(f"  Docs:   http://localhost:8000/docs")
    print("=" * 60 + "\n")

    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
