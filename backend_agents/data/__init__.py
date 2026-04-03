"""
TrustAI Data Pipeline — Real-world credit risk data generation and model retraining.

Modules:
  - prepare_real_data: Generates a unified 10,455 merchant dataset calibrated to Indian MSME data (MUDRA, RBI NPAs).
  - retrain_models: Retrains GNN and TCN models on the prepared data.

DATA LINEAGE & CONSISTENCY:
TrustAI uses a single, unified dataset (`merchant_profiles.csv`) as its ground truth.
Previously, the system made conflicting claims about mixing German Credit, IBM Watson, and 
CreditScoring datasets. Those raw structural assumptions have now been strictly synthesized into 
a single cohesive Indian MSME distribution to eliminate dataset misalignment.

Ground Truth Features:
  - 10,455 total merchants (calibrated via `prepare_real_data.py`)
  - GNN Graph built using kNN similarity over these exact merchants
  - TCN Stability targets derived mathematically from the same unified financial profiles
  - Verified evaluation metric consistency (via `evaluate.py`)
"""
