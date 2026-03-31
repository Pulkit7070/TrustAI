import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle, ArrowLeft, RefreshCw, Zap, Store, Clock, MapPin, ArrowRight, Wallet } from 'lucide-react';
import { API_BASE } from '../lib/api';

const FALLBACK_PROFILES = [
  { id: 'approved', label: 'Strong Merchant (Approved)' },
  { id: 'structured', label: 'Moderate Merchant (Structured)' },
  { id: 'rejected', label: 'Risky Borrower (Rejected)' },
  { id: 'fraud', label: 'Fraudulent Actor (Fraud Alert)' },
];
const money = (n) => `INR ${(n || 0).toLocaleString()}`;

const MetricCard = ({ label, value, subtext, tone = 'text-green-400' }) => (
  <div className="glass-panel p-4 rounded-xl border border-white/5 bg-white/5">
    <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">{label}</div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    <div className={`text-xs font-medium ${tone}`}>{subtext}</div>
  </div>
);

export default function UserDashboard({ onBack, loanStatus = 'none', onApplyLoan, onNavigateTo, setStructuredRequest }) {
  const [profiles, setProfiles] = useState(FALLBACK_PROFILES);
  const [selectedProfile, setSelectedProfile] = useState('structured');
  const [profileData, setProfileData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loanAmount, setLoanAmount] = useState(12000);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [improvementMode, setImprovementMode] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [improvedAnalysis, setImprovedAnalysis] = useState(null);
  const [financingStep, setFinancingStep] = useState(0);
  const [shopDetail, setShopDetail] = useState(null);
  const [cart, setCart] = useState({});
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE}/swarm/profiles`).then((r) => r.json()).then((d) => Array.isArray(d?.profiles) && d.profiles.length && setProfiles(d.profiles)).catch(() => {});
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    setFinancingStep(0);
    setShopDetail(null);
    setCart({});
    setImprovementMode(false);
    setImprovedAnalysis(null);
    const load = async () => {
      try {
        const profileRes = await fetch(`${API_BASE}/swarm/profiles/${selectedProfile}`);
        const profile = await profileRes.json();
        if (!profileRes.ok) throw new Error('Could not load profile');
        const analysisRes = await fetch(`${API_BASE}/swarm/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchant_id: profile.merchant_id, loan_amount: profile.loan_amount, items: profile.items, transaction_data: profile.transaction_data }),
        });
        const analysisData = await analysisRes.json();
        if (!analysisRes.ok) throw new Error('Could not load analysis');
        if (!ignore) {
          setProfileData(profile);
          setAnalysis(analysisData);
          setLoanAmount(profile.loan_amount || 0);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Backend unavailable');
          setProfileData(null);
          setAnalysis(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, [selectedProfile, refreshTick]);

  useEffect(() => {
    if (financingStep === 4 && loanStatus === 'rejected') {
      const timer = setTimeout(() => onNavigateTo?.('shopkeeper'), 1800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [financingStep, loanStatus, onNavigateTo]);

  const weeklyData = profileData?.transaction_data?.weekly_data || [];
  const chartData = useMemo(() => !weeklyData.length ? [] : weeklyData.map((item, index) => improvementMode && index >= Math.max(weeklyData.length - 4, 0) ? { ...item, savings: item.savings + 450, spending: Math.max(0, item.spending - 250) } : item), [weeklyData, improvementMode]);
  const metrics = useMemo(() => {
    const incomes = chartData.map((item) => item.income);
    const savings = chartData.map((item) => item.savings);
    const avgIncome = incomes.length ? incomes.reduce((sum, v) => sum + v, 0) / incomes.length : 0;
    const spread = avgIncome ? Math.min(1, (Math.max(...incomes, 0) - Math.min(...incomes, 0)) / avgIncome) : 1;
    const savingsRate = avgIncome ? Math.max(0, savings.reduce((sum, v) => sum + v, 0) / incomes.reduce((sum, v) => sum + v, 0)) : 0;
    return {
      incomeStability: `${Math.round((1 - spread) * 100)}%`,
      savingsRate: `${Math.round(savingsRate * 100)}%`,
      positiveWeeks: savings.filter((v) => v > 0).length,
      paymentReliability: `${Math.round((1 - (analysis?.fraud_score || 0)) * 100)}%`,
    };
  }, [chartData, analysis]);

  const partnerProfiles = profiles.filter((profile) => profile.id !== 'fraud');
  const cartItems = (shopDetail?.items || []).map((item, index) => ({ ...item, id: `${index}-${item.name}` }));
  const cartTotal = cartItems.reduce((sum, item) => sum + ((cart[item.id] || 0) * item.price), 0);

  const toggleSimulation = async () => {
    if (improvementMode) {
      setImprovementMode(false);
      setImprovedAnalysis(null);
      return;
    }
    if (!profileData?.transaction_data) return;
    setSimulating(true);
    try {
      const txData = profileData.transaction_data;
      const improved_weekly = (txData.weekly_data || []).map((item, index, arr) => {
        if (index >= Math.max(arr.length - 4, 0)) {
          return { ...item, savings: item.savings + 450, spending: Math.max(0, item.spending - 250), upi_txns: (item.upi_txns || 0) + 3 };
        }
        return item;
      });
      const improvedTxData = { ...txData, weekly_data: improved_weekly };
      const res = await fetch(`${API_BASE}/swarm/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: profileData.merchant_id, loan_amount: profileData.loan_amount, items: profileData.items, transaction_data: improvedTxData }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error('Improvement analysis failed');
      setImprovedAnalysis(result);
      setImprovementMode(true);
    } catch (err) {
      setError(err.message || 'Improvement analysis failed');
    } finally {
      setSimulating(false);
    }
  };

  const handleApply = async () => {
    if (!profileData) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/swarm/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: profileData.merchant_id, loan_amount: Number(loanAmount), items: profileData.items, transaction_data: profileData.transaction_data }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error('Loan evaluation failed');
      setAnalysis(result);
      onApplyLoan?.({ decision: result.decision === 'approved' ? 'approved' : 'rejected', analysis: result, profileData });
      setShowApplicationModal(false);
    } catch (err) {
      setError(err.message || 'Loan evaluation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const chooseShop = async (profile) => {
    try {
      const response = await fetch(`${API_BASE}/swarm/profiles/${profile.id}`);
      const detail = await response.json();
      if (!response.ok) throw new Error('Could not load partner inventory');
      setShopDetail(detail);
      setCart({});
      setFinancingStep(3);
    } catch (err) {
      setError(err.message || 'Could not load partner inventory');
    }
  };

  const submitStructuredRequest = () => {
    if (!shopDetail || !profileData) return;
    const items = cartItems.filter((item) => (cart[item.id] || 0) > 0).map((item) => ({ name: item.name, qty: cart[item.id], price: item.price }));
    if (!items.length) return;
    setStructuredRequest?.({
      merchant_id: shopDetail.merchant_id,
      merchant_name: shopDetail.merchant_name,
      borrower_id: profileData.borrower_id || profileData.farmer_id,
      borrower_name: profileData.borrower_name || profileData.farmer_name,
      userName: profileData.borrower_name || profileData.farmer_name,
      userLocation: profileData.merchant_name,
      items,
      total: cartTotal,
      riskScore: analysis?.composite_risk || 0,
      gnnConfidence: analysis?.gnn_confidence || 0,
      tcnStability: analysis?.tcn_stability || 0,
      rejectionReason: analysis?.decision_reason || 'Direct cash lending was not approved.',
      analysis,
    });
    setFinancingStep(4);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-8 pt-24 font-sans selection:bg-cyan-500/30">
      <header className="max-w-6xl mx-auto mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center text-white/50 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5 mr-2" /> Back</button>
          <h1 className="text-2xl font-bold">Borrower Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profiles.map((profile) => <button key={profile.id} onClick={() => setSelectedProfile(profile.id)} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${selectedProfile === profile.id ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'}`}>{profile.label}</button>)}
          <button onClick={() => setRefreshTick((tick) => tick + 1)} className="px-3 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 flex items-center gap-2"><RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
      </header>

      <AnimatePresence>
        {loanStatus === 'rejected' && analysis && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto mb-8 p-6 rounded-2xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-red-500/20"><AlertCircle className="w-6 h-6 text-red-500" /></div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-1">Cash Credit Not Approved</h2>
                <p className="text-sm text-gray-400 mb-4">{analysis.decision_reason}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-red-500/10">
                  <div><div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Composite Risk</div><div className="text-lg font-mono font-bold text-red-400">{analysis.composite_risk?.toFixed(4)}</div></div>
                  <div><div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Behavioral Stability</div><div className="text-lg font-mono font-bold text-red-400">{analysis.tcn_stability?.toFixed(4)}</div></div>
                  <div><div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Primary Signal</div><div className="text-lg font-bold text-white">{analysis.feature_importance?.[0]?.name || 'Fraud and cashflow pressure'}</div></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`lg:col-span-2 space-y-6 transition-opacity duration-500 ${financingStep > 0 ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
          <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-6 gap-4">
              <div><h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-cyan-400" />Financial Behavior</h2><p className="text-xs text-gray-400">{profileData?.merchant_name || 'Loading profile...'} | 12-week view</p></div>
              <button onClick={toggleSimulation} disabled={simulating || !chartData.length} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${improvementMode ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'}`}>{simulating ? <><RefreshCw className="w-3 h-3 animate-spin" /> Analyzing...</> : <><Zap className="w-3 h-3" />{improvementMode ? 'Reset to Original' : 'Simulate Improvement'}</>}</button>
            </div>
            <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                    <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="week" stroke="#ffffff40" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="spending" stroke="#ef4444" strokeWidth={2} fillOpacity={0} fill="transparent" strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="savings" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSavings)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <MetricCard label="Income Stability" value={metrics.incomeStability} subtext={improvementMode ? 'Scenario improved' : 'Observed baseline'} />
              <MetricCard label="Savings Rate" value={metrics.savingsRate} subtext={`${metrics.positiveWeeks} positive weeks`} tone={metrics.positiveWeeks > 8 ? 'text-green-400' : 'text-yellow-400'} />
              <MetricCard label="Payment Reliability" value={metrics.paymentReliability} subtext={analysis?.fraud_flags?.length ? `${analysis.fraud_flags.length} flags detected` : 'No major flags'} tone={analysis?.fraud_flags?.length ? 'text-yellow-400' : 'text-green-400'} />
              <MetricCard label="Recommendation" value={((improvementMode && improvedAnalysis ? improvedAnalysis.decision : analysis?.decision) || 'pending').toUpperCase()} subtext={error || (loading ? 'Loading...' : 'Live underwriting state')} tone={(improvementMode && improvedAnalysis ? improvedAnalysis.decision : analysis?.decision) === 'approved' ? 'text-green-400' : (improvementMode && improvedAnalysis ? improvedAnalysis.decision : analysis?.decision) === 'structured' ? 'text-yellow-400' : 'text-red-400'} />
            </div>
            {improvementMode && improvedAnalysis && analysis && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-5 rounded-xl border border-green-500/20 bg-green-500/5">
                <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-4">Score Comparison: Original vs Improved</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">GNN Confidence</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-mono text-gray-400 line-through">{analysis.gnn_confidence?.toFixed(4)}</span>
                      <span className="text-lg font-mono font-bold text-green-400">{improvedAnalysis.gnn_confidence?.toFixed(4)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">TCN Stability</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-mono text-gray-400 line-through">{analysis.tcn_stability?.toFixed(4)}</span>
                      <span className="text-lg font-mono font-bold text-green-400">{improvedAnalysis.tcn_stability?.toFixed(4)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Composite Risk</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-mono text-gray-400 line-through">{analysis.composite_risk?.toFixed(4)}</span>
                      <span className={`text-lg font-mono font-bold ${improvedAnalysis.composite_risk < analysis.composite_risk ? 'text-green-400' : 'text-red-400'}`}>{improvedAnalysis.composite_risk?.toFixed(4)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Decision</div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-sm font-bold line-through ${analysis.decision === 'approved' ? 'text-green-400/50' : analysis.decision === 'structured' ? 'text-yellow-400/50' : 'text-red-400/50'}`}>{(analysis.decision || '').toUpperCase()}</span>
                      <span className={`text-lg font-bold ${improvedAnalysis.decision === 'approved' ? 'text-green-400' : improvedAnalysis.decision === 'structured' ? 'text-yellow-400' : 'text-red-400'}`}>{(improvedAnalysis.decision || '').toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
          {loanStatus === 'rejected' && financingStep === 0 && <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-black/40"><h3 className="text-2xl font-bold text-white mb-2">Alternative Supply Financing Available</h3><p className="text-gray-400 mb-8 max-w-xl text-lg">The system can still route approved inventory financing through verified merchant partners instead of direct cash lending.</p><button onClick={() => setFinancingStep(1)} className="px-8 py-4 bg-[var(--cyber-green)] hover:bg-[#00cc7d] text-black font-bold rounded-xl shadow-[0_0_30px_rgba(0,255,157,0.3)] transition-all flex items-center gap-2 text-lg">Explore Structured Financing <ArrowRight className="w-5 h-5" /></button></motion.div>}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <AnimatePresence mode="wait">
            {financingStep === 0 ? (
              <motion.div key="status-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-panel p-6 rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-black/40 min-h-[420px] flex flex-col">
                <h2 className="text-lg font-bold mb-6">Loan Application</h2>
                <div className="flex-1 flex flex-col justify-center text-center">
                  {loanStatus === 'approved' ? <><div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 border border-green-500/20 mx-auto"><CheckCircle className="w-8 h-8 text-green-400" /></div><h3 className="text-xl font-bold text-white mb-2">Direct Loan Approved</h3><p className="text-sm text-gray-400 mb-6">{analysis?.decision_reason}</p><div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left"><div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Approved Amount</div><div className="text-2xl font-bold text-[var(--cyber-green)]">{money(loanAmount)}</div></div></> : loanStatus === 'structured_approved' ? <><div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 border border-green-500/20 mx-auto"><Store className="w-8 h-8 text-green-400" /></div><h3 className="text-xl font-bold text-white mb-2">Structured Financing Approved</h3><p className="text-sm text-gray-400 mb-6">Merchant-side financing is ready for pickup and fulfilment.</p></> : loanStatus === 'structured_rejected' ? <><div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20 mx-auto"><AlertCircle className="w-8 h-8 text-red-500" /></div><h3 className="text-xl font-bold text-white mb-2">Merchant Declined the Request</h3><p className="text-sm text-gray-400 mb-6">Choose another partner or adjust the requested basket.</p><button onClick={() => setFinancingStep(2)} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-xs font-bold uppercase tracking-widest">Try Another Partner</button></> : <><div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 mx-auto"><Wallet className="w-8 h-8 text-cyan-400" /></div><h3 className="text-xl font-bold text-white mb-2">Live Credit Evaluation</h3><p className="text-sm text-gray-400 mb-6">{error || (loading ? 'Fetching merchant profile and underwriting signals...' : `Current recommendation: ${(analysis?.decision || 'pending').toUpperCase()}`)}</p><div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left mb-6"><div className="flex justify-between text-sm mb-2"><span className="text-gray-400">Merchant</span><span className="text-white">{profileData?.merchant_name || '--'}</span></div><div className="flex justify-between text-sm mb-2"><span className="text-gray-400">Composite Risk</span><span className="text-cyan-400 font-mono">{analysis?.composite_risk?.toFixed(4) || '--'}</span></div><div className="flex justify-between text-sm"><span className="text-gray-400">Requested Amount</span><span className="text-white">{money(loanAmount)}</span></div></div><button onClick={() => setShowApplicationModal(true)} disabled={loading} className="w-full py-3 bg-[var(--cyber-green)] text-black font-bold rounded-xl hover:bg-[#00cc7d] transition-colors disabled:opacity-50">Evaluate Loan Request</button></>}
                </div>
              </motion.div>
            ) : (
              <motion.div key="financing-flow" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="glass-panel p-6 rounded-2xl border border-[var(--cyber-green)]/30 bg-black/80 min-h-[500px] flex flex-col">
                {financingStep === 1 && <div className="flex-1 flex flex-col items-center justify-center text-center"><div className="w-16 h-16 rounded-full bg-[var(--cyber-green)]/20 flex items-center justify-center mb-6 border border-[var(--cyber-green)]/40"><Store className="w-8 h-8 text-[var(--cyber-green)]" /></div><h3 className="text-xl font-bold text-white mb-4">Structured Supply Financing</h3><p className="text-gray-400 text-sm mb-8 leading-relaxed">Pick a verified merchant partner, request inventory, and route the disbursal directly to that merchant instead of to the borrower.</p><button onClick={() => setFinancingStep(2)} className="w-full py-3 bg-[var(--cyber-green)] text-black font-bold rounded-xl hover:bg-[#00cc7d]">Find Verified Partners</button></div>}
                {financingStep === 2 && <div className="flex-1 flex flex-col"><h3 className="text-lg font-bold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-[var(--cyber-green)]" />Select Merchant Partner</h3><div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">{partnerProfiles.map((profile) => <button key={profile.id} onClick={() => chooseShop(profile)} className="w-full text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[var(--cyber-green)]/50 transition-all"><div className="flex justify-between items-start mb-2"><h4 className="font-bold text-white">{profile.label}</h4><span className="text-xs bg-[var(--cyber-green)]/20 text-[var(--cyber-green)] px-2 py-0.5 rounded">LIVE</span></div><div className="text-xs text-gray-400">{profile.merchant_name || 'Partner merchant profile'}</div></button>)}</div></div>}
                {financingStep === 3 && <div className="flex-1 flex flex-col"><h3 className="text-lg font-bold mb-2">{shopDetail?.merchant_name}</h3><p className="text-xs text-gray-500 mb-6">Select items for merchant-routed financing</p><div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 mb-4">{cartItems.map((item) => <div key={item.id} className={`p-3 rounded-xl border transition-all flex justify-between items-center ${cart[item.id] ? 'bg-[var(--cyber-green)]/10 border-[var(--cyber-green)]' : 'bg-white/5 border-white/10'}`}><div><div className="font-medium text-sm text-white">{item.name}</div><div className="text-xs text-gray-400">{money(item.price)}</div></div><div className="flex items-center gap-3">{cart[item.id] > 0 && <button onClick={() => setCart((prev) => ({ ...prev, [item.id]: prev[item.id] - 1 }))} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">-</button>}<span className={`text-sm font-mono ${cart[item.id] ? 'text-white' : 'text-gray-600'}`}>{cart[item.id] || 0}</span><button onClick={() => setCart((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">+</button></div></div>)}</div><div className="border-t border-white/10 pt-4"><div className="flex justify-between items-center mb-4"><span className="text-sm text-gray-400">Total Request</span><span className="text-xl font-bold text-[var(--cyber-green)] font-mono">{money(cartTotal)}</span></div><button onClick={submitStructuredRequest} disabled={cartTotal === 0} className="w-full py-3 bg-[var(--cyber-green)] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl hover:bg-[#00cc7d]">Submit Structured Request</button></div></div>}
                {financingStep === 4 && <div className="flex-1 flex flex-col items-center justify-center text-center"><div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6 border border-yellow-500/20 animate-pulse"><Clock className="w-10 h-10 text-yellow-500" /></div><h3 className="text-xl font-bold text-white mb-2">Structured Financing Request Sent</h3><p className="text-gray-400 text-sm mb-8">Waiting for {shopDetail?.merchant_name} to confirm inventory availability and trigger merchant payment.</p><button onClick={() => onNavigateTo?.('shopkeeper')} className="text-xs text-gray-500 underline hover:text-[var(--cyber-green)]">Open Merchant View</button></div>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {showApplicationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm glass-panel bg-[#0B0E14] border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Confirm Application</h3>
              <div className="mb-4"><label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Loan Amount</label><div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-2"><span className="text-gray-400 mr-2">INR</span><input type="number" value={loanAmount} onChange={(e) => setLoanAmount(Number(e.target.value))} className="bg-transparent border-none outline-none text-white w-full font-mono" /></div></div>
              <div className="mb-4 text-xs text-gray-500">Merchant: {profileData?.merchant_name || '--'}</div>
              <div className="flex gap-3"><button onClick={() => setShowApplicationModal(false)} className="flex-1 py-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">Cancel</button><button onClick={handleApply} className="flex-1 py-3 bg-[var(--cyber-green)] text-black font-bold rounded-lg hover:bg-[#00cc7d] transition-colors flex items-center justify-center gap-2">{isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm'}</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
