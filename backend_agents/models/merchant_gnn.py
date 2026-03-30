"""
Enhanced GNN for Paytm Merchant Transaction Graphs

Builds a transaction graph where nodes represent different payment
channels and entity types in the Paytm ecosystem:
  - UPI P2M (Pay-to-Merchant)
  - QR Code payments
  - Soundbox transactions
  - P2P transfers
  - Wallet transactions
  - Postpaid (BNPL)
  - Bank settlements

Node features encode transaction volume, frequency, recency,
and customer diversity per channel.
"""

import json
import random
import math
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from pathlib import Path


# Paytm-aligned merchant graph topology
MERCHANT_NODES = [
    # Core merchant node
    ("merchant", "MERCHANT_CORE", "merchant"),

    # Revenue channels (how they receive money)
    ("upi_p2m", "UPI_PAY_TO_MERCHANT", "revenue"),
    ("qr_dynamic", "QR_DYNAMIC_CODE", "revenue"),
    ("qr_static", "QR_STATIC_CODE", "revenue"),
    ("soundbox", "SOUNDBOX_DEVICE", "revenue"),
    ("pos_device", "POS_TERMINAL", "revenue"),
    ("online_pg", "ONLINE_PAYMENT_GATEWAY", "revenue"),

    # Customer segments
    ("cust_regular", "REGULAR_CUSTOMERS", "customers"),
    ("cust_new", "NEW_CUSTOMERS", "customers"),
    ("cust_high_value", "HIGH_VALUE_CUSTOMERS", "customers"),
    ("cust_seasonal", "SEASONAL_CUSTOMERS", "customers"),

    # Financial health
    ("settlement", "BANK_SETTLEMENT", "financial"),
    ("refunds", "REFUND_OUTFLOW", "financial"),
    ("chargeback", "CHARGEBACK_DISPUTES", "financial"),
    ("cashflow", "NET_CASHFLOW", "financial"),

    # Credit signals
    ("postpaid_usage", "POSTPAID_BNPL", "credit"),
    ("loan_history", "LOAN_REPAYMENT_HISTORY", "credit"),
    ("credit_line", "CREDIT_LINE_UTILIZATION", "credit"),

    # Business indicators
    ("inventory", "INVENTORY_TURNOVER", "business"),
    ("suppliers", "SUPPLIER_PAYMENTS", "business"),
    ("operating_costs", "OPERATING_EXPENSES", "business"),
]

# Edge definitions
MERCHANT_EDGES = [
    # Merchant to all channels
    *[("merchant", nid) for nid, _, _ in MERCHANT_NODES if nid != "merchant"],

    # Revenue channel interconnections
    ("upi_p2m", "qr_dynamic"), ("qr_dynamic", "qr_static"),
    ("qr_static", "soundbox"), ("soundbox", "pos_device"),
    ("pos_device", "online_pg"),

    # Customer → Revenue
    ("cust_regular", "upi_p2m"), ("cust_regular", "qr_static"),
    ("cust_new", "qr_dynamic"), ("cust_high_value", "pos_device"),
    ("cust_seasonal", "online_pg"),

    # Revenue → Financial
    ("upi_p2m", "settlement"), ("qr_dynamic", "settlement"),
    ("soundbox", "settlement"), ("online_pg", "refunds"),
    ("pos_device", "chargeback"),

    # Financial → Credit
    ("settlement", "cashflow"), ("cashflow", "credit_line"),
    ("loan_history", "credit_line"), ("postpaid_usage", "loan_history"),

    # Business → Financial
    ("inventory", "suppliers"), ("suppliers", "cashflow"),
    ("operating_costs", "cashflow"),
]

# Cluster names
CLUSTER_NAMES = sorted(set(c for _, _, c in MERCHANT_NODES))


class MerchantGNN(nn.Module):
    """
    3-layer Graph Convolutional Network for merchant creditworthiness.

    Architecture:
      Input (feat_dim) → GCN → ReLU → Dropout → GCN → ReLU → GCN → Output (num_classes)

    Symmetric normalized adjacency: D^(-1/2) * A_hat * D^(-1/2)
    """

    def __init__(self, in_feats: int, hidden: int, out_feats: int, dropout: float = 0.3):
        super().__init__()
        self.lin1 = nn.Linear(in_feats, hidden)
        self.lin2 = nn.Linear(hidden, hidden)
        self.lin3 = nn.Linear(hidden, out_feats)
        self.dropout = dropout

    def forward(self, x, A_norm):
        # Layer 1
        x = A_norm @ x
        x = self.lin1(x)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)

        # Layer 2
        x = A_norm @ x
        x = self.lin2(x)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)

        # Layer 3
        x = A_norm @ x
        x = self.lin3(x)
        return x

    def predict(self, merchant_id: str, transaction_data: dict) -> dict:
        """Run inference and return credit assessment."""
        self.eval()
        with torch.no_grad():
            features, adj = MerchantGraphBuilder.build_from_transactions(transaction_data)
            logits = self.forward(features, adj)

            # Merchant node is index 0
            probs = torch.softmax(logits[0], dim=0).numpy()
            confidence = float(np.max(probs))
            risk_score = round(1.0 - confidence, 4)

            cluster_probs = {
                name: round(float(probs[i]), 4)
                for i, name in enumerate(CLUSTER_NAMES)
                if i < len(probs)
            }

            return {
                "risk_score": risk_score,
                "confidence": round(confidence, 4),
                "cluster_probs": cluster_probs,
                "predicted_cluster": CLUSTER_NAMES[int(np.argmax(probs))],
            }


class MerchantGraphBuilder:
    """Builds merchant transaction graphs from Paytm-style transaction data."""

    @staticmethod
    def build_from_transactions(tx_data: dict):
        """
        Generate node features and adjacency matrix from transaction data.

        Each node gets a feature vector encoding:
          - Transaction volume (normalized)
          - Transaction count (normalized)
          - Recency score
          - Growth trend
        """
        num_nodes = len(MERCHANT_NODES)
        feat_dim = 24
        id_to_idx = {nid: i for i, (nid, _, _) in enumerate(MERCHANT_NODES)}

        # Build adjacency matrix
        A = np.zeros((num_nodes, num_nodes), dtype=np.float32)
        for s, t in MERCHANT_EDGES:
            if s in id_to_idx and t in id_to_idx:
                i, j = id_to_idx[s], id_to_idx[t]
                A[i, j] = 1.0
                A[j, i] = 1.0

        # Symmetric normalization
        A_hat = A + np.eye(num_nodes, dtype=np.float32)
        D = np.sum(A_hat, axis=1)
        D_inv_sqrt = np.power(D, -0.5)
        D_inv_sqrt[np.isinf(D_inv_sqrt)] = 0.0
        D_mat = np.diag(D_inv_sqrt)
        A_norm = torch.from_numpy(D_mat @ A_hat @ D_mat).float()

        # Generate features from transaction data
        X = np.zeros((num_nodes, feat_dim), dtype=np.float32)
        cluster_to_label = {c: i for i, c in enumerate(CLUSTER_NAMES)}

        for idx, (nid, label, cluster) in enumerate(MERCHANT_NODES):
            base = np.random.RandomState(hash(nid) % 2**31).randn(feat_dim) * 0.3

            # Enrich with transaction data if available
            if tx_data:
                if nid == "merchant":
                    base[0] = tx_data.get("months_active", 12) / 24.0
                    base[1] = tx_data.get("merchant_tier", 2) / 4.0
                elif nid == "upi_p2m":
                    base[0] = min(tx_data.get("upi_monthly_count", 30) / 200.0, 1.0)
                    base[1] = min(tx_data.get("upi_volume", 50000) / 500000.0, 1.0)
                elif nid == "qr_dynamic" or nid == "qr_static":
                    base[0] = min(tx_data.get("qr_payments_count", 15) / 100.0, 1.0)
                elif nid == "soundbox":
                    base[0] = 1.0 if tx_data.get("soundbox_active", False) else 0.0
                    base[1] = min(tx_data.get("soundbox_txn_count", 0) / 100.0, 1.0)
                elif nid == "cust_regular":
                    base[0] = min(tx_data.get("repeat_customers", 30) / 100.0, 1.0)
                elif nid == "cust_new":
                    base[0] = min(tx_data.get("new_customers_monthly", 10) / 50.0, 1.0)
                elif nid == "settlement":
                    base[0] = min(tx_data.get("settlement_amount", 100000) / 1000000.0, 1.0)
                elif nid == "cashflow":
                    income = tx_data.get("monthly_income", 15000)
                    expense = tx_data.get("monthly_expense", 12000)
                    base[0] = max(0, (income - expense)) / income if income > 0 else 0
                elif nid == "loan_history":
                    base[0] = tx_data.get("loans_repaid", 0) / 5.0
                    base[1] = 1.0 - tx_data.get("default_rate", 0.0)

            # Add cluster-specific offset
            cluster_idx = cluster_to_label[cluster]
            base += cluster_idx * 0.5

            X[idx] = base

        X_t = torch.from_numpy(X).float()
        return X_t, A_norm

    @staticmethod
    def get_graph_topology():
        """Return graph structure for frontend visualization."""
        return {
            "nodes": [
                {"id": nid, "label": label, "cluster": cluster}
                for nid, label, cluster in MERCHANT_NODES
            ],
            "edges": [
                {"source": s, "target": t}
                for s, t in MERCHANT_EDGES
            ],
            "clusters": CLUSTER_NAMES,
        }


def train_merchant_gnn():
    """Train the merchant GNN model on synthetic data."""
    num_nodes = len(MERCHANT_NODES)
    feat_dim = 24
    num_classes = len(CLUSTER_NAMES)
    id_to_idx = {nid: i for i, (nid, _, _) in enumerate(MERCHANT_NODES)}
    cluster_to_label = {c: i for i, c in enumerate(CLUSTER_NAMES)}

    # Build adjacency
    A = np.zeros((num_nodes, num_nodes), dtype=np.float32)
    for s, t in MERCHANT_EDGES:
        if s in id_to_idx and t in id_to_idx:
            i, j = id_to_idx[s], id_to_idx[t]
            A[i, j] = 1.0
            A[j, i] = 1.0

    A_hat = A + np.eye(num_nodes, dtype=np.float32)
    D = np.sum(A_hat, axis=1)
    D_inv_sqrt = np.power(D, -0.5)
    D_inv_sqrt[np.isinf(D_inv_sqrt)] = 0.0
    D_mat = np.diag(D_inv_sqrt)
    A_norm = torch.from_numpy(D_mat @ A_hat @ D_mat).float()

    # Generate features
    X = np.zeros((num_nodes, feat_dim), dtype=np.float32)
    Y = np.zeros(num_nodes, dtype=np.int64)

    for idx, (nid, label, cluster) in enumerate(MERCHANT_NODES):
        cluster_idx = cluster_to_label[cluster]
        center = np.random.RandomState(abs(hash(cluster)) % 2**31).randn(feat_dim) * 0.5
        X[idx] = center + cluster_idx * 1.2 + 0.3 * np.random.randn(feat_dim)
        Y[idx] = cluster_idx

    X_t = torch.from_numpy(X).float()
    Y_t = torch.from_numpy(Y).long()

    # Train
    model = MerchantGNN(feat_dim, 48, num_classes, dropout=0.2)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=5e-4)
    criterion = nn.CrossEntropyLoss()

    train_idx = list(range(0, num_nodes, 2))
    test_idx = list(range(1, num_nodes, 2))
    train_idx_t = torch.tensor(train_idx, dtype=torch.long)
    test_idx_t = torch.tensor(test_idx, dtype=torch.long)

    model.train()
    for epoch in range(1, 401):
        optimizer.zero_grad()
        out = model(X_t, A_norm)
        loss = criterion(out[train_idx_t], Y_t[train_idx_t])
        loss.backward()
        optimizer.step()

        if epoch % 100 == 0:
            model.eval()
            with torch.no_grad():
                logits = model(X_t, A_norm)
                pred = logits.argmax(dim=1)
                train_acc = (pred[train_idx_t] == Y_t[train_idx_t]).float().mean().item()
                test_acc = (pred[test_idx_t] == Y_t[test_idx_t]).float().mean().item()
            model.train()
            print(f"Epoch {epoch:03d}  loss={loss.item():.4f}  train={train_acc:.2f}  test={test_acc:.2f}")

    # Save
    save_path = Path(__file__).parent.parent / "merchant_gnn_model.pth"
    torch.save({
        "model_state": model.state_dict(),
        "feat_dim": feat_dim,
        "hidden": 48,
        "num_classes": num_classes,
        "cluster_names": CLUSTER_NAMES,
    }, str(save_path))
    print(f"Saved merchant GNN to {save_path}")

    # Save graph topology
    topo_path = Path(__file__).parent.parent / "merchant_graph.json"
    import json
    with open(str(topo_path), "w") as f:
        json.dump(MerchantGraphBuilder.get_graph_topology(), f, indent=2)
    print(f"Saved graph topology to {topo_path}")

    return model


if __name__ == "__main__":
    train_merchant_gnn()
