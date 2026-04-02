#!/usr/bin/env python3
"""
prepare_real_data.py — Generate realistic Indian micro-lending data for TrustAI model training.

==============================================================================
DATA SOURCES AND DISTRIBUTIONS
==============================================================================

This script generates synthetic data calibrated to real Indian micro-lending
statistics from the following public sources:

1. MUDRA (Micro Units Development and Refinance Agency) — FY2023-24 Annual Report
   - Shishu (up to Rs 50K):  ~77% of loans, avg ticket ~Rs 25K, NPA ~5.1%
   - Kishore (Rs 50K-5L):   ~20% of loans, avg ticket ~Rs 2.2L, NPA ~3.2%
   - Tarun (Rs 5L-10L):     ~3% of loans,  avg ticket ~Rs 7.5L, NPA ~2.1%
   - Total disbursement FY24: Rs 5.4 lakh crore across 6.3 crore accounts

2. PMJDY (Pradhan Mantri Jan Dhan Yojana) — As of March 2024
   - 52 crore accounts opened
   - Average balance: ~Rs 4,200
   - 56% women account holders
   - Rural:Urban split ~60:40

3. RBI Financial Inclusion Index — March 2024
   - FI Index: 64.2 (scale 0-100)
   - Credit-to-GDP ratio for MSMEs: ~6%
   - Priority sector lending: 40% of ANBC

4. NPCI UPI Statistics — FY2023-24
   - Monthly UPI transactions: ~12 billion (March 2024)
   - P2M share: ~45% of transactions
   - Average ticket size: Rs 1,500 (P2M), Rs 2,800 (P2P)
   - QR code adoption: ~3 crore merchants

5. RBI MSME Pulse Reports
   - Kirana stores: ~12 million registered
   - Average monthly turnover (micro): Rs 50K-2L
   - Average monthly turnover (small): Rs 2L-10L
   - Seasonal variation coefficient: 0.15-0.35

6. India Stack / DigiLocker adoption
   - KYC verified MSMEs: ~65% via e-KYC
   - Aadhaar-linked accounts: >90% of PMJDY

BUSINESS TYPE DISTRIBUTION (based on MSME census + Udyam registration):
   - Kirana/General Store:  30%
   - Food/Restaurant:       15%
   - Textile/Clothing:      12%
   - Agriculture Supply:    10%
   - Electronics:            8%
   - Hardware/Construction:  7%
   - Medical/Pharmacy:       5%
   - Services:               5%
   - Auto/Transport:         4%
   - Other:                  4%

CITY TIER DISTRIBUTION (based on census + economic activity):
   - Tier 1 (metros):       20%
   - Tier 2 (1M+ pop):      30%
   - Tier 3 (100K-1M):      35%
   - Rural/Tier 4:          15%

==============================================================================
USAGE
==============================================================================

    python prepare_real_data.py

Outputs (in the same directory):
    - merchant_profiles.csv  (500+ merchant profiles)
    - transaction_graph.csv  (edge list for GNN)
    - training_labels.csv    (risk labels for supervised learning)

==============================================================================
"""

import os
import sys
import csv
import json
import math
import random
import hashlib
import urllib.request
from pathlib import Path
from datetime import datetime, timedelta

import numpy as np

# ---------------------------------------------------------------------------
# Constants — calibrated to real Indian micro-lending distributions
# ---------------------------------------------------------------------------

RANDOM_SEED = 42
NUM_MERCHANTS = 600

# MUDRA category distributions (Shishu/Kishore/Tarun)
MUDRA_CATEGORIES = {
    "shishu":  {"weight": 0.77, "loan_min": 5000,   "loan_max": 50000,   "npa_rate": 0.051},
    "kishore": {"weight": 0.20, "loan_min": 50000,  "loan_max": 500000,  "npa_rate": 0.032},
    "tarun":   {"weight": 0.03, "loan_min": 500000, "loan_max": 1000000, "npa_rate": 0.021},
}

# Business types with distribution weights (from MSME census + Udyam data)
BUSINESS_TYPES = [
    ("Kirana Store",          0.30, {"income_mult": 1.0,  "upi_mult": 1.2,  "seasonal_var": 0.10}),
    ("Food Stall/Restaurant", 0.15, {"income_mult": 0.8,  "upi_mult": 1.5,  "seasonal_var": 0.20}),
    ("Textile/Clothing",      0.12, {"income_mult": 1.3,  "upi_mult": 0.8,  "seasonal_var": 0.30}),
    ("Agriculture Supply",    0.10, {"income_mult": 0.7,  "upi_mult": 0.5,  "seasonal_var": 0.40}),
    ("Electronics Shop",      0.08, {"income_mult": 1.5,  "upi_mult": 1.0,  "seasonal_var": 0.15}),
    ("Hardware/Construction",  0.07, {"income_mult": 1.2,  "upi_mult": 0.6,  "seasonal_var": 0.25}),
    ("Medical/Pharmacy",      0.05, {"income_mult": 1.4,  "upi_mult": 1.1,  "seasonal_var": 0.08}),
    ("Services/Salon/Repair", 0.05, {"income_mult": 0.9,  "upi_mult": 1.3,  "seasonal_var": 0.12}),
    ("Auto/Transport",        0.04, {"income_mult": 1.1,  "upi_mult": 0.4,  "seasonal_var": 0.18}),
    ("Other/Mixed",           0.04, {"income_mult": 0.85, "upi_mult": 0.7,  "seasonal_var": 0.20}),
]

# Indian cities by tier (real cities, representative sample)
CITIES_BY_TIER = {
    "tier1": [
        ("Mumbai", "Maharashtra"), ("Delhi", "Delhi"), ("Bangalore", "Karnataka"),
        ("Hyderabad", "Telangana"), ("Chennai", "Tamil Nadu"), ("Kolkata", "West Bengal"),
        ("Pune", "Maharashtra"), ("Ahmedabad", "Gujarat"),
    ],
    "tier2": [
        ("Jaipur", "Rajasthan"), ("Lucknow", "Uttar Pradesh"), ("Kanpur", "Uttar Pradesh"),
        ("Nagpur", "Maharashtra"), ("Indore", "Madhya Pradesh"), ("Bhopal", "Madhya Pradesh"),
        ("Patna", "Bihar"), ("Vadodara", "Gujarat"), ("Coimbatore", "Tamil Nadu"),
        ("Kochi", "Kerala"), ("Visakhapatnam", "Andhra Pradesh"), ("Agra", "Uttar Pradesh"),
        ("Nashik", "Maharashtra"), ("Rajkot", "Gujarat"), ("Madurai", "Tamil Nadu"),
        ("Varanasi", "Uttar Pradesh"), ("Srinagar", "Jammu & Kashmir"),
        ("Aurangabad", "Maharashtra"), ("Dhanbad", "Jharkhand"), ("Amritsar", "Punjab"),
    ],
    "tier3": [
        ("Guwahati", "Assam"), ("Jodhpur", "Rajasthan"), ("Raipur", "Chhattisgarh"),
        ("Dehradun", "Uttarakhand"), ("Udaipur", "Rajasthan"), ("Hubli", "Karnataka"),
        ("Mangalore", "Karnataka"), ("Tiruchirappalli", "Tamil Nadu"),
        ("Salem", "Tamil Nadu"), ("Bareilly", "Uttar Pradesh"),
        ("Moradabad", "Uttar Pradesh"), ("Gorakhpur", "Uttar Pradesh"),
        ("Bikaner", "Rajasthan"), ("Bhilai", "Chhattisgarh"), ("Warangal", "Telangana"),
        ("Guntur", "Andhra Pradesh"), ("Kakinada", "Andhra Pradesh"),
        ("Thanjavur", "Tamil Nadu"), ("Nanded", "Maharashtra"), ("Sangli", "Maharashtra"),
        ("Kolhapur", "Maharashtra"), ("Ajmer", "Rajasthan"), ("Bilaspur", "Chhattisgarh"),
        ("Latur", "Maharashtra"), ("Shillong", "Meghalaya"), ("Imphal", "Manipur"),
        ("Silchar", "Assam"), ("Muzaffarpur", "Bihar"), ("Darbhanga", "Bihar"),
    ],
    "rural": [
        ("Barabanki", "Uttar Pradesh"), ("Sitapur", "Uttar Pradesh"),
        ("Pratapgarh", "Rajasthan"), ("Chhatarpur", "Madhya Pradesh"),
        ("Mandla", "Madhya Pradesh"), ("Jhabua", "Madhya Pradesh"),
        ("Dungarpur", "Rajasthan"), ("Korba", "Chhattisgarh"),
        ("Dhamtari", "Chhattisgarh"), ("Nalanda", "Bihar"),
        ("Madhubani", "Bihar"), ("Pauri Garhwal", "Uttarakhand"),
    ],
}

CITY_TIER_WEIGHTS = {"tier1": 0.20, "tier2": 0.30, "tier3": 0.35, "rural": 0.15}

# Income distribution by tier (monthly, in INR)
# Based on PMJDY average balance data + MUDRA disbursement patterns
INCOME_PARAMS_BY_TIER = {
    "tier1": {"loc": 35000, "scale": 15000, "min": 8000,  "max": 80000},
    "tier2": {"loc": 22000, "scale": 10000, "min": 5000,  "max": 60000},
    "tier3": {"loc": 15000, "scale": 7000,  "min": 3500,  "max": 45000},
    "rural": {"loc": 10000, "scale": 5000,  "min": 3000,  "max": 30000},
}

# UPI adoption rates by tier (based on NPCI data)
UPI_ADOPTION_BY_TIER = {
    "tier1": 0.92,
    "tier2": 0.78,
    "tier3": 0.55,
    "rural": 0.30,
}

# Loan purposes (from MUDRA disbursement data)
LOAN_PURPOSES = [
    ("Inventory Purchase", 0.35),
    ("Equipment/Machinery", 0.20),
    ("Working Capital", 0.25),
    ("Shop Renovation", 0.08),
    ("Vehicle Purchase", 0.05),
    ("Technology Upgrade", 0.04),
    ("Other", 0.03),
]

# First names (common Indian names)
FIRST_NAMES = [
    "Rajesh", "Priya", "Amit", "Sunita", "Vikram", "Anjali", "Suresh", "Deepa",
    "Manoj", "Kavita", "Ravi", "Meena", "Arun", "Pooja", "Sanjay", "Rekha",
    "Mahesh", "Geeta", "Vinod", "Lakshmi", "Ramesh", "Sarita", "Sunil", "Asha",
    "Pramod", "Savita", "Dinesh", "Usha", "Naresh", "Kamla", "Gopal", "Shanti",
    "Mukesh", "Nirmala", "Ashok", "Sushma", "Pankaj", "Neha", "Sachin", "Anita",
    "Yogesh", "Mamta", "Hitesh", "Ritu", "Gaurav", "Swati", "Nitin", "Jyoti",
    "Kamal", "Preeti", "Rohit", "Komal", "Mohit", "Divya", "Ajay", "Sneha",
    "Vikas", "Pallavi", "Rakesh", "Seema", "Dhruv", "Archana", "Naveen", "Bhavna",
]

LAST_NAMES = [
    "Sharma", "Patel", "Singh", "Kumar", "Verma", "Gupta", "Yadav", "Joshi",
    "Reddy", "Nair", "Pillai", "Iyer", "Shah", "Desai", "Patil", "Kulkarni",
    "Chauhan", "Thakur", "Mishra", "Pandey", "Mehta", "Jain", "Agarwal", "Saxena",
    "Tiwari", "Dubey", "Srivastava", "Shukla", "Rathore", "Chaudhary", "Malhotra",
    "Kapoor", "Bhatia", "Chopra", "Sethi", "Gill", "Kaur", "Bose", "Das", "Sen",
]

# Business name templates
BUSINESS_TEMPLATES = {
    "Kirana Store": [
        "{last} General Store", "{last} Kirana", "New {last} Provision Store",
        "Shri {last} Traders", "{first} Grocery", "Jai Mata Di Store",
    ],
    "Food Stall/Restaurant": [
        "{last}'s Dhaba", "{first} Food Corner", "Shree {last} Restaurant",
        "Annapurna Bhojanlay", "{first} Tiffin Centre", "Swad Restaurant",
    ],
    "Textile/Clothing": [
        "{last} Cloth House", "{first} Fashion", "New {last} Textiles",
        "Shree Vastra Bhandar", "{last} Saree Centre", "Style Point",
    ],
    "Agriculture Supply": [
        "{last} Krishi Kendra", "{first} Agro Centre", "Kisan Sewa Kendra",
        "{last} Seeds & Fertilizers", "Gram Udyog Kendra", "Hari Om Agro",
    ],
    "Electronics Shop": [
        "{last} Electronics", "{first} Mobile World", "Digital {last}",
        "Tech Point", "{last} Computer Centre", "Smart Electronics",
    ],
    "Hardware/Construction": [
        "{last} Hardware", "{first} Building Materials", "New {last} Hardware Store",
        "Steel & Cement Depot", "{last} Paint House", "Cement Plus",
    ],
    "Medical/Pharmacy": [
        "{last} Medical Store", "{first} Pharmacy", "Life Care Medicals",
        "Health Plus Pharmacy", "{last} Drug House", "Jan Aushadhi Kendra",
    ],
    "Services/Salon/Repair": [
        "{first}'s Salon", "{last} Mobile Repair", "Quick Fix {last}",
        "{first} Beauty Parlour", "Star Cutting Salon", "{last} Tailoring",
    ],
    "Auto/Transport": [
        "{last} Auto Works", "{first} Transport", "{last} Garage",
        "Speed Auto Service", "{last} Tyres & Battery", "Om Sai Auto",
    ],
    "Other/Mixed": [
        "{last} Enterprises", "{first} Trading Co", "Multi {last} Store",
        "{last} & Sons", "Ganesh Traders", "{first} Mart",
    ],
}

# Edge types for the transaction graph
EDGE_TYPES = [
    "merchant_customer",
    "merchant_supplier",
    "peer_to_peer",
    "merchant_bank",
    "upi_link",
    "loan_link",
]


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def set_seed(seed: int):
    """Set random seeds for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)


def lognormal_income(loc: float, scale: float, min_val: float, max_val: float) -> float:
    """
    Draw from a right-skewed income distribution (lognormal).
    This matches observed MUDRA/PMJDY income distributions where
    most borrowers cluster at lower income levels.
    """
    mu = math.log(loc) - 0.5 * (scale / loc) ** 2
    sigma = scale / loc
    val = np.random.lognormal(mu, sigma)
    return float(np.clip(val, min_val, max_val))


def weighted_choice(items_with_weights):
    """Choose from a list of (item, weight, ...) tuples."""
    items = [x[0] for x in items_with_weights]
    weights = [x[1] for x in items_with_weights]
    return random.choices(items_with_weights, weights=weights, k=1)[0]


def generate_merchant_id(idx: int) -> str:
    """Generate a realistic merchant ID."""
    prefixes = ["MTE", "KSK", "SGS", "FTD", "AGR", "TXL", "MED", "SRV", "AUT", "GEN"]
    prefix = prefixes[idx % len(prefixes)]
    return f"{prefix}-{idx:04d}"


def pick_city(rng: np.random.RandomState):
    """Pick a city and its tier based on NPCI distribution."""
    tier_roll = rng.random()
    cumulative = 0.0
    chosen_tier = "tier3"
    for tier, weight in CITY_TIER_WEIGHTS.items():
        cumulative += weight
        if tier_roll < cumulative:
            chosen_tier = tier
            break
    cities = CITIES_BY_TIER[chosen_tier]
    city, state = cities[rng.randint(0, len(cities))]
    return city, state, chosen_tier


def pick_mudra_category(rng: np.random.RandomState):
    """Pick a MUDRA loan category based on real distribution."""
    roll = rng.random()
    cumulative = 0.0
    for cat_name, params in MUDRA_CATEGORIES.items():
        cumulative += params["weight"]
        if roll < cumulative:
            return cat_name, params
    return "shishu", MUDRA_CATEGORIES["shishu"]


def generate_weekly_timeseries(
    base_income: float,
    expense_ratio: float,
    volatility: float,
    trend: str,
    rng: np.random.RandomState,
    num_weeks: int = 12,
) -> list:
    """
    Generate 12 weeks of income/spending/savings data.

    Trend types: 'stable', 'improving', 'declining', 'volatile', 'seasonal'
    Calibrated so that the TCN model sees realistic patterns from Indian
    micro-merchants (weekly income range Rs 750 to Rs 20K).
    """
    weeks = []
    for w in range(num_weeks):
        # Base income with noise
        noise = rng.normal(0, volatility * base_income / 4)

        # Apply trend
        if trend == "improving":
            trend_factor = 1.0 + 0.03 * w
        elif trend == "declining":
            trend_factor = 1.0 - 0.025 * w
        elif trend == "seasonal":
            # Simulates festival season boost (weeks 8-11 for Diwali/Dussehra)
            trend_factor = 1.0 + 0.3 * math.sin(2 * math.pi * w / 12)
        elif trend == "volatile":
            trend_factor = 1.0 + 0.2 * rng.choice([-1, 1])
        else:
            trend_factor = 1.0

        weekly_income = max(500, (base_income / 4) * trend_factor + noise)
        weekly_spending = max(300, weekly_income * expense_ratio + rng.normal(0, base_income * 0.02))
        weekly_savings = weekly_income - weekly_spending

        weeks.append({
            "week": f"W{w + 1}",
            "income": round(weekly_income),
            "spending": round(weekly_spending),
            "savings": round(weekly_savings),
        })

    return weeks


def assign_risk_label(merchant: dict) -> tuple:
    """
    Assign risk labels based on a composite of features.

    Risk categories:
      0 = Low Risk   — strong financials, good UPI activity, KYC verified
      1 = Medium Risk — moderate, some volatility, limited history
      2 = High Risk  — poor financials, high expense ratios, low activity
      3 = Fraud      — anomalous patterns (P2P >> business, velocity spikes)

    Returns: (risk_label: int, composite_score: float)
    """
    score = 0.0

    # Income-to-expense ratio (weight: 0.20)
    income = merchant["monthly_income"]
    expense = merchant["monthly_expense"]
    if income > 0:
        expense_ratio = expense / income
        if expense_ratio < 0.7:
            score += 0.0
        elif expense_ratio < 0.85:
            score += 0.10
        elif expense_ratio < 1.0:
            score += 0.20
        else:
            score += 0.35

    # UPI activity (weight: 0.15) — based on NPCI averages
    upi_count = merchant["upi_monthly_count"]
    if upi_count > 60:
        score += 0.0
    elif upi_count > 20:
        score += 0.05
    elif upi_count > 5:
        score += 0.12
    else:
        score += 0.20

    # Months active (weight: 0.15) — longer history = lower risk
    months = merchant["months_active"]
    if months >= 24:
        score += 0.0
    elif months >= 12:
        score += 0.05
    elif months >= 6:
        score += 0.10
    else:
        score += 0.18

    # P2P anomaly (weight: 0.15) — high P2P vs business = fraud signal
    p2p_received = merchant["p2p_received_monthly"]
    p2p_sent = merchant["p2p_sent_monthly"]
    if income > 0:
        p2p_ratio = (p2p_received + p2p_sent) / income
        if p2p_ratio > 5.0:
            score += 0.30  # Strong fraud signal
        elif p2p_ratio > 2.0:
            score += 0.15
        elif p2p_ratio > 1.0:
            score += 0.08
        else:
            score += 0.0

    # Velocity anomaly (weight: 0.10)
    current = merchant["current_month_count"]
    avg = merchant["avg_monthly_count"]
    if avg > 0:
        velocity_ratio = current / avg
        if velocity_ratio > 5.0:
            score += 0.20  # Suspicious spike
        elif velocity_ratio > 2.0:
            score += 0.08
        else:
            score += 0.0

    # KYC (weight: 0.10)
    if not merchant["kyc_verified"]:
        score += 0.15

    # Loan amount relative to income (weight: 0.10)
    loan = merchant["loan_amount"]
    if income > 0:
        loan_income_ratio = loan / (income * 12)
        if loan_income_ratio > 2.0:
            score += 0.15
        elif loan_income_ratio > 1.0:
            score += 0.08
        elif loan_income_ratio > 0.5:
            score += 0.03

    # Savings consistency from weekly data (weight: 0.05)
    weekly = merchant.get("weekly_data", [])
    if isinstance(weekly, str):
        try:
            weekly = json.loads(weekly)
        except (json.JSONDecodeError, TypeError):
            weekly = []
    if weekly:
        negative_weeks = sum(1 for w in weekly if w["savings"] < 0)
        if negative_weeks >= 10:
            score += 0.10
        elif negative_weeks >= 6:
            score += 0.05
        elif negative_weeks >= 3:
            score += 0.02

    # Clamp to [0, 1]
    score = min(1.0, max(0.0, score))

    # Map score to label
    if score < 0.20:
        label = 0  # Low risk
    elif score < 0.45:
        label = 1  # Medium risk
    elif score < 0.70:
        label = 2  # High risk
    else:
        label = 3  # Fraud

    return label, round(score, 4)


def assign_loan_status(risk_label: int, rng: np.random.RandomState) -> str:
    """
    Map risk label to loan decision with some noise.
    Matches TrustAI's 4-outcome model: approved, structured, rejected, fraud.
    """
    if risk_label == 0:
        return rng.choice(["approved", "approved", "approved", "structured"], p=[0.75, 0.1, 0.1, 0.05])
    elif risk_label == 1:
        return rng.choice(["approved", "structured", "structured", "rejected"], p=[0.15, 0.55, 0.20, 0.10])
    elif risk_label == 2:
        return rng.choice(["structured", "rejected", "rejected", "rejected"], p=[0.15, 0.35, 0.35, 0.15])
    else:
        return rng.choice(["rejected", "rejected", "fraud", "fraud"], p=[0.10, 0.20, 0.35, 0.35])


# ---------------------------------------------------------------------------
# Data generation
# ---------------------------------------------------------------------------

def try_download_kaggle_csv(output_dir: Path) -> bool:
    """
    Attempt to download the Credit Risk Dataset from a mirror URL.
    The Kaggle dataset by 'laotse' (credit-risk-dataset) is ~32K rows of
    personal loan data. We use it as a secondary reference if available.

    Returns True if download succeeded, False otherwise.
    """
    urls = [
        "https://raw.githubusercontent.com/dsrscientist/dataset1/master/credit_risk.csv",
        "https://raw.githubusercontent.com/amankharwal/Website-data/master/credit_risk.csv",
    ]

    for url in urls:
        try:
            print(f"[INFO] Trying to download credit risk data from {url} ...")
            dest = output_dir / "kaggle_credit_risk_raw.csv"
            urllib.request.urlretrieve(url, str(dest))
            # Verify it has content
            if dest.stat().st_size > 1000:
                print(f"[OK] Downloaded external dataset to {dest}")
                return True
            else:
                dest.unlink(missing_ok=True)
        except Exception as e:
            print(f"[WARN] Download failed: {e}")

    print("[INFO] External download unavailable. Generating from Indian micro-lending distributions.")
    return False


def generate_merchant_profiles(num_merchants: int, rng: np.random.RandomState) -> list:
    """
    Generate realistic Indian micro-merchant profiles.

    Each merchant profile contains features aligned with:
    - Paytm MCP transaction schema (UPI, QR, Soundbox channels)
    - MUDRA loan categories and amounts
    - NPCI UPI adoption statistics
    - RBI MSME financial patterns
    """
    merchants = []

    for idx in range(num_merchants):
        # Deterministic per-merchant RNG for reproducibility
        mrng = np.random.RandomState(RANDOM_SEED + idx)

        # Pick business type (weighted by MSME census)
        btype_name, _, btype_params = weighted_choice(BUSINESS_TYPES)

        # Pick location
        city, state, tier = pick_city(mrng)

        # Pick MUDRA category
        mudra_cat, mudra_params = pick_mudra_category(mrng)

        # Generate name
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        templates = BUSINESS_TEMPLATES.get(btype_name, ["{last} Store"])
        biz_name = random.choice(templates).format(first=first, last=last)

        # Monthly income (lognormal, right-skewed, tier-dependent)
        income_p = INCOME_PARAMS_BY_TIER[tier]
        monthly_income = lognormal_income(
            income_p["loc"] * btype_params["income_mult"],
            income_p["scale"],
            income_p["min"],
            income_p["max"],
        )
        monthly_income = round(monthly_income / 100) * 100  # Round to nearest 100

        # Expense ratio (depends on business type and tier)
        base_expense_ratio = mrng.uniform(0.55, 0.95)
        monthly_expense = round(monthly_income * base_expense_ratio / 100) * 100

        # UPI metrics (based on NPCI adoption rates)
        upi_adoption = UPI_ADOPTION_BY_TIER[tier]
        is_upi_active = mrng.random() < upi_adoption
        if is_upi_active:
            upi_monthly = int(mrng.lognormal(math.log(40 * btype_params["upi_mult"]), 0.7))
            upi_monthly = min(upi_monthly, 200)
        else:
            upi_monthly = int(mrng.choice([0, 1, 2, 3]))

        # QR payments (subset of merchants)
        qr_active = mrng.random() < (upi_adoption * 0.6)
        qr_count = int(upi_monthly * mrng.uniform(0.2, 0.6)) if qr_active else 0

        # Soundbox (Paytm-specific, ~15% of UPI merchants)
        soundbox_active = is_upi_active and (mrng.random() < 0.15)
        soundbox_txn = int(upi_monthly * mrng.uniform(0.3, 0.8)) if soundbox_active else 0

        # Customer metrics
        avg_ticket = round(mrng.lognormal(math.log(500 * btype_params["income_mult"]), 0.6))
        avg_ticket = min(avg_ticket, 15000)
        unique_customers = max(3, int(mrng.lognormal(math.log(30 * btype_params["upi_mult"]), 0.8)))
        unique_customers = min(unique_customers, 500)

        # Business age (months active)
        months_active = max(1, int(mrng.exponential(18)))
        months_active = min(months_active, 120)

        # Loan amount (from MUDRA category)
        loan_amount = round(mrng.uniform(mudra_params["loan_min"], mudra_params["loan_max"]) / 500) * 500

        # Loan purpose
        purpose, _ = weighted_choice([(p, w) for p, w in LOAN_PURPOSES])

        # P2P metrics — most merchants have minimal P2P
        p2p_received = round(monthly_income * mrng.uniform(0.0, 0.3) / 100) * 100
        p2p_sent = round(monthly_income * mrng.uniform(0.0, 0.2) / 100) * 100

        # Inject ~3% fraud patterns (anomalously high P2P)
        is_fraud_pattern = mrng.random() < 0.03
        if is_fraud_pattern:
            p2p_received = round(monthly_income * mrng.uniform(3.0, 8.0) / 100) * 100
            p2p_sent = round(p2p_received * mrng.uniform(0.8, 0.98) / 100) * 100

        # Velocity metrics
        avg_monthly_count = max(1, upi_monthly + qr_count)
        current_month_count = avg_monthly_count
        if is_fraud_pattern:
            current_month_count = int(avg_monthly_count * mrng.uniform(5, 15))
        elif mrng.random() < 0.1:
            # Organic growth spike (~10% of merchants)
            current_month_count = int(avg_monthly_count * mrng.uniform(1.5, 2.5))

        # KYC — 65% verified (from DigiLocker/e-KYC data)
        kyc_verified = mrng.random() < 0.65
        if is_fraud_pattern:
            kyc_verified = mrng.random() < 0.15  # Fraud actors rarely verified

        # Repeat customers
        repeat_customers = max(1, int(unique_customers * mrng.uniform(0.3, 0.8)))
        new_customers_monthly = max(0, int(unique_customers * mrng.uniform(0.05, 0.3)))

        # Settlement amount
        settlement_amount = round(monthly_income * mrng.uniform(0.8, 1.2) / 1000) * 1000

        # Loan history
        loans_repaid = max(0, int(mrng.exponential(1.5)))
        loans_repaid = min(loans_repaid, 10)
        default_rate = 0.0
        if mrng.random() < mudra_params["npa_rate"]:
            default_rate = round(mrng.uniform(0.05, 0.5), 2)
        if is_fraud_pattern:
            default_rate = round(mrng.uniform(0.5, 1.0), 2)

        # Merchant tier (0-4, based on Paytm's tiering)
        if monthly_income > 50000 and months_active > 24:
            merchant_tier = mrng.choice([3, 4])
        elif monthly_income > 25000 and months_active > 12:
            merchant_tier = mrng.choice([2, 3])
        elif monthly_income > 12000:
            merchant_tier = mrng.choice([1, 2])
        else:
            merchant_tier = mrng.choice([0, 1])

        # Generate weekly time-series data
        trend_options = ["stable", "improving", "declining", "volatile", "seasonal"]
        if is_fraud_pattern:
            trend_weights = [0.05, 0.05, 0.3, 0.5, 0.1]
        elif monthly_income > 30000:
            trend_weights = [0.4, 0.3, 0.05, 0.1, 0.15]
        else:
            trend_weights = [0.25, 0.2, 0.15, 0.2, 0.2]
        trend = mrng.choice(trend_options, p=trend_weights)

        weekly_data = generate_weekly_timeseries(
            base_income=monthly_income,
            expense_ratio=base_expense_ratio,
            volatility=btype_params["seasonal_var"],
            trend=trend,
            rng=mrng,
        )

        merchant = {
            "merchant_id": generate_merchant_id(idx),
            "merchant_name": biz_name,
            "business_type": btype_name,
            "city": city,
            "state": state,
            "city_tier": tier,
            "mudra_category": mudra_cat,
            "monthly_income": monthly_income,
            "monthly_expense": monthly_expense,
            "upi_monthly_count": upi_monthly,
            "qr_payments_count": qr_count,
            "soundbox_active": soundbox_active,
            "soundbox_txn_count": soundbox_txn,
            "avg_ticket_size": avg_ticket,
            "unique_customers": unique_customers,
            "months_active": months_active,
            "loan_amount": loan_amount,
            "loan_purpose": purpose,
            "p2p_received_monthly": p2p_received,
            "p2p_sent_monthly": p2p_sent,
            "current_month_count": current_month_count,
            "avg_monthly_count": avg_monthly_count,
            "kyc_verified": kyc_verified,
            "repeat_customers": repeat_customers,
            "new_customers_monthly": new_customers_monthly,
            "settlement_amount": settlement_amount,
            "loans_repaid": loans_repaid,
            "default_rate": default_rate,
            "merchant_tier": merchant_tier,
            "weekly_data": json.dumps(weekly_data),
        }

        # Assign risk and loan status
        risk_label, risk_score = assign_risk_label(merchant)
        merchant["risk_label"] = risk_label
        merchant["composite_risk_score"] = risk_score
        merchant["loan_status"] = assign_loan_status(risk_label, mrng)

        merchants.append(merchant)

    return merchants


def generate_transaction_graph(merchants: list, rng: np.random.RandomState) -> list:
    """
    Generate a transaction graph edge list for GNN training.

    Edge types and their generation logic:
    - merchant_customer:  Each merchant connects to 3-20 synthetic customer nodes.
                          Weight = normalized transaction volume.
    - merchant_supplier:  Merchants in same city/state connect to shared suppliers.
    - peer_to_peer:       Merchants with P2P activity connect to each other.
    - merchant_bank:      Each merchant has a bank settlement edge.
    - upi_link:           UPI-active merchants form a payment network.
    - loan_link:          Merchants with loans connect to a central lending node.

    The graph is designed to work with MerchantGNN's adjacency matrix builder.
    """
    edges = []
    base_ts = datetime(2024, 1, 1)
    merchant_ids = [m["merchant_id"] for m in merchants]

    # Create synthetic customer/supplier/bank node IDs
    customer_pool_size = len(merchants) * 5
    supplier_pool_size = 50
    bank_nodes = ["BANK-SBI", "BANK-HDFC", "BANK-ICICI", "BANK-PNB", "BANK-AXIS",
                  "BANK-BOB", "BANK-KOTAK", "BANK-UNION", "BANK-CANARA", "BANK-IDB"]
    lender_node = "LENDER-MUDRA-001"

    for i, m in enumerate(merchants):
        mid = m["merchant_id"]
        mrng = np.random.RandomState(RANDOM_SEED + 10000 + i)

        # 1. Merchant-Customer edges
        num_customers = min(m["unique_customers"], 20)
        for c in range(max(3, num_customers)):
            cust_id = f"CUST-{(hash(mid) + c) % customer_pool_size:05d}"
            weight = round(mrng.uniform(0.1, 1.0), 3)
            ts = base_ts + timedelta(days=int(mrng.uniform(0, 365)))
            edges.append({
                "source_id": mid,
                "target_id": cust_id,
                "edge_type": "merchant_customer",
                "weight": weight,
                "timestamp": ts.strftime("%Y-%m-%d"),
            })

        # 2. Merchant-Supplier edges (city-based clustering)
        num_suppliers = mrng.randint(1, 5)
        city_hash = hash(m["city"]) % supplier_pool_size
        for s in range(num_suppliers):
            sup_id = f"SUP-{(city_hash + s) % supplier_pool_size:03d}"
            weight = round(mrng.uniform(0.3, 1.0), 3)
            ts = base_ts + timedelta(days=int(mrng.uniform(0, 365)))
            edges.append({
                "source_id": mid,
                "target_id": sup_id,
                "edge_type": "merchant_supplier",
                "weight": weight,
                "timestamp": ts.strftime("%Y-%m-%d"),
            })

        # 3. Peer-to-peer edges (merchants with P2P activity)
        if m["p2p_received_monthly"] > 0 or m["p2p_sent_monthly"] > 0:
            num_peers = mrng.randint(1, 4)
            for _ in range(num_peers):
                peer_idx = mrng.randint(0, len(merchants))
                if peer_idx != i:
                    peer_id = merchant_ids[peer_idx]
                    p2p_vol = m["p2p_received_monthly"] + m["p2p_sent_monthly"]
                    weight = round(min(1.0, p2p_vol / (m["monthly_income"] + 1)), 3)
                    ts = base_ts + timedelta(days=int(mrng.uniform(0, 365)))
                    edges.append({
                        "source_id": mid,
                        "target_id": peer_id,
                        "edge_type": "peer_to_peer",
                        "weight": weight,
                        "timestamp": ts.strftime("%Y-%m-%d"),
                    })

        # 4. Merchant-Bank edge
        bank = bank_nodes[i % len(bank_nodes)]
        weight = round(m["settlement_amount"] / max(m["monthly_income"], 1), 3)
        weight = min(weight, 1.0)
        edges.append({
            "source_id": mid,
            "target_id": bank,
            "edge_type": "merchant_bank",
            "weight": weight,
            "timestamp": base_ts.strftime("%Y-%m-%d"),
        })

        # 5. UPI link (connect UPI-active merchants in same city)
        if m["upi_monthly_count"] > 10:
            # Find another UPI-active merchant in the same state
            candidates = [
                j for j, other in enumerate(merchants)
                if j != i and other["state"] == m["state"] and other["upi_monthly_count"] > 10
            ]
            if candidates:
                partner_idx = mrng.choice(candidates)
                partner_id = merchant_ids[partner_idx]
                weight = round(mrng.uniform(0.2, 0.8), 3)
                ts = base_ts + timedelta(days=int(mrng.uniform(0, 365)))
                edges.append({
                    "source_id": mid,
                    "target_id": partner_id,
                    "edge_type": "upi_link",
                    "weight": weight,
                    "timestamp": ts.strftime("%Y-%m-%d"),
                })

        # 6. Loan link
        if m["loan_amount"] > 0:
            weight = round(m["loan_amount"] / 1000000.0, 4)  # Normalized to 10L
            edges.append({
                "source_id": mid,
                "target_id": lender_node,
                "edge_type": "loan_link",
                "weight": min(weight, 1.0),
                "timestamp": base_ts.strftime("%Y-%m-%d"),
            })

    return edges


# ---------------------------------------------------------------------------
# CSV writers
# ---------------------------------------------------------------------------

MERCHANT_CSV_COLUMNS = [
    "merchant_id", "merchant_name", "business_type", "city", "state", "city_tier",
    "mudra_category", "monthly_income", "monthly_expense",
    "upi_monthly_count", "qr_payments_count", "soundbox_active", "soundbox_txn_count",
    "avg_ticket_size", "unique_customers", "months_active",
    "loan_amount", "loan_purpose", "loan_status",
    "p2p_received_monthly", "p2p_sent_monthly",
    "current_month_count", "avg_monthly_count",
    "kyc_verified", "repeat_customers", "new_customers_monthly",
    "settlement_amount", "loans_repaid", "default_rate", "merchant_tier",
    "risk_label", "composite_risk_score",
    "weekly_data",
]

EDGE_CSV_COLUMNS = [
    "source_id", "target_id", "edge_type", "weight", "timestamp",
]

LABEL_CSV_COLUMNS = [
    "merchant_id", "risk_label", "composite_risk_score",
]


def write_merchant_profiles(merchants: list, output_dir: Path):
    """Write merchant_profiles.csv."""
    path = output_dir / "merchant_profiles.csv"
    with open(str(path), "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=MERCHANT_CSV_COLUMNS, extrasaction="ignore")
        writer.writeheader()
        for m in merchants:
            writer.writerow(m)
    print(f"[OK] Wrote {len(merchants)} merchant profiles to {path}")
    return path


def write_transaction_graph(edges: list, output_dir: Path):
    """Write transaction_graph.csv."""
    path = output_dir / "transaction_graph.csv"
    with open(str(path), "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=EDGE_CSV_COLUMNS)
        writer.writeheader()
        for e in edges:
            writer.writerow(e)
    print(f"[OK] Wrote {len(edges)} edges to {path}")
    return path


def write_training_labels(merchants: list, output_dir: Path):
    """Write training_labels.csv."""
    path = output_dir / "training_labels.csv"
    with open(str(path), "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=LABEL_CSV_COLUMNS)
        writer.writeheader()
        for m in merchants:
            writer.writerow({
                "merchant_id": m["merchant_id"],
                "risk_label": m["risk_label"],
                "composite_risk_score": m["composite_risk_score"],
            })
    print(f"[OK] Wrote {len(merchants)} labels to {path}")
    return path


def print_data_summary(merchants: list, edges: list):
    """Print a summary of the generated data for validation."""
    print("\n" + "=" * 70)
    print("DATA GENERATION SUMMARY")
    print("=" * 70)

    print(f"\nMerchant Profiles: {len(merchants)}")

    # Risk distribution
    risk_counts = {0: 0, 1: 0, 2: 0, 3: 0}
    for m in merchants:
        risk_counts[m["risk_label"]] += 1
    risk_names = {0: "Low", 1: "Medium", 2: "High", 3: "Fraud"}
    print("\nRisk Label Distribution:")
    for label, count in sorted(risk_counts.items()):
        pct = count / len(merchants) * 100
        print(f"  {risk_names[label]:8s}: {count:4d} ({pct:5.1f}%)")

    # Loan status distribution
    status_counts = {}
    for m in merchants:
        s = m["loan_status"]
        status_counts[s] = status_counts.get(s, 0) + 1
    print("\nLoan Status Distribution:")
    for status, count in sorted(status_counts.items()):
        pct = count / len(merchants) * 100
        print(f"  {status:12s}: {count:4d} ({pct:5.1f}%)")

    # MUDRA category
    mudra_counts = {}
    for m in merchants:
        c = m["mudra_category"]
        mudra_counts[c] = mudra_counts.get(c, 0) + 1
    print("\nMUDRA Category Distribution:")
    for cat, count in sorted(mudra_counts.items()):
        pct = count / len(merchants) * 100
        print(f"  {cat:8s}: {count:4d} ({pct:5.1f}%)")

    # Business type distribution
    btype_counts = {}
    for m in merchants:
        b = m["business_type"]
        btype_counts[b] = btype_counts.get(b, 0) + 1
    print("\nBusiness Type Distribution (top 5):")
    for btype, count in sorted(btype_counts.items(), key=lambda x: -x[1])[:5]:
        pct = count / len(merchants) * 100
        print(f"  {btype:25s}: {count:4d} ({pct:5.1f}%)")

    # Income stats
    incomes = [m["monthly_income"] for m in merchants]
    print(f"\nMonthly Income (INR):")
    print(f"  Mean:   Rs {np.mean(incomes):,.0f}")
    print(f"  Median: Rs {np.median(incomes):,.0f}")
    print(f"  Min:    Rs {np.min(incomes):,.0f}")
    print(f"  Max:    Rs {np.max(incomes):,.0f}")

    # Loan amount stats
    loans = [m["loan_amount"] for m in merchants]
    print(f"\nLoan Amount (INR):")
    print(f"  Mean:   Rs {np.mean(loans):,.0f}")
    print(f"  Median: Rs {np.median(loans):,.0f}")
    print(f"  Min:    Rs {np.min(loans):,.0f}")
    print(f"  Max:    Rs {np.max(loans):,.0f}")

    # UPI stats
    upi_active = [m for m in merchants if m["upi_monthly_count"] > 5]
    print(f"\nUPI Stats:")
    print(f"  Active merchants (>5 txn/mo): {len(upi_active)} ({len(upi_active)/len(merchants)*100:.1f}%)")
    if upi_active:
        upi_counts = [m["upi_monthly_count"] for m in upi_active]
        print(f"  Mean monthly UPI txns: {np.mean(upi_counts):.1f}")

    # Graph stats
    print(f"\nTransaction Graph:")
    print(f"  Total edges: {len(edges)}")
    edge_type_counts = {}
    for e in edges:
        et = e["edge_type"]
        edge_type_counts[et] = edge_type_counts.get(et, 0) + 1
    for et, count in sorted(edge_type_counts.items()):
        print(f"  {et:22s}: {count:5d}")

    # Unique nodes in graph
    all_nodes = set()
    for e in edges:
        all_nodes.add(e["source_id"])
        all_nodes.add(e["target_id"])
    print(f"  Unique nodes: {len(all_nodes)}")

    print("\n" + "=" * 70)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    """Generate all training data files."""
    print("=" * 70)
    print("TrustAI — Real-World Indian Micro-Lending Data Generator")
    print("Calibrated to MUDRA, PMJDY, NPCI, and RBI statistics")
    print("=" * 70)

    output_dir = Path(__file__).parent
    set_seed(RANDOM_SEED)
    rng = np.random.RandomState(RANDOM_SEED)

    # Try downloading external data (optional enrichment)
    try_download_kaggle_csv(output_dir)

    # Generate merchant profiles
    print(f"\n[1/3] Generating {NUM_MERCHANTS} merchant profiles...")
    merchants = generate_merchant_profiles(NUM_MERCHANTS, rng)

    # Generate transaction graph
    print(f"\n[2/3] Generating transaction graph...")
    edges = generate_transaction_graph(merchants, rng)

    # Write CSVs
    print(f"\n[3/3] Writing CSV files...")
    write_merchant_profiles(merchants, output_dir)
    write_transaction_graph(edges, output_dir)
    write_training_labels(merchants, output_dir)

    # Print summary
    print_data_summary(merchants, edges)

    print(f"\nAll files written to: {output_dir}")
    print("Run `python retrain_models.py` to train GNN and TCN on this data.\n")


if __name__ == "__main__":
    main()
