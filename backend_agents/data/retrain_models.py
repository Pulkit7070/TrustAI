#!/usr/bin/env python3
"""
retrain_models.py — Retrain GNN and TCN on merchant reference graph.

Architecture changes from v1:
  GNN: 3-layer/48-hidden => 5-layer/128-hidden with batch norm
       Fixed 21-node graph => kNN graph over 10,455 merchants
  TCN: 3-block/32-hidden => 4-block/64-hidden

Reads:
  - merchant_profiles.csv  (10,455 profiles with features + weekly time-series)

Outputs:
  - ../merchant_gnn_model.pth  (MerchantGNNLarge v2)
  - ../tcn_model.pth           (TCN with 64 hidden, 4 blocks)

Usage:
    python retrain_models.py
"""

import csv
import json
import sys
import os
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

# Add parent to path for model imports
sys.path.insert(0, str(Path(__file__).parent.parent))

DATA_DIR = Path(__file__).parent
MODEL_DIR = Path(__file__).parent.parent


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_merchant_profiles():
    """Load merchant_profiles.csv into list of dicts."""
    path = DATA_DIR / "merchant_profiles.csv"
    if not path.exists():
        print(f"[ERROR] {path} not found. Run prepare_real_data.py first.")
        sys.exit(1)

    merchants = []
    with open(str(path), "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            for key in ["monthly_income", "monthly_expense", "loan_amount",
                        "avg_ticket_size", "settlement_amount", "composite_risk_score"]:
                if key in row:
                    try:
                        row[key] = float(row[key])
                    except (ValueError, TypeError):
                        row[key] = 0.0
            for key in ["upi_monthly_count", "qr_payments_count", "soundbox_txn_count",
                        "unique_customers", "months_active", "p2p_received_monthly",
                        "p2p_sent_monthly", "current_month_count", "avg_monthly_count",
                        "repeat_customers", "new_customers_monthly", "loans_repaid",
                        "merchant_tier", "risk_label"]:
                if key in row:
                    try:
                        row[key] = int(row[key])
                    except (ValueError, TypeError):
                        row[key] = 0
            for key in ["default_rate"]:
                if key in row:
                    try:
                        row[key] = float(row[key])
                    except (ValueError, TypeError):
                        row[key] = 0.0
            for key in ["soundbox_active", "kyc_verified"]:
                if key in row:
                    row[key] = row[key].lower() in ("true", "1", "yes")
            if "weekly_data" in row:
                try:
                    row["weekly_data"] = json.loads(row["weekly_data"])
                except (json.JSONDecodeError, TypeError):
                    row["weekly_data"] = []
            merchants.append(row)

    print(f"[OK] Loaded {len(merchants)} merchant profiles")
    return merchants


# ---------------------------------------------------------------------------
# Feature extraction (mirrors merchant_gnn.extract_merchant_features)
# ---------------------------------------------------------------------------

def extract_features(m: dict) -> np.ndarray:
    """24-dim feature vector from merchant profile."""
    income = m.get("monthly_income", 15000)
    expense = m.get("monthly_expense", 12000)

    features = [
        income / 100000,
        expense / 100000,
        (income - expense) / max(income, 1),
        m.get("loan_amount", 0) / 500000,
        m.get("default_rate", 0),
        m.get("loans_repaid", 0) / 10,
        m.get("settlement_amount", 0) / 500000,
        m.get("merchant_tier", 1) / 4,
        m.get("upi_monthly_count", 0) / 200,
        m.get("qr_payments_count", 0) / 100,
        1.0 if m.get("soundbox_active", False) else 0.0,
        m.get("soundbox_txn_count", 0) / 100,
        m.get("avg_ticket_size", 0) / 5000,
        m.get("unique_customers", 0) / 200,
        m.get("repeat_customers", 0) / 100,
        m.get("new_customers_monthly", 0) / 50,
        m.get("months_active", 0) / 60,
        1.0 if m.get("kyc_verified", True) else 0.0,
        m.get("p2p_received_monthly", 0) / max(income, 1),
        m.get("p2p_sent_monthly", 0) / max(income, 1),
        m.get("current_month_count", 0) / max(m.get("avg_monthly_count", 1), 1),
        m.get("loan_amount", 0) / max(income * 12, 1),
        m.get("composite_risk_score", 0.5),
        0.0,
    ]
    return np.array(features[:24], dtype=np.float32)


def extract_tcn_input(merchant: dict) -> np.ndarray:
    """TCN input: (3 channels x 12 timesteps) from weekly data."""
    weekly = merchant.get("weekly_data", [])
    if not weekly or len(weekly) < 4:
        return None

    while len(weekly) < 12:
        weekly = [weekly[0]] + weekly
    weekly = weekly[-12:]

    income = np.array([w.get("income", 4000) for w in weekly], dtype=np.float32)
    spending = np.array([w.get("spending", 3800) for w in weekly], dtype=np.float32)
    savings = np.array([w.get("savings", 200) for w in weekly], dtype=np.float32)

    def znorm(arr):
        m, s = arr.mean(), arr.std() + 1e-6
        return (arr - m) / s

    return np.stack([znorm(income), znorm(spending), znorm(savings)])


# ---------------------------------------------------------------------------
# kNN Graph Construction
# ---------------------------------------------------------------------------

def build_knn_adjacency(features: np.ndarray, k: int = 16) -> np.ndarray:
    """
    Build kNN graph from merchant feature matrix.

    For each merchant, connects to k most similar merchants (cosine similarity).
    This creates a real graph structure that the GNN can learn from.
    """
    n = features.shape[0]
    print(f"  Building kNN graph: {n} nodes, k={k}...")

    # L2-normalize
    norms = np.linalg.norm(features, axis=1, keepdims=True)
    norms = np.maximum(norms, 1e-8)
    normed = features / norms

    # Dense cosine similarity (N x N)
    # Process in chunks to manage memory
    A = np.zeros((n, n), dtype=np.float32)
    chunk_size = 1000
    for start in range(0, n, chunk_size):
        end = min(start + chunk_size, n)
        chunk_sims = normed[start:end] @ normed.T  # (chunk, N)
        # Zero out self-similarity
        for i in range(start, end):
            chunk_sims[i - start, i] = 0.0
        # Top-k per row
        for i in range(end - start):
            row = chunk_sims[i]
            top_k_idx = np.argpartition(row, -k)[-k:]
            for j in top_k_idx:
                w = max(float(row[j]), 0.0)
                if w > 0:
                    A[start + i, j] = w
                    A[j, start + i] = w  # symmetric

        if (start // chunk_size) % 3 == 0:
            print(f"    ... processed {end}/{n} nodes")

    edge_count = (A > 0).sum() // 2
    avg_degree = (A > 0).sum(axis=1).mean()
    print(f"  kNN graph built: {edge_count} edges, avg degree={avg_degree:.1f}")
    return A


def normalize_adj(A: np.ndarray) -> torch.Tensor:
    """Symmetric normalization: D^(-1/2) * (A + I) * D^(-1/2)."""
    n = A.shape[0]
    A_hat = A + np.eye(n, dtype=A.dtype)
    D = np.sum(A_hat, axis=1)
    D_inv_sqrt = np.power(D, -0.5)
    D_inv_sqrt[np.isinf(D_inv_sqrt)] = 0.0
    D_mat = np.diag(D_inv_sqrt)
    return torch.from_numpy(D_mat @ A_hat @ D_mat).float()


# ---------------------------------------------------------------------------
# GNN: 5-layer GCN with batch norm (MerchantGNNLarge architecture)
# ---------------------------------------------------------------------------

class MerchantGCN(nn.Module):
    """Matches MerchantGNNLarge architecture for training."""

    def __init__(self, in_feats=24, hidden=128, num_classes=4, num_layers=5, dropout=0.3):
        super().__init__()
        self.num_layers = num_layers
        self.convs = nn.ModuleList()
        self.bns = nn.ModuleList()

        self.convs.append(nn.Linear(in_feats, hidden))
        self.bns.append(nn.BatchNorm1d(hidden))

        for _ in range(num_layers - 2):
            self.convs.append(nn.Linear(hidden, hidden))
            self.bns.append(nn.BatchNorm1d(hidden))

        self.convs.append(nn.Linear(hidden, num_classes))
        self.dropout = dropout

    def forward(self, x, A_norm):
        for i in range(self.num_layers):
            x = A_norm @ x
            x = self.convs[i](x)
            if i < self.num_layers - 1:
                x = self.bns[i](x)
                x = F.relu(x)
                x = F.dropout(x, p=self.dropout, training=self.training)
        return x


# ---------------------------------------------------------------------------
# TCN: 4-block with 64 hidden
# ---------------------------------------------------------------------------

class CausalConv1d(nn.Module):
    def __init__(self, in_ch, out_ch, kernel_size, dilation=1):
        super().__init__()
        self.padding = (kernel_size - 1) * dilation
        self.conv = nn.Conv1d(in_ch, out_ch, kernel_size,
                              padding=self.padding, dilation=dilation)

    def forward(self, x):
        out = self.conv(x)
        if self.padding > 0:
            out = out[:, :, :-self.padding]
        return out


class TCNBlock(nn.Module):
    def __init__(self, in_ch, out_ch, kernel_size, dilation):
        super().__init__()
        self.conv1 = CausalConv1d(in_ch, out_ch, kernel_size, dilation)
        self.conv2 = CausalConv1d(out_ch, out_ch, kernel_size, dilation)
        self.bn1 = nn.BatchNorm1d(out_ch)
        self.bn2 = nn.BatchNorm1d(out_ch)
        self.dropout = nn.Dropout(0.2)
        self.residual = nn.Conv1d(in_ch, out_ch, 1) if in_ch != out_ch else nn.Identity()

    def forward(self, x):
        res = self.residual(x)
        out = self.dropout(F.relu(self.bn1(self.conv1(x))))
        out = self.dropout(F.relu(self.bn2(self.conv2(out))))
        return F.relu(out + res)


class TCNModel(nn.Module):
    def __init__(self, input_channels=3, hidden=64, num_blocks=4):
        super().__init__()
        layers = []
        ch = input_channels
        for i in range(num_blocks):
            layers.append(TCNBlock(ch, hidden, kernel_size=3, dilation=2 ** i))
            ch = hidden
        self.tcn = nn.Sequential(*layers)
        self.fc = nn.Sequential(
            nn.Linear(hidden, 32),
            nn.ReLU(),
            nn.Dropout(0.15),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        out = self.tcn(x)
        out = out.mean(dim=2)
        return self.fc(out)


# ---------------------------------------------------------------------------
# GNN Training
# ---------------------------------------------------------------------------

def train_gnn(merchants):
    """Train GNN on kNN merchant graph."""
    print("\n" + "=" * 60)
    print("TRAINING GNN (5-layer GCN, 128 hidden, kNN graph)")
    print("=" * 60)

    # Feature matrix
    X = np.stack([extract_features(m) for m in merchants])
    Y = np.array([m["risk_label"] for m in merchants], dtype=np.int64)

    n = len(merchants)
    feat_dim = X.shape[1]
    num_classes = len(set(Y))

    print(f"  Nodes: {n}, Features: {feat_dim}, Classes: {num_classes}")
    print(f"  Label distribution: {dict(zip(*np.unique(Y, return_counts=True)))}")

    # Build kNN graph (k=16 neighbors per merchant)
    A = build_knn_adjacency(X, k=16)
    A_norm = normalize_adj(A)

    X_t = torch.from_numpy(X)
    Y_t = torch.from_numpy(Y)

    # Stratified train/test split
    train_idx, test_idx = [], []
    for lbl in np.unique(Y):
        idxs = np.where(Y == lbl)[0].tolist()
        np.random.shuffle(idxs)
        split = max(1, int(0.7 * len(idxs)))
        train_idx += idxs[:split]
        test_idx += idxs[split:]

    train_idx_t = torch.tensor(train_idx, dtype=torch.long)
    test_idx_t = torch.tensor(test_idx, dtype=torch.long)

    print(f"  Train: {len(train_idx)}, Test: {len(test_idx)}")

    # Model
    model = MerchantGCN(
        in_feats=feat_dim,
        hidden=128,
        num_classes=num_classes,
        num_layers=5,
        dropout=0.3,
    )
    param_count = sum(p.numel() for p in model.parameters())
    print(f"  Model parameters: {param_count:,}")

    optimizer = torch.optim.Adam(model.parameters(), lr=0.005, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=100, gamma=0.5)
    criterion = nn.CrossEntropyLoss()

    # Training loop
    model.train()
    best_test_acc = 0.0

    for epoch in range(1, 401):
        optimizer.zero_grad()
        out = model(X_t, A_norm)
        loss = criterion(out[train_idx_t], Y_t[train_idx_t])
        loss.backward()
        optimizer.step()
        scheduler.step()

        if epoch % 50 == 0 or epoch == 1:
            model.eval()
            with torch.no_grad():
                logits = model(X_t, A_norm)
                pred = logits.argmax(dim=1)
                train_acc = (pred[train_idx_t] == Y_t[train_idx_t]).float().mean().item()
                test_acc = (pred[test_idx_t] == Y_t[test_idx_t]).float().mean().item()
                best_test_acc = max(best_test_acc, test_acc)
            model.train()
            lr = optimizer.param_groups[0]["lr"]
            print(f"  Epoch {epoch:03d}  loss={loss.item():.4f}  "
                  f"train={train_acc:.3f}  test={test_acc:.3f}  lr={lr:.5f}")

    # Save with version marker
    save_path = MODEL_DIR / "merchant_gnn_model.pth"
    torch.save({
        "model_state": model.state_dict(),
        "feat_dim": feat_dim,
        "hidden": 128,
        "num_classes": num_classes,
        "num_layers": 5,
        "version": 2,
        "n_train_merchants": n,
        "knn_k": 16,
        "best_test_acc": best_test_acc,
    }, str(save_path))
    print(f"\n  [OK] Saved GNN model to {save_path}")
    print(f"  Parameters: {param_count:,}, Best test accuracy: {best_test_acc:.3f}")

    return model


# ---------------------------------------------------------------------------
# TCN Training
# ---------------------------------------------------------------------------

def train_tcn(merchants):
    """Train TCN on merchant weekly time-series."""
    print("\n" + "=" * 60)
    print("TRAINING TCN (4-block, 64 hidden)")
    print("=" * 60)

    X_list, Y_list = [], []
    for m in merchants:
        x = extract_tcn_input(m)
        if x is None:
            continue
        X_list.append(x)

        weekly = m.get("weekly_data", [])
        if weekly:
            incomes = [w.get("income", 4000) for w in weekly]
            savings = [w.get("savings", 200) for w in weekly]
            income_cv = np.std(incomes) / (np.mean(incomes) + 1e-6)
            savings_pos = sum(1 for s in savings if s > 0) / len(savings)
            stability = (1.0 - min(income_cv, 1.0)) * 0.5 + savings_pos * 0.5
        else:
            stability = 0.5
        Y_list.append(stability)

    X = np.array(X_list, dtype=np.float32)
    Y = np.array(Y_list, dtype=np.float32)

    X_t = torch.from_numpy(X)
    Y_t = torch.from_numpy(Y).unsqueeze(1)

    n = len(X)
    print(f"  Samples: {n}")
    print(f"  Input shape: {X.shape}")
    print(f"  Stability mean={Y.mean():.3f}, std={Y.std():.3f}")

    # Split
    split = int(0.8 * n)
    perm = np.random.permutation(n)
    X_t = X_t[perm]
    Y_t = Y_t[perm]
    X_train, X_test = X_t[:split], X_t[split:]
    Y_train, Y_test = Y_t[:split], Y_t[split:]

    # Model
    model = TCNModel(input_channels=3, hidden=64, num_blocks=4)
    param_count = sum(p.numel() for p in model.parameters())
    print(f"  Model parameters: {param_count:,}")

    optimizer = torch.optim.Adam(model.parameters(), lr=0.001, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=40, gamma=0.5)
    criterion = nn.MSELoss()

    model.train()
    batch_size = 64

    for epoch in range(1, 151):
        indices = torch.randperm(len(X_train))
        total_loss = 0
        n_batches = 0

        for i in range(0, len(X_train), batch_size):
            batch_idx = indices[i:i + batch_size]
            x_batch = X_train[batch_idx]
            y_batch = Y_train[batch_idx]

            optimizer.zero_grad()
            pred = model(x_batch)
            loss = criterion(pred, y_batch)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            n_batches += 1

        scheduler.step()

        if epoch % 25 == 0:
            model.eval()
            with torch.no_grad():
                test_pred = model(X_test)
                test_loss = criterion(test_pred, Y_test).item()
                mae = (test_pred - Y_test).abs().mean().item()
            model.train()
            print(f"  Epoch {epoch:03d}  train_loss={total_loss/n_batches:.4f}  "
                  f"test_loss={test_loss:.4f}  MAE={mae:.4f}")

    # Save
    save_path = MODEL_DIR / "tcn_model.pth"
    torch.save({
        "model_state": model.state_dict(),
        "input_channels": 3,
        "hidden": 64,
        "num_blocks": 4,
        "version": 2,
        "n_train_samples": n,
    }, str(save_path))
    print(f"\n  [OK] Saved TCN model to {save_path}")
    print(f"  Parameters: {param_count:,}")

    return model


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("TrustAI v2 -- Model Retraining Pipeline")
    print("=" * 60)

    merchants = load_merchant_profiles()

    train_gnn(merchants)
    train_tcn(merchants)

    print("\n" + "=" * 60)
    print("RETRAINING COMPLETE")
    print("=" * 60)
    print("Models saved. Restart the API server to load new weights.")


if __name__ == "__main__":
    main()
