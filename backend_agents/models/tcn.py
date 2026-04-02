"""
Temporal Convolutional Network for Financial Stability Scoring

Analyzes 12-week merchant/borrower financial time-series to predict
behavioral stability and repayment reliability.

Architecture:
  Input (3 channels: income, spending, savings) × 12 timesteps
  → TCN Block (dilated causal convolutions)
  → Global Average Pooling
  → FC → Stability Score [0, 1]

Designed for sub-second inference matching Paytm's
Groq-powered real-time requirements.
"""

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from pathlib import Path


class CausalConv1d(nn.Module):
    """Causal convolution — no future leakage."""

    def __init__(self, in_channels, out_channels, kernel_size, dilation=1):
        super().__init__()
        self.padding = (kernel_size - 1) * dilation
        self.conv = nn.Conv1d(
            in_channels, out_channels, kernel_size,
            padding=self.padding, dilation=dilation,
        )

    def forward(self, x):
        out = self.conv(x)
        if self.padding > 0:
            out = out[:, :, :-self.padding]
        return out


class TCNBlock(nn.Module):
    """Residual TCN block with dilated causal convolutions."""

    def __init__(self, in_channels, out_channels, kernel_size, dilation):
        super().__init__()
        self.conv1 = CausalConv1d(in_channels, out_channels, kernel_size, dilation)
        self.conv2 = CausalConv1d(out_channels, out_channels, kernel_size, dilation)
        self.bn1 = nn.BatchNorm1d(out_channels)
        self.bn2 = nn.BatchNorm1d(out_channels)
        self.dropout = nn.Dropout(0.2)
        self.residual = nn.Conv1d(in_channels, out_channels, 1) if in_channels != out_channels else nn.Identity()

    def forward(self, x):
        residual = self.residual(x)
        out = self.dropout(F.relu(self.bn1(self.conv1(x))))
        out = self.dropout(F.relu(self.bn2(self.conv2(out))))
        return F.relu(out + residual)


class TCNStabilityModel(nn.Module):
    """
    TCN for financial stability prediction.

    Input: (batch, 3, seq_len) — 3 channels: income, spending, savings
    Output: (batch, 1) — stability score [0, 1]
    """

    def __init__(self, input_channels=3, hidden=32, num_blocks=3, kernel_size=3):
        super().__init__()
        layers = []
        channels = input_channels
        for i in range(num_blocks):
            dilation = 2 ** i
            out_ch = hidden
            layers.append(TCNBlock(channels, out_ch, kernel_size, dilation))
            channels = out_ch
        self.tcn = nn.Sequential(*layers)
        fc_hidden = hidden // 2 if hidden >= 64 else 16
        self.fc = nn.Sequential(
            nn.Linear(hidden, fc_hidden),
            nn.ReLU(),
            nn.Dropout(0.15),
            nn.Linear(fc_hidden, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        # x: (batch, channels, seq_len)
        out = self.tcn(x)
        # Global average pooling
        out = out.mean(dim=2)
        return self.fc(out)

    def predict(self, weekly_data: list) -> dict:
        """
        Predict stability from weekly financial data.

        weekly_data: list of dicts with keys: income, spending, savings
        Returns: { stability: float, trend: str, features: dict }
        """
        self.eval()

        if not weekly_data or len(weekly_data) < 4:
            return self._heuristic_predict(weekly_data)

        # Pad/truncate to 12 weeks
        while len(weekly_data) < 12:
            weekly_data = [weekly_data[0]] + weekly_data
        weekly_data = weekly_data[-12:]

        # Build input tensor
        income = [w.get("income", 4000) for w in weekly_data]
        spending = [w.get("spending", 3800) for w in weekly_data]
        savings = [w.get("savings", 200) for w in weekly_data]

        # Normalize
        def normalize(arr):
            arr = np.array(arr, dtype=np.float32)
            mean, std = arr.mean(), arr.std() + 1e-6
            return (arr - mean) / std

        x = np.stack([normalize(income), normalize(spending), normalize(savings)])
        x_t = torch.from_numpy(x).unsqueeze(0)  # (1, 3, 12)

        with torch.no_grad():
            stability = self.forward(x_t).item()

        # Trend detection
        recent_savings = np.mean(savings[-4:])
        earlier_savings = np.mean(savings[:4])
        if recent_savings > earlier_savings * 1.1:
            trend = "improving"
        elif recent_savings < earlier_savings * 0.9:
            trend = "declining"
        else:
            trend = "stable"

        return {
            "stability": round(stability, 4),
            "trend": trend,
            "features": {
                "income_cv": round(float(np.std(income) / (np.mean(income) + 1e-6)), 4),
                "savings_rate": round(float(np.mean(savings) / (np.mean(income) + 1e-6)), 4),
                "spending_ratio": round(float(np.mean(spending) / (np.mean(income) + 1e-6)), 4),
                "savings_positive_weeks": int(sum(1 for s in savings if s > 0)),
            },
        }

    def _heuristic_predict(self, weekly_data):
        """Fallback heuristic when data is insufficient."""
        if not weekly_data:
            return {"stability": 0.5, "trend": "unknown", "features": {}}

        incomes = [w.get("income", 4000) for w in weekly_data]
        savings = [w.get("savings", 200) for w in weekly_data]

        cv = np.std(incomes) / (np.mean(incomes) + 1e-6)
        savings_rate = np.mean(savings) / (np.mean(incomes) + 1e-6)

        stability = (1.0 - min(cv, 1.0)) * 0.5 + min(max(savings_rate, 0), 0.5) * 0.5
        return {
            "stability": round(float(stability), 4),
            "trend": "stable",
            "features": {
                "income_cv": round(float(cv), 4),
                "savings_rate": round(float(savings_rate), 4),
            },
        }


def generate_training_data(n_samples=500, seq_len=12):
    """Generate synthetic training data for TCN."""
    X = []
    Y = []

    for _ in range(n_samples):
        # Random base income
        base_income = np.random.uniform(3000, 8000)
        volatility = np.random.uniform(0.05, 0.4)
        savings_discipline = np.random.uniform(0.0, 0.3)

        income = base_income + base_income * volatility * np.random.randn(seq_len)
        spending_ratio = np.random.uniform(0.7, 1.05)
        spending = income * spending_ratio + base_income * 0.1 * np.random.randn(seq_len)
        savings = income - spending

        # Label: stable if low volatility + positive savings
        income_cv = np.std(income) / (np.mean(income) + 1e-6)
        savings_positive = sum(1 for s in savings if s > 0) / seq_len
        stability = (1.0 - min(income_cv, 1.0)) * 0.4 + savings_positive * 0.3 + savings_discipline * 0.3

        def norm(arr):
            arr = np.array(arr, dtype=np.float32)
            m, s = arr.mean(), arr.std() + 1e-6
            return (arr - m) / s

        x = np.stack([norm(income), norm(spending), norm(savings)])
        X.append(x)
        Y.append(stability)

    return np.array(X, dtype=np.float32), np.array(Y, dtype=np.float32)


def train_tcn():
    """Train TCN stability model."""
    print("Generating training data...")
    X, Y = generate_training_data(1000, 12)
    X_t = torch.from_numpy(X)
    Y_t = torch.from_numpy(Y).unsqueeze(1)

    # Train/test split
    split = int(0.8 * len(X))
    X_train, X_test = X_t[:split], X_t[split:]
    Y_train, Y_test = Y_t[:split], Y_t[split:]

    model = TCNStabilityModel(input_channels=3, hidden=32, num_blocks=3)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.MSELoss()

    model.train()
    batch_size = 32

    for epoch in range(1, 101):
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

        if epoch % 20 == 0:
            model.eval()
            with torch.no_grad():
                test_pred = model(X_test)
                test_loss = criterion(test_pred, Y_test).item()
                mae = (test_pred - Y_test).abs().mean().item()
            model.train()
            print(f"Epoch {epoch:03d}  train_loss={total_loss/n_batches:.4f}  test_loss={test_loss:.4f}  MAE={mae:.4f}")

    # Save
    save_path = Path(__file__).parent.parent / "tcn_model.pth"
    torch.save({
        "model_state": model.state_dict(),
        "input_channels": 3,
        "hidden": 32,
        "num_blocks": 3,
    }, str(save_path))
    print(f"Saved TCN model to {save_path}")

    return model


if __name__ == "__main__":
    train_tcn()
