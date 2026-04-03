#!/bin/bash
# TrustAI Backend Deploy Script — Run this in your terminal
# Usage: bash deploy-backend.sh

set -e

echo "=== TrustAI Backend Deployment ==="
echo ""

# Step 1: Login
echo "[1/4] Logging into Railway..."
railway login

# Step 2: Init project
echo "[2/4] Creating Railway project..."
railway init --name trustai-api

# Step 3: Link and deploy
echo "[3/4] Deploying backend (this takes ~5 min for PyTorch)..."
cd backend_agents
railway up --detach

# Step 4: Get URL
echo "[4/4] Generating public domain..."
railway domain

echo ""
echo "=== DONE ==="
echo "Copy the URL above and set it as VITE_API_BASE in Vercel:"
echo "  vercel env add VITE_API_BASE production"
echo "Then redeploy: vercel --prod"
