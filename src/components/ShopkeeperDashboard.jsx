import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Store, User, ShieldCheck, AlertCircle, CheckCircle, ArrowLeft,
  BarChart3, Network, Coins, HeartPulse, Truck, RefreshCw, CreditCard
} from 'lucide-react';
import { API_BASE } from '../lib/api';

const money = (n) => `INR ${(n || 0).toLocaleString()}`;

const AIInsightCard = ({ title, value, label, icon: Icon, color }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2 text-gray-400">
      <Icon className="w-4 h-4" />
      <span className="text-xs uppercase tracking-wider font-medium">{title}</span>
    </div>
    <div className={`text-xl font-bold ${color}`}>{value}</div>
    <div className="text-[10px] text-gray-500 mt-1">{label}</div>
  </div>
);

const fallbackRequest = {
  merchant_id: 'SGS-205',
  merchant_name: 'Singh General Store',
  borrower_id: 'BRW-042',
  borrower_name: 'Amit Patel',
  userName: 'Amit Patel',
  userLocation: 'Moderate Merchant Profile',
  items: [
    { name: 'POS Terminal (Smart)', qty: 5, price: 1350 },
    { name: 'Receipt Paper Rolls (Box)', qty: 10, price: 450 },
  ],
  total: 12000,
  riskScore: 0.42,
  gnnConfidence: 0.61,
  tcnStability: 0.58,
  rejectionReason: 'Direct cash lending was not approved, but merchant-routed supply financing remains viable.',
};

export default function ShopkeeperDashboard({ onBack, requestData, onDecision }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);

  const activeRequest = requestData || fallbackRequest;
  const fraudFlags = activeRequest.analysis?.fraud_flags || [];
  const recommendation = activeRequest.analysis?.decision || 'structured';
  const compositeRisk = activeRequest.analysis?.composite_risk ?? activeRequest.riskScore;

  const insightTone = useMemo(() => {
    if (compositeRisk <= 0.3) return { color: 'text-green-400', label: 'Low risk' };
    if (compositeRisk <= 0.6) return { color: 'text-yellow-400', label: 'Moderate risk' };
    return { color: 'text-red-400', label: 'High risk' };
  }, [compositeRisk]);

  const handleDecision = async (decision) => {
    if (decision === 'rejected') {
      onDecision?.('rejected');
      onBack?.();
      return;
    }

    setIsProcessing(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/mcp/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: activeRequest.merchant_id,
          amount: activeRequest.total,
          items: activeRequest.items,
          customer_id: activeRequest.borrower_id || activeRequest.farmer_id,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.detail || 'Payment initiation failed');
      setPaymentResult(result);
      onDecision?.('approved', result);
      setTimeout(() => onBack?.(), 1200);
    } catch (err) {
      setError(err.message || 'Payment initiation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 pt-24 font-sans selection:bg-[var(--cyber-green)]">
      <header className="max-w-6xl mx-auto mb-12 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Store className="w-6 h-6 text-[var(--cyber-green)]" />
              Merchant Node Dashboard
            </h1>
            <p className="text-xs text-gray-500">Shop: {activeRequest.merchant_name} | Partner ID: {activeRequest.merchant_id} | Paytm MCP Connected</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest">Requested Supply Credit</div>
          <div className="text-sm font-mono text-cyan-400">{money(activeRequest.total)}</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Incoming Request</h2>
          <div className="p-4 rounded-2xl bg-[var(--cyber-green)]/10 border border-[var(--cyber-green)]/30">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center border border-white/5">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">{activeRequest.userName || activeRequest.borrower_name || activeRequest.farmer_name}</h3>
                  <p className="text-[10px] text-gray-500">{activeRequest.userLocation || activeRequest.borrower_id || activeRequest.farmer_id}</p>
                </div>
              </div>
              <span className="text-[10px] bg-[var(--cyber-green)]/20 text-[var(--cyber-green)] px-2 py-0.5 rounded font-bold">NEW</span>
            </div>
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-gray-400">Decision from Bank</span>
              <span className={`font-bold ${recommendation === 'structured' ? 'text-yellow-400' : recommendation === 'approved' ? 'text-green-400' : 'text-red-400'}`}>{recommendation.toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Structured Total</span>
              <span className="font-mono text-white font-bold">{money(activeRequest.total)}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent relative overflow-hidden">
            <div className="flex items-center gap-2 mb-8">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold">Risk Summary from Bank</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <AIInsightCard title="Composite Risk" value={compositeRisk?.toFixed(4)} label={insightTone.label} icon={HeartPulse} color={insightTone.color} />
              <AIInsightCard title="Relational Stability" value={`${Math.round((activeRequest.gnnConfidence || 0) * 100)}%`} label="Merchant graph confidence" icon={Network} color="text-blue-400" />
              <AIInsightCard title="Temporal Discipline" value={`${Math.round((activeRequest.tcnStability || 0) * 100)}%`} label="Behavioral consistency" icon={BarChart3} color="text-purple-400" />
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8">
              <div className="flex items-center gap-2 text-red-400 mb-2 font-bold text-xs uppercase tracking-wider">
                <AlertCircle className="w-4 h-4" /> Reason Direct Cash Was Blocked
              </div>
              <p className="text-xs text-gray-300 leading-relaxed italic">"{activeRequest.rejectionReason}"</p>
            </div>

            <div className="mb-8">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Requested Inventory</h3>
              <div className="space-y-2">
                {activeRequest.items.map((item) => (
                  <div key={`${item.name}-${item.qty}`} className="flex justify-between items-center p-3 rounded-lg bg-black/40 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[var(--cyber-green)]" />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <div className="text-sm font-mono">
                      <span className="text-gray-500">x{item.qty}</span>
                      <span className="ml-4 text-white">{money(item.qty * item.price)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center p-3 mt-4 border-t border-white/10">
                  <span className="font-bold text-white uppercase text-xs tracking-widest">Total Supply Credit</span>
                  <span className="text-xl font-bold text-[var(--cyber-green)] font-mono">{money(activeRequest.total)}</span>
                </div>
              </div>
            </div>

            <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/5 relative h-40 flex items-center justify-center">
              <div className="relative z-10 w-full flex justify-between px-8 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                <div className="flex flex-col items-center gap-1"><Coins className="w-4 h-4 text-cyan-400" /><span>Bank Funds Shop</span></div>
                <div className="flex flex-col items-center gap-1"><Truck className="w-4 h-4 text-[var(--cyber-green)]" /><span>Shop Supplies User</span></div>
                <div className="flex flex-col items-center gap-1"><CreditCard className="w-4 h-4 text-white" /><span>User Repays Bank</span></div>
              </div>
            </div>

            {fraudFlags.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Fraud Flags</h3>
                <div className="space-y-2">
                  {fraudFlags.map((flag) => (
                    <div key={flag.type} className={`flex items-center gap-2 text-[11px] px-3 py-2 rounded ${flag.severity === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      <AlertCircle className="w-3 h-3" />
                      <span className="font-mono">{flag.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {paymentResult && (
              <div className="mb-8 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-400 mb-2 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle className="w-4 h-4" /> Merchant Payment Triggered
                </div>
                <div className="text-sm text-gray-300">Transaction ID: <span className="font-mono text-[var(--cyber-green)]">{paymentResult.txn_id || paymentResult.transaction_id}</span></div>
              </div>
            )}

            {error && <div className="mb-6 text-sm text-red-400">{error}</div>}

            <div className="flex gap-4">
              <button onClick={() => handleDecision('rejected')} className="flex-1 py-4 rounded-2xl border border-red-500/20 hover:bg-red-500/10 text-red-400 font-bold transition-all text-sm uppercase tracking-wider">
                Decline Credit
              </button>
              <button onClick={() => handleDecision('approved')} disabled={isProcessing} className="flex-[2] py-4 rounded-2xl bg-[var(--cyber-green)] hover:bg-[#00cc7d] disabled:opacity-60 text-black font-extrabold transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,255,157,0.2)]">
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Approve Structured Financing</>}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
