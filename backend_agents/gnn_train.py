"""
Simple GCN training on synthetic graph that mirrors the frontend CreditMesh clusters.
- Produces a node-level multi-class classification (cluster label prediction).
- Uses a tiny 2-layer GCN implemented with PyTorch (no PyG dependency).

Run: python gnn_train.py
Requires: torch
"""

import json
import random
import math
from typing import List, Dict

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

# ------------------------
# Graph / node definitions (match CreditMesh clusters)
# ------------------------
NODES = [
    # USER_CORE
    ("user", "USER_CORE", "user"),

    # Income cluster
    ("income_gig", "GIG_PLATFORM", "income"),
    ("income_employer", "EMPLOYER_NODE", "income"),
    ("income_salary", "SALARY_SOURCE", "income"),
    ("income_freelance", "FREELANCE_CLIENT", "income"),
    ("income_recurring", "RECURRING_INCOME_SOURCE", "income"),

    # Obligation cluster
    ("obl_landlord", "LANDLORD_NODE", "obligation"),
    ("obl_utility", "UTILITY_PROVIDER", "obligation"),
    ("obl_emi", "EMI_PROVIDER", "obligation"),
    ("obl_insurance", "INSURANCE_PROVIDER", "obligation"),
    ("obl_subs", "SUBSCRIPTION_PROVIDER", "obligation"),

    # Spending cluster
    ("spend_grocery", "GROCERY_MERCHANT", "spending"),
    ("spend_ecom", "E_COMMERCE", "spending"),
    ("spend_fuel", "FUEL_STATION", "spending"),
    ("spend_disc", "DISCRETIONARY_SPENDING", "spending"),
    ("spend_highvol", "HIGH_VOLATILITY_MERCHANT", "spending"),

    # Savings cluster
    ("save_account", "SAVINGS_ACCOUNT", "savings"),
    ("save_rd", "RECURRING_DEPOSIT", "savings"),
    ("save_micro", "MICRO_INVESTMENT", "savings"),
    ("save_gold", "GOLD_SAVINGS", "savings"),
    ("save_emergency", "EMERGENCY_FUND", "savings"),

    # Peer network
    ("peer_in", "P2P_TRANSFER_IN", "peer"),
    ("peer_out", "P2P_TRANSFER_OUT", "peer"),
    ("peer_family", "FAMILY_SUPPORT_NODE", "peer"),
    ("peer_loan_from", "LOAN_FROM_PEER", "peer"),
    ("peer_loan_to", "LOAN_TO_PEER", "peer"),
]

# create mapping
id_to_idx = {nid: i for i, (nid, _, _) in enumerate(NODES)}
cluster_names = list(sorted({c for (_, _, c) in NODES}))
cluster_to_label = {c: i for i, c in enumerate(cluster_names)}

# Edges (same topology as front-end visualization)
EDGES = [
    # user -> every node (hub)
    *[("user", nid) for nid, _, _ in NODES if nid != "user"],

    # intra-cluster chains (income)
    ("income_gig", "income_employer"), ("income_employer", "income_salary"),
    ("income_salary", "income_freelance"), ("income_freelance", "income_recurring"),

    # obligations
    ("obl_landlord", "obl_utility"), ("obl_utility", "obl_emi"), ("obl_emi", "obl_insurance"), ("obl_insurance", "obl_subs"),

    # spending
    ("spend_grocery", "spend_ecom"), ("spend_ecom", "spend_fuel"), ("spend_fuel", "spend_disc"), ("spend_disc", "spend_highvol"),

    # savings
    ("save_account", "save_rd"), ("save_rd", "save_micro"), ("save_micro", "save_gold"), ("save_gold", "save_emergency"),

    # peer
    ("peer_in", "peer_out"), ("peer_out", "peer_family"), ("peer_family", "peer_loan_from"), ("peer_loan_from", "peer_loan_to"),

    # cross-cluster
    ("income_salary", "save_account"), ("income_salary", "spend_grocery"), ("spend_ecom", "peer_out"), ("obl_emi", "save_rd"),
]

# make undirected adjacency
num_nodes = len(NODES)
A = np.zeros((num_nodes, num_nodes), dtype=np.float32)
for s, t in EDGES:
    i, j = id_to_idx[s], id_to_idx[t]
    A[i, j] = 1.0
    A[j, i] = 1.0

# ------------------------
# Synthetic node features & labels
# ------------------------
feat_dim = 16
X = np.zeros((num_nodes, feat_dim), dtype=np.float32)
Y = np.zeros(num_nodes, dtype=np.int64)

# cluster-specific feature centers (separate clusters in feature space)
cluster_center = {
    c: (np.random.RandomState(abs(hash(c)) % 2**32).randn(feat_dim) * 0.6 + (i * 1.5))
    for i, c in enumerate(cluster_names)
}

for idx, (nid, label_text, cluster) in enumerate(NODES):
    # sample features around cluster center
    center = cluster_center[cluster]
    X[idx] = center + 0.3 * np.random.randn(feat_dim)
    Y[idx] = cluster_to_label[cluster]

# Save synthetic graph for inspection (optional)
synthetic = {
    "nodes": [{"id": nid, "label": label_text, "cluster": cluster} for nid, label_text, cluster in NODES],
    "edges": [{"source": s, "target": t} for s, t in EDGES],
}
with open("backend_agents/synthetic_graph.json", "w", encoding="utf-8") as fh:
    json.dump(synthetic, fh, indent=2)

# ------------------------
# Simple GCN (no PyG)
# ------------------------

def normalize_adj(adj: np.ndarray) -> torch.Tensor:
    # A_hat = A + I
    A_hat = adj + np.eye(adj.shape[0], dtype=adj.dtype)
    D = np.sum(A_hat, axis=1)
    D_inv_sqrt = np.power(D, -0.5)
    D_inv_sqrt[np.isinf(D_inv_sqrt)] = 0.0
    D_mat = np.diag(D_inv_sqrt)
    return torch.from_numpy(D_mat @ A_hat @ D_mat).float()

A_norm = normalize_adj(A)
X_t = torch.from_numpy(X)
Y_t = torch.from_numpy(Y)

class SimpleGCN(nn.Module):
    def __init__(self, in_feats, hid_feats, out_feats):
        super().__init__()
        self.lin1 = nn.Linear(in_feats, hid_feats)
        self.lin2 = nn.Linear(hid_feats, out_feats)

    def forward(self, x, A_norm):
        x = A_norm @ x
        x = self.lin1(x)
        x = F.relu(x)
        x = A_norm @ x
        x = self.lin2(x)
        return x

if __name__ == "__main__":
    # training setup
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = SimpleGCN(feat_dim, 32, len(cluster_names)).to(device)
    X_t = X_t.to(device)
    A_norm = A_norm.to(device)
    Y_t = Y_t.to(device)

    optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=5e-4)
    criterion = nn.CrossEntropyLoss()

    # small train/test split (stratified)
    train_idx = []
    test_idx = []
    for lbl in np.unique(Y):
        idxs = np.where(Y == lbl)[0].tolist()
        random.shuffle(idxs)
        split = max(1, int(0.6 * len(idxs)))
        train_idx += idxs[:split]
        test_idx += idxs[split:]
    train_idx = torch.tensor(train_idx, dtype=torch.long)
    test_idx = torch.tensor(test_idx, dtype=torch.long)

    # training loop
    model.train()
    for epoch in range(1, 301):
        optimizer.zero_grad()
        out = model(X_t, A_norm)
        loss = criterion(out[train_idx], Y_t[train_idx])
        loss.backward()
        optimizer.step()

        if epoch % 50 == 0 or epoch == 1:
            model.eval()
            with torch.no_grad():
                logits = model(X_t, A_norm)
                pred = logits.argmax(dim=1)
                train_acc = (pred[train_idx] == Y_t[train_idx]).float().mean().item()
                test_acc = (pred[test_idx] == Y_t[test_idx]).float().mean().item()
            model.train()
            print(f"Epoch {epoch:03d}  loss={loss.item():.4f}  train_acc={train_acc:.2f}  test_acc={test_acc:.2f}")

    # final evaluation + save
    model.eval()
    with torch.no_grad():
        logits = model(X_t, A_norm)
        pred = logits.argmax(dim=1).cpu().numpy()

    acc = (pred == Y_t.cpu().numpy()).mean()
    print(f"\nFinal node classification accuracy (all nodes): {acc:.3f}")

    torch.save({"model_state": model.state_dict(), "cluster_map": cluster_to_label}, "backend_agents/gnn_model.pth")
    print("Saved trained model to backend_agents/gnn_model.pth and synthetic_graph.json")
