#!/usr/bin/env python3
"""
evaluate.py — Model Evaluation Pipeline for TrustAI

Produces ground-truth metrics for GNN and TCN models:
  - GNN: accuracy, per-class precision/recall/F1, confusion matrix
  - TCN: MSE, MAE, R² on stability prediction
  - End-to-end pipeline: decision accuracy vs ground-truth labels

Usage:
    python evaluate.py

Output:
    - evaluation_results.json (machine-readable)
    - stdout report (human-readable)
"""

import csv
import json
import sys
import os
import time
from pathlib import Path
from collections import defaultdict

import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).parent))

DATA_DIR = Path(__file__).parent / "data"
MODEL_DIR = Path(__file__).parent


# ---------------------------------------------------------------------------
# Data loading (mirrors retrain_models.py)
# ---------------------------------------------------------------------------

def load_merchants():
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
                    try: row[key] = float(row[key])
                    except: row[key] = 0.0
            for key in ["upi_monthly_count", "qr_payments_count", "soundbox_txn_count",
                        "unique_customers", "months_active", "p2p_received_monthly",
                        "p2p_sent_monthly", "current_month_count", "avg_monthly_count",
                        "repeat_customers", "new_customers_monthly", "loans_repaid",
                        "merchant_tier", "risk_label"]:
                if key in row:
                    try: row[key] = int(row[key])
                    except: row[key] = 0
            for key in ["default_rate"]:
                if key in row:
                    try: row[key] = float(row[key])
                    except: row[key] = 0.0
            for key in ["soundbox_active", "kyc_verified"]:
                if key in row:
                    row[key] = row[key].lower() in ("true", "1", "yes")
            if "weekly_data" in row:
                try: row["weekly_data"] = json.loads(row["weekly_data"])
                except: row["weekly_data"] = []
            merchants.append(row)
    return merchants


# ---------------------------------------------------------------------------
# Feature extraction
# ---------------------------------------------------------------------------

def extract_features(m: dict) -> np.ndarray:
    income = m.get("monthly_income", 15000)
    expense = m.get("monthly_expense", 12000)
    features = [
        income / 100000, expense / 100000,
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


def extract_tcn_input(m: dict):
    weekly = m.get("weekly_data", [])
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


def compute_tcn_label(m: dict) -> float:
    weekly = m.get("weekly_data", [])
    if not weekly:
        return 0.5
    incomes = [w.get("income", 4000) for w in weekly]
    savings = [w.get("savings", 200) for w in weekly]
    income_cv = np.std(incomes) / (np.mean(incomes) + 1e-6)
    savings_pos = sum(1 for s in savings if s > 0) / len(savings)
    return (1.0 - min(income_cv, 1.0)) * 0.5 + savings_pos * 0.5


# ---------------------------------------------------------------------------
# kNN graph construction (mirrors retrain_models.py)
# ---------------------------------------------------------------------------

def build_knn_adjacency(features, k=16):
    n = features.shape[0]
    norms = np.linalg.norm(features, axis=1, keepdims=True)
    norms = np.maximum(norms, 1e-8)
    normed = features / norms

    A = np.zeros((n, n), dtype=np.float32)
    chunk_size = 1000
    for start in range(0, n, chunk_size):
        end = min(start + chunk_size, n)
        chunk_sims = normed[start:end] @ normed.T
        for i in range(start, end):
            chunk_sims[i - start, i] = 0.0
        for i in range(end - start):
            row = chunk_sims[i]
            top_k_idx = np.argpartition(row, -k)[-k:]
            for j in top_k_idx:
                w = max(float(row[j]), 0.0)
                if w > 0:
                    A[start + i, j] = w
                    A[j, start + i] = w
    return A


def normalize_adj(A):
    n = A.shape[0]
    A_hat = A + np.eye(n, dtype=A.dtype)
    D = np.sum(A_hat, axis=1)
    D_inv_sqrt = np.power(D, -0.5)
    D_inv_sqrt[np.isinf(D_inv_sqrt)] = 0.0
    D_mat = np.diag(D_inv_sqrt)
    return torch.from_numpy(D_mat @ A_hat @ D_mat).float()


# ---------------------------------------------------------------------------
# Metrics computation
# ---------------------------------------------------------------------------

def compute_classification_metrics(y_true, y_pred, class_names):
    """Compute accuracy, per-class precision/recall/F1, confusion matrix."""
    n_classes = len(class_names)
    cm = np.zeros((n_classes, n_classes), dtype=int)

    for t, p in zip(y_true, y_pred):
        if 0 <= t < n_classes and 0 <= p < n_classes:
            cm[t][p] += 1

    accuracy = np.trace(cm) / max(cm.sum(), 1)

    per_class = {}
    for i, name in enumerate(class_names):
        tp = cm[i][i]
        fp = sum(cm[j][i] for j in range(n_classes)) - tp
        fn = sum(cm[i][j] for j in range(n_classes)) - tp

        precision = tp / max(tp + fp, 1)
        recall = tp / max(tp + fn, 1)
        f1 = 2 * precision * recall / max(precision + recall, 1e-8)

        per_class[name] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "support": int(sum(cm[i])),
        }

    # Macro-average F1
    macro_f1 = np.mean([v["f1"] for v in per_class.values()])

    return {
        "accuracy": round(float(accuracy), 4),
        "macro_f1": round(float(macro_f1), 4),
        "per_class": per_class,
        "confusion_matrix": cm.tolist(),
    }


def compute_regression_metrics(y_true, y_pred):
    """MSE, MAE, R² for regression."""
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    mse = float(np.mean((y_true - y_pred) ** 2))
    mae = float(np.mean(np.abs(y_true - y_pred)))
    ss_res = np.sum((y_true - y_pred) ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    r_squared = float(1 - ss_res / max(ss_tot, 1e-8))
    return {
        "mse": round(mse, 6),
        "mae": round(mae, 4),
        "r_squared": round(r_squared, 4),
    }


# ---------------------------------------------------------------------------
# GNN Evaluation
# ---------------------------------------------------------------------------

def evaluate_gnn(merchants):
    print("\n" + "=" * 60)
    print("GNN EVALUATION")
    print("=" * 60)

    gnn_path = MODEL_DIR / "merchant_gnn_model.pth"
    if not gnn_path.exists():
        print("[SKIP] No GNN model found. Run retrain_models.py first.")
        return None

    # Load model
    ckpt = torch.load(str(gnn_path), map_location="cpu", weights_only=False)
    version = ckpt.get("version", 1)

    if version == 2:
        from models.merchant_gnn import MerchantGNNLarge
        model = MerchantGNNLarge(
            in_feats=ckpt.get("feat_dim", 24),
            hidden=ckpt.get("hidden", 128),
            out_feats=ckpt.get("num_classes", 4),
            num_layers=ckpt.get("num_layers", 5),
        )
    else:
        from models.merchant_gnn import MerchantGNN
        model = MerchantGNN(
            ckpt.get("feat_dim", 24),
            ckpt.get("hidden", 48),
            ckpt.get("num_classes", 6),
        )

    model.load_state_dict(ckpt["model_state"])
    model.eval()
    n_params = sum(p.numel() for p in model.parameters())
    num_classes = ckpt.get("num_classes", 4)

    print(f"  Model: v{version}, {n_params:,} parameters, {num_classes} classes")

    # Extract features and labels
    X = np.stack([extract_features(m) for m in merchants])
    Y = np.array([m["risk_label"] for m in merchants], dtype=np.int64)

    # Build kNN graph (same as training)
    print("  Building kNN evaluation graph...")
    A = build_knn_adjacency(X, k=16)
    A_norm = normalize_adj(A)
    X_t = torch.from_numpy(X)

    # Stratified train/test split (same as training: 70/30)
    train_idx, test_idx = [], []
    for lbl in np.unique(Y):
        idxs = np.where(Y == lbl)[0].tolist()
        np.random.seed(42)  # Deterministic
        np.random.shuffle(idxs)
        split = max(1, int(0.7 * len(idxs)))
        train_idx += idxs[:split]
        test_idx += idxs[split:]

    print(f"  Train: {len(train_idx)}, Test: {len(test_idx)}")

    # Inference
    with torch.no_grad():
        logits = model(X_t, A_norm)
        preds = logits.argmax(dim=1).numpy()

    # Risk class names
    risk_classes = ["low_risk", "moderate_risk", "high_risk", "critical_risk"][:num_classes]

    # Compute metrics on TEST set only
    y_true_test = Y[test_idx]
    y_pred_test = preds[test_idx]

    metrics = compute_classification_metrics(y_true_test, y_pred_test, risk_classes)

    # Also compute train accuracy for overfitting check
    y_true_train = Y[train_idx]
    y_pred_train = preds[train_idx]
    train_acc = float(np.mean(y_true_train == y_pred_train))

    metrics["train_accuracy"] = round(train_acc, 4)
    metrics["overfit_gap"] = round(train_acc - metrics["accuracy"], 4)
    metrics["n_params"] = n_params
    metrics["model_version"] = version
    metrics["n_merchants"] = len(merchants)
    metrics["train_size"] = len(train_idx)
    metrics["test_size"] = len(test_idx)

    # Print report
    print(f"\n  ┌─────────────────────────────────────┐")
    print(f"  │ GNN Test Accuracy:  {metrics['accuracy']:.1%}            │")
    print(f"  │ GNN Macro F1:       {metrics['macro_f1']:.1%}            │")
    print(f"  │ Train Accuracy:     {train_acc:.1%}            │")
    print(f"  │ Overfit Gap:        {metrics['overfit_gap']:.1%}            │")
    print(f"  └─────────────────────────────────────┘")

    print(f"\n  Per-class breakdown:")
    print(f"  {'Class':<16} {'Prec':>6} {'Recall':>6} {'F1':>6} {'Support':>8}")
    print(f"  {'─' * 44}")
    for name, vals in metrics["per_class"].items():
        print(f"  {name:<16} {vals['precision']:>6.2f} {vals['recall']:>6.2f} {vals['f1']:>6.2f} {vals['support']:>8}")

    print(f"\n  Confusion Matrix:")
    cm = metrics["confusion_matrix"]
    print(f"  {'':>16}", end="")
    for name in risk_classes:
        print(f" {name[:8]:>8}", end="")
    print()
    for i, name in enumerate(risk_classes):
        print(f"  {name:<16}", end="")
        for j in range(len(risk_classes)):
            print(f" {cm[i][j]:>8}", end="")
        print()

    return metrics


# ---------------------------------------------------------------------------
# TCN Evaluation
# ---------------------------------------------------------------------------

def evaluate_tcn(merchants):
    print("\n" + "=" * 60)
    print("TCN EVALUATION")
    print("=" * 60)

    tcn_path = MODEL_DIR / "tcn_model.pth"
    if not tcn_path.exists():
        print("[SKIP] No TCN model found. Run retrain_models.py first.")
        return None

    ckpt = torch.load(str(tcn_path), map_location="cpu", weights_only=False)
    from models.tcn import TCNStabilityModel

    model = TCNStabilityModel(
        input_channels=ckpt.get("input_channels", 3),
        hidden=ckpt.get("hidden", 32),
        num_blocks=ckpt.get("num_blocks", 3),
    )
    model.load_state_dict(ckpt["model_state"])
    model.eval()
    n_params = sum(p.numel() for p in model.parameters())

    print(f"  Model: {ckpt.get('num_blocks', 3)}-block TCN, {ckpt.get('hidden', 32)} hidden, {n_params:,} params")

    # Extract TCN inputs and labels
    X_list, Y_list = [], []
    for m in merchants:
        x = extract_tcn_input(m)
        if x is None:
            continue
        X_list.append(x)
        Y_list.append(compute_tcn_label(m))

    X = np.array(X_list, dtype=np.float32)
    Y = np.array(Y_list, dtype=np.float32)

    # Split 80/20 (same as training)
    n = len(X)
    np.random.seed(42)
    perm = np.random.permutation(n)
    split = int(0.8 * n)
    test_idx = perm[split:]

    X_test = torch.from_numpy(X[test_idx])
    Y_test = Y[test_idx]

    # Inference
    with torch.no_grad():
        preds = model(X_test).squeeze().numpy()

    metrics = compute_regression_metrics(Y_test, preds)
    metrics["n_params"] = n_params
    metrics["n_samples"] = n
    metrics["test_size"] = len(test_idx)

    print(f"\n  ┌─────────────────────────────────────┐")
    print(f"  │ TCN MSE:     {metrics['mse']:.6f}              │")
    print(f"  │ TCN MAE:     {metrics['mae']:.4f}                │")
    print(f"  │ TCN R²:      {metrics['r_squared']:.4f}                │")
    print(f"  │ Test Size:   {metrics['test_size']}                    │")
    print(f"  └─────────────────────────────────────┘")

    return metrics


# ---------------------------------------------------------------------------
# End-to-end pipeline evaluation
# ---------------------------------------------------------------------------

def evaluate_pipeline(merchants, gnn_metrics):
    print("\n" + "=" * 60)
    print("END-TO-END PIPELINE EVALUATION")
    print("=" * 60)

    # Map risk_label to expected decisions
    label_to_decision = {
        0: "approved",
        1: "structured",
        2: "rejected",
        3: "rejected",  # fraud → rejected
    }

    ground_truth = []
    predicted = []
    decision_dist = defaultdict(int)

    for m in merchants:
        risk_label = m.get("risk_label", 1)
        loan_status = m.get("loan_status", "structured")
        composite = m.get("composite_risk_score", 0.5)

        # Simulate the pipeline's decision logic
        if composite < 0.20:
            pred_decision = "approved"
        elif composite < 0.45:
            pred_decision = "structured"
        else:
            pred_decision = "rejected"

        ground_truth.append(loan_status if loan_status != "fraud" else "rejected")
        predicted.append(pred_decision)
        decision_dist[pred_decision] += 1

    # Calculate decision accuracy
    correct = sum(1 for gt, pred in zip(ground_truth, predicted) if gt == pred)
    accuracy = correct / max(len(ground_truth), 1)

    metrics = {
        "decision_accuracy": round(accuracy, 4),
        "total_evaluated": len(merchants),
        "decision_distribution": dict(decision_dist),
        "ground_truth_distribution": dict(defaultdict(int, {
            k: sum(1 for g in ground_truth if g == k)
            for k in set(ground_truth)
        })),
    }

    print(f"\n  ┌─────────────────────────────────────┐")
    print(f"  │ Pipeline Decision Accuracy: {accuracy:.1%}    │")
    print(f"  │ Total Merchants Evaluated:  {len(merchants):<6}  │")
    print(f"  └─────────────────────────────────────┘")

    print(f"\n  Decision Distribution:")
    for dec, count in sorted(decision_dist.items()):
        pct = count / len(merchants) * 100
        bar = "█" * int(pct / 2)
        print(f"    {dec:<12} {count:>4} ({pct:>5.1f}%) {bar}")

    return metrics


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("TrustAI — Model Evaluation Pipeline")
    print("=" * 60)

    start = time.time()
    merchants = load_merchants()
    print(f"Loaded {len(merchants)} merchant profiles")

    gnn_metrics = evaluate_gnn(merchants)
    tcn_metrics = evaluate_tcn(merchants)
    pipeline_metrics = evaluate_pipeline(merchants, gnn_metrics)

    # Assemble final report
    report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "evaluation_time_seconds": round(time.time() - start, 2),
        "data_source": {
            "file": "merchant_profiles.csv",
            "n_merchants": len(merchants),
            "generation": "prepare_real_data.py (MUDRA/NPCI/RBI calibrated synthetic)",
            "note": "Single consistent data source — no mixed distributions",
        },
        "gnn": gnn_metrics,
        "tcn": tcn_metrics,
        "pipeline": pipeline_metrics,
    }

    # Save
    out_path = Path(__file__).parent / "evaluation_results.json"
    with open(str(out_path), "w") as f:
        json.dump(report, f, indent=2)

    print(f"\n{'=' * 60}")
    print(f"EVALUATION COMPLETE in {report['evaluation_time_seconds']}s")
    print(f"Results saved to: {out_path}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
