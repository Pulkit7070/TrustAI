import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE, WS_BASE } from '../lib/api';

const BUSINESS_TYPES = [
  'Kirana / General Store',
  'Electronics & Mobile',
  'Agriculture Supply',
  'Textile & Garments',
  'Food Stall / Restaurant',
  'Medical / Pharmacy',
  'Hardware & Tools',
  'Stationery & Books',
  'Auto Parts & Services',
  'Beauty & Salon',
];

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune',
  'Lucknow', 'Jaipur', 'Indore', 'Patna', 'Varanasi',
  'Bhopal', 'Nagpur', 'Surat', 'Coimbatore', 'Agra',
];

const LOAN_PURPOSES = [
  { label: 'Inventory Restock', items: [{ name: 'FMCG Stock (assorted)', qty: 5, price: 1350 }] },
  { label: 'Equipment Purchase', items: [{ name: 'Commercial Equipment', qty: 1, price: 15000 }] },
  { label: 'Shop Expansion', items: [{ name: 'Renovation Materials', qty: 1, price: 25000 }] },
  { label: 'Seasonal Stock', items: [{ name: 'Seasonal Inventory', qty: 10, price: 800 }] },
  { label: 'Vehicle / Delivery', items: [{ name: 'Delivery Vehicle', qty: 1, price: 45000 }] },
  { label: 'Custom', items: [] },
];

const agentColor = (agent) => {
  if (agent === 'ANALYST') return 'text-blue-400';
  if (agent === 'VERIFIER') return 'text-amber-400';
  if (agent === 'VALIDATOR') return 'text-emerald-400';
  if (agent === 'DISBURSER' || agent === 'SWARM') return 'text-emerald-500';
  if (agent === 'PLANNER') return 'text-violet-400';
  return 'text-zinc-400';
};

const decisionStyle = {
  approved: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'ELIGIBLE FOR DLG LENDING' },
  structured: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', label: 'RESTRUCTURED' },
  rejected: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'REJECTED' },
};

export default function LoanApplication({ onBack }) {
  const [step, setStep] = useState(1); // 1=form, 2=processing, 3=result
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const logRef = useRef(null);

  // Form state
  const [form, setForm] = useState({
    businessName: '',
    businessType: BUSINESS_TYPES[0],
    city: INDIAN_CITIES[0],
    monthlyIncome: 25000,
    monthlyExpense: 18000,
    upiCount: 40,
    qrPayments: 15,
    soundboxActive: true,
    avgTicket: 500,
    uniqueCustomers: 50,
    monthsActive: 12,
    loanAmount: 50000,
    loanPurpose: LOAN_PURPOSES[0].label,
    customItemName: '',
    customItemQty: 1,
    customItemPrice: 1000,
  });

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [logs]);

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  // --- Preview score from backend (debounced) ---
  const [preview, setPreview] = useState(null);        // { gnn_confidence, tcn_stability, composite_risk, decision_hint, feature_importance }
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewTimer = useRef(null);

  const fetchPreviewScore = useCallback(async (currentForm) => {
    setPreviewLoading(true);
    const purpose = LOAN_PURPOSES.find((p) => p.label === currentForm.loanPurpose);
    const items = currentForm.loanPurpose === 'Custom'
      ? [{ name: currentForm.customItemName || 'Custom Item', qty: currentForm.customItemQty, price: currentForm.customItemPrice }]
      : purpose?.items || [];
    try {
      const res = await fetch(`${API_BASE}/swarm/preview-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: currentForm.businessName || 'Unnamed Business',
          business_type: currentForm.businessType,
          city: currentForm.city,
          monthly_income: currentForm.monthlyIncome,
          monthly_expense: currentForm.monthlyExpense,
          upi_count: currentForm.upiCount,
          qr_payments: currentForm.qrPayments,
          soundbox_active: currentForm.soundboxActive,
          avg_ticket: currentForm.avgTicket,
          unique_customers: currentForm.uniqueCustomers,
          months_active: currentForm.monthsActive,
          loan_amount: currentForm.loanAmount,
          loan_purpose: currentForm.loanPurpose,
          items,
        }),
      });
      const data = await res.json();
      setPreview(data);
    } catch {
      // keep previous preview (or null) — the UI will show nothing rather than fake scores
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step !== 1) return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => fetchPreviewScore(form), 800);
    return () => clearTimeout(previewTimer.current);
  }, [form, step, fetchPreviewScore]);

  const randomizeProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/swarm/random-profile`);
      const p = await res.json();
      setForm((f) => ({
        ...f,
        businessName: p.business_name || f.businessName,
        businessType: BUSINESS_TYPES.find((t) => t.includes(p.business_type)) || f.businessType,
        city: INDIAN_CITIES.includes(p.city) ? p.city : f.city,
        monthlyIncome: p.monthly_income || f.monthlyIncome,
        monthlyExpense: p.monthly_expense || f.monthlyExpense,
        upiCount: p.upi_count ?? f.upiCount,
        qrPayments: p.qr_payments ?? f.qrPayments,
        soundboxActive: p.soundbox_active ?? f.soundboxActive,
        avgTicket: p.avg_ticket || f.avgTicket,
        uniqueCustomers: p.unique_customers || f.uniqueCustomers,
        monthsActive: p.months_active || f.monthsActive,
        loanAmount: p.loan_amount || f.loanAmount,
      }));
    } catch {
      // Randomize locally as fallback
      const incomes = [8000, 12000, 18000, 25000, 35000, 50000, 75000];
      const income = incomes[Math.floor(Math.random() * incomes.length)];
      setForm((f) => ({
        ...f,
        businessName: BUSINESS_TYPES[Math.floor(Math.random() * BUSINESS_TYPES.length)].split('/')[0].trim() + ' Store',
        monthlyIncome: income,
        monthlyExpense: Math.round(income * (0.6 + Math.random() * 0.4)),
        upiCount: Math.floor(Math.random() * 150),
        qrPayments: Math.floor(Math.random() * 50),
        soundboxActive: Math.random() > 0.5,
        avgTicket: [50, 120, 300, 500, 800, 1500][Math.floor(Math.random() * 6)],
        uniqueCustomers: Math.floor(5 + Math.random() * 150),
        monthsActive: Math.floor(1 + Math.random() * 48),
        loanAmount: [5000, 15000, 25000, 50000, 100000][Math.floor(Math.random() * 5)],
      }));
    }
  };

  const generateWeeklyData = () => {
    const weeks = [];
    for (let i = 0; i < 12; i++) {
      const variance = 0.15 + Math.random() * 0.2;
      const income = Math.round(form.monthlyIncome / 4 * (1 + (Math.random() - 0.5) * variance));
      const spending = Math.round(form.monthlyExpense / 4 * (1 + (Math.random() - 0.5) * variance));
      weeks.push({ week: `W${i + 1}`, income, spending, savings: income - spending });
    }
    return weeks;
  };

  const submitApplication = async () => {
    setStep(2);
    setLogs([
      { ts: '0', src: 'SWARM', msg: 'UPI merchant application received — initializing agent swarm...' },
      { ts: '0', src: 'PLANNER', msg: 'Decomposing UPI transaction graph...' },
      { ts: '0', src: 'ANALYST', msg: 'Scoring Soundbox merchant graph with GNN...' },
      { ts: '0', src: 'VERIFIER', msg: 'Checking for mule accounts and cash-out patterns...' },
      { ts: '0', src: 'VALIDATOR', msg: 'Computing composite UPI credit score...' },
      { ts: '0', src: 'DISBURSER', msg: 'Creating purpose-locked payment link via Paytm MCP...' },
    ]);

    const purpose = LOAN_PURPOSES.find((p) => p.label === form.loanPurpose);
    const items = form.loanPurpose === 'Custom'
      ? [{ name: form.customItemName || 'Custom Item', qty: form.customItemQty, price: form.customItemPrice }]
      : purpose?.items || [];

    const merchantId = `USR-${Date.now().toString(36).toUpperCase()}`;
    const payload = {
      merchant_id: merchantId,
      merchant_name: form.businessName || 'Unnamed Business',
      borrower_id: `BRW-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      borrower_name: 'Applicant',
      loan_amount: form.loanAmount,
      items,
      transaction_data: {
        upi_monthly_count: form.upiCount,
        qr_payments_count: form.qrPayments,
        soundbox_active: form.soundboxActive,
        soundbox_txn_count: form.soundboxActive ? Math.round(form.upiCount * 0.6) : 0,
        avg_ticket_size: form.avgTicket,
        unique_customers: form.uniqueCustomers,
        months_active: form.monthsActive,
        monthly_income: form.monthlyIncome,
        monthly_expense: form.monthlyExpense,
        p2p_received_monthly: Math.round(form.monthlyIncome * 0.1),
        p2p_sent_monthly: Math.round(form.monthlyIncome * 0.05),
        current_month_count: form.upiCount + form.qrPayments,
        avg_monthly_count: Math.round((form.upiCount + form.qrPayments) * 0.9),
        merchant_kyc_verified: true,
        repeat_customers: Math.round(form.uniqueCustomers * 0.6),
        new_customers_monthly: Math.round(form.uniqueCustomers * 0.15),
        settlement_amount: form.monthlyIncome * 3,
        loans_repaid: Math.max(0, Math.floor(form.monthsActive / 8)),
        default_rate: 0.0,
        merchant_tier: form.monthsActive >= 24 ? 3 : form.monthsActive >= 12 ? 2 : 1,
        weekly_data: generateWeeklyData(),
      },
    };

    try {
      const res = await fetch(`${API_BASE}/swarm/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      // Animate log entries — logs may be at top level or in state
      const rawLogs = data.logs || data.state?.logs || [];
      const logEntries = rawLogs.map((log) => ({
        ts: String(Math.round(log.latency_ms || 0)),
        src: log.agent,
        msg: log.detail,
      }));

      for (let i = 0; i < logEntries.length; i++) {
        await new Promise((r) => setTimeout(r, 180));
        setLogs((prev) => [...prev, logEntries[i]]);
      }

      await new Promise((r) => setTimeout(r, 400));
      setResult(data);
      setStep(3);
    } catch (err) {
      setLogs((prev) => [...prev, { ts: '--', src: 'ERROR', msg: `Backend error: ${err.message}` }]);
      // Fallback result — clearly marked as offline estimate
      setResult({
        decision: 'structured',
        success: true,
        offline_estimate: true,
        scores: { composite_risk: 0.35, gnn_confidence: 0.72, tcn_stability: 0.65, fraud_score: 0.05 },
        decision_reason: 'Moderate UPI risk profile — loan restructured through trusted Soundbox merchant.',
      });
      setStep(3);
    }
  };

  const resetForm = () => {
    setStep(1);
    setLogs([]);
    setResult(null);
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="text-zinc-500 hover:text-white text-sm">&larr; Back</button>
          <div className="w-px h-4 bg-zinc-800" />
          <h1 className="text-xl font-bold">Merchant Credit Score</h1>
          <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded ml-auto">LIVE PIPELINE</span>
        </div>
        <p className="text-sm text-zinc-500 -mt-5 mb-2 ml-16">UPI-native credit scoring for Soundbox merchants</p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 text-xs">
          {[
            { n: 1, label: 'Fill Details' },
            { n: 2, label: 'AI Processing' },
            { n: 3, label: 'Decision' },
          ].map((s, i) => (
            <React.Fragment key={s.n}>
              {i > 0 && <div className={`flex-1 h-px ${step >= s.n ? 'bg-emerald-500/40' : 'bg-zinc-800'}`} />}
              <div className={`flex items-center gap-1.5 ${step >= s.n ? 'text-emerald-400' : 'text-zinc-600'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                  ${step >= s.n ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-zinc-800/50 border border-zinc-800'}`}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Form */}
          {step === 1 && (
            <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="space-y-6">

                {/* Randomize button */}
                <button onClick={randomizeProfile} type="button"
                  className="w-full py-2 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:border-zinc-700 text-xs transition-colors">
                  Random Soundbox Merchant — Generate a realistic profile
                </button>

                {/* Business Info */}
                <fieldset className="rounded-xl border border-zinc-800/60 p-5 space-y-4">
                  <legend className="text-[11px] text-zinc-600 uppercase tracking-widest px-2">Business Information</legend>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Business Name</label>
                      <input type="text" value={form.businessName} onChange={(e) => updateField('businessName', e.target.value)}
                        placeholder="e.g., Sharma Electronics"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-700 focus:border-emerald-500/50 focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Business Type</label>
                      <select value={form.businessType} onChange={(e) => updateField('businessType', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-colors">
                        {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">City</label>
                      <select value={form.city} onChange={(e) => updateField('city', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-colors">
                        {INDIAN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Soundbox Vintage</label>
                      <input type="number" min={1} max={120} value={form.monthsActive} onChange={(e) => updateField('monthsActive', +e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-colors" />
                      <span className="text-[10px] text-zinc-600">Months since Soundbox activation</span>
                    </div>
                  </div>
                </fieldset>

                {/* Financial Details */}
                <fieldset className="rounded-xl border border-zinc-800/60 p-5 space-y-4">
                  <legend className="text-[11px] text-zinc-600 uppercase tracking-widest px-2">Financial Details</legend>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Monthly UPI Collections (₹)</label>
                      <input type="number" min={1000} step={1000} value={form.monthlyIncome}
                        onChange={(e) => updateField('monthlyIncome', +e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-colors" />
                      <input type="range" min={3000} max={200000} step={1000} value={form.monthlyIncome}
                        onChange={(e) => updateField('monthlyIncome', +e.target.value)}
                        className="w-full mt-1 accent-emerald-500 h-1" />
                      <div className="flex justify-between text-[10px] text-zinc-700"><span>₹3K</span><span>₹2L</span></div>
                      <span className="text-[10px] text-zinc-600">Total P2M + QR + Soundbox inflows</span>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Monthly Outflows (₹)</label>
                      <input type="number" min={1000} step={1000} value={form.monthlyExpense}
                        onChange={(e) => updateField('monthlyExpense', +e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-colors" />
                      <input type="range" min={1000} max={180000} step={1000} value={form.monthlyExpense}
                        onChange={(e) => updateField('monthlyExpense', +e.target.value)}
                        className="w-full mt-1 accent-emerald-500 h-1" />
                      <span className="text-[10px] text-zinc-600">P2P sent + supplier payments + operating costs</span>
                    </div>
                  </div>

                  {/* Live savings indicator */}
                  <div className={`rounded-lg p-3 text-xs font-mono ${
                    form.monthlyIncome - form.monthlyExpense > 0
                      ? 'bg-emerald-500/5 border border-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/5 border border-red-500/10 text-red-400'
                  }`}>
                    Monthly Savings: ₹{(form.monthlyIncome - form.monthlyExpense).toLocaleString()}
                    {form.monthlyIncome - form.monthlyExpense <= 0 && ' ⚠ Negative savings will increase risk score'}
                  </div>
                </fieldset>

                {/* Digital Footprint */}
                <fieldset className="rounded-xl border border-zinc-800/60 p-5 space-y-4">
                  <legend className="text-[11px] text-zinc-600 uppercase tracking-widest px-2">Digital Payment Footprint</legend>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">UPI P2M Count</label>
                      <input type="number" min={0} max={500} value={form.upiCount}
                        onChange={(e) => updateField('upiCount', +e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-colors" />
                      <span className="text-[10px] text-zinc-600">Pay-to-Merchant transactions per month</span>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">QR Code Payments</label>
                      <input type="number" min={0} max={200} value={form.qrPayments}
                        onChange={(e) => updateField('qrPayments', +e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-colors" />
                      <span className="text-[10px] text-zinc-600">Dynamic + Static QR scans</span>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Avg Ticket (₹)</label>
                      <input type="number" min={10} step={50} value={form.avgTicket}
                        onChange={(e) => updateField('avgTicket', +e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-colors" />
                      <span className="text-[10px] text-zinc-600">Average UPI transaction value</span>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Unique Customers</label>
                      <input type="number" min={0} max={500} value={form.uniqueCustomers}
                        onChange={(e) => updateField('uniqueCustomers', +e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-colors" />
                      <span className="text-[10px] text-zinc-600">Distinct UPI payers in last 30 days</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-xs text-zinc-500">Paytm Soundbox Active</label>
                    <button onClick={() => updateField('soundboxActive', !form.soundboxActive)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${form.soundboxActive ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.soundboxActive ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                    <span className="text-xs text-zinc-600">{form.soundboxActive ? 'Yes' : 'No'}</span>
                  </div>

                  {/* Risk preview — live from backend */}
                  <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/40 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-[10px] text-zinc-600 uppercase tracking-wider">Live Score Preview</div>
                      {previewLoading && (
                        <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                    <div className="flex gap-4">
                      {preview ? (
                        <>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-400">{(preview.gnn_confidence ?? 0).toFixed(2)}</div>
                            <div className="text-[10px] text-zinc-600">GNN</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-cyan-400">{(preview.tcn_stability ?? 0).toFixed(2)}</div>
                            <div className="text-[10px] text-zinc-600">TCN</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-lg font-bold ${(preview.composite_risk ?? 1) < 0.3 ? 'text-emerald-400' : (preview.composite_risk ?? 1) < 0.6 ? 'text-amber-400' : 'text-red-400'}`}>
                              {(preview.composite_risk ?? 1) < 0.3 ? 'Low' : (preview.composite_risk ?? 1) < 0.6 ? 'Medium' : 'High'}
                            </div>
                            <div className="text-[10px] text-zinc-600">Risk ({(preview.composite_risk ?? 0).toFixed(2)})</div>
                          </div>
                          {preview.decision_hint && (
                            <div className="text-center">
                              <div className="text-lg font-bold text-violet-400 capitalize">{preview.decision_hint}</div>
                              <div className="text-[10px] text-zinc-600">Hint</div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-zinc-600 italic py-1">
                          {previewLoading ? 'Fetching scores from backend...' : 'Scores unavailable — backend unreachable'}
                        </div>
                      )}
                    </div>
                  </div>
                </fieldset>

                {/* Loan Details */}
                <fieldset className="rounded-xl border border-zinc-800/60 p-5 space-y-4">
                  <legend className="text-[11px] text-zinc-600 uppercase tracking-widest px-2">Loan Request</legend>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Loan Amount (₹)</label>
                      <input type="number" min={5000} max={1000000} step={5000} value={form.loanAmount}
                        onChange={(e) => updateField('loanAmount', +e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-colors" />
                      <input type="range" min={5000} max={500000} step={5000} value={form.loanAmount}
                        onChange={(e) => updateField('loanAmount', +e.target.value)}
                        className="w-full mt-1 accent-emerald-500 h-1" />
                      <div className="flex justify-between text-[10px] text-zinc-700"><span>₹5K</span><span>₹5L</span></div>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 mb-1 block">Loan Purpose</label>
                      <select value={form.loanPurpose} onChange={(e) => updateField('loanPurpose', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-colors">
                        {LOAN_PURPOSES.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {form.loanPurpose === 'Custom' && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Item Name</label>
                        <input type="text" value={form.customItemName} onChange={(e) => updateField('customItemName', e.target.value)}
                          placeholder="e.g., LED Display"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-700 focus:border-emerald-500/50 focus:outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Quantity</label>
                        <input type="number" min={1} value={form.customItemQty} onChange={(e) => updateField('customItemQty', +e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Price (₹/unit)</label>
                        <input type="number" min={1} value={form.customItemPrice} onChange={(e) => updateField('customItemPrice', +e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none transition-colors" />
                      </div>
                    </div>
                  )}

                  {/* Loan-to-income warning */}
                  {form.monthlyIncome > 0 && (
                    <div className={`text-xs font-mono p-2 rounded ${
                      form.loanAmount / form.monthlyIncome > 3
                        ? 'text-red-400 bg-red-500/5'
                        : form.loanAmount / form.monthlyIncome > 1.5
                        ? 'text-amber-400 bg-amber-500/5'
                        : 'text-emerald-400 bg-emerald-500/5'
                    }`}>
                      Loan-to-Income: {(form.loanAmount / form.monthlyIncome).toFixed(1)}x
                      {form.loanAmount / form.monthlyIncome > 3 && ' — High leverage flagged by fraud detector'}
                    </div>
                  )}
                </fieldset>

                {/* Submit */}
                <button onClick={submitApplication}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors text-sm">
                  Submit Application — Run AI Pipeline
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Processing */}
          {step === 2 && (
            <motion.div key="processing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[11px] text-zinc-600 font-mono">trustai-swarm — scoring UPI merchant</span>
                  <div className="ml-auto w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="p-4 font-mono text-[11px] space-y-1.5 h-80 overflow-y-auto custom-scrollbar" ref={logRef}>
                  {logs.map((line, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
                      <span className="text-zinc-700 shrink-0 w-8 text-right">{line.ts}ms</span>
                      <span className={`shrink-0 w-16 ${agentColor(line.src)}`}>{line.src}</span>
                      <span className="text-zinc-500">{line.msg}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Application summary */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/40 p-3">
                  <div className="text-xs text-zinc-600">Business</div>
                  <div className="text-sm text-white font-medium truncate">{form.businessName || form.businessType}</div>
                </div>
                <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/40 p-3">
                  <div className="text-xs text-zinc-600">Loan</div>
                  <div className="text-sm text-white font-medium">₹{form.loanAmount.toLocaleString()}</div>
                </div>
                <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/40 p-3">
                  <div className="text-xs text-zinc-600">Income</div>
                  <div className="text-sm text-white font-medium">₹{form.monthlyIncome.toLocaleString()}/mo</div>
                </div>
                <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/40 p-3">
                  <div className="text-xs text-zinc-600">UPI Activity</div>
                  <div className="text-sm text-white font-medium">{form.upiCount + form.qrPayments}/mo</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Result */}
          {step === 3 && result && (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {(() => {
                const d = result.decision || 'structured';
                const style = decisionStyle[d] || decisionStyle.structured;
                const s = result.state || {};
                const scores = {
                  gnn_confidence: s.gnn_confidence ?? result.scores?.gnn_confidence ?? 0,
                  tcn_stability: s.tcn_stability ?? result.scores?.tcn_stability ?? 0,
                  fraud_score: s.fraud_score ?? result.scores?.fraud_score ?? 0,
                  composite_risk: s.composite_risk ?? result.scores?.composite_risk ?? 0,
                  decision_reason: s.decision_reason || result.decision_reason || '',
                  fraud_flags: s.fraud_flags || result.scores?.fraud_flags || [],
                };
                return (
                  <div className="space-y-6">
                    {/* Decision banner */}
                    <div className={`rounded-xl ${style.bg} border ${style.border} p-6 text-center`}>
                      <div className={`text-3xl font-bold ${style.text} mb-2`}>
                        {style.label}
                        {result.offline_estimate && (
                          <span className="text-xs font-normal text-amber-400 ml-2">(offline estimate — backend unreachable)</span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 max-w-md mx-auto">
                        {result.decision_reason || scores.decision_reason || 'Eligible for DLG lending — decision made by the TrustAI UPI credit swarm.'}
                      </p>
                    </div>

                    {/* Score cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <ScoreCard label="UPI Graph Score" value={scores.gnn_confidence} color="blue" />
                      <ScoreCard label="Behavioral Stability" value={scores.tcn_stability} color="cyan" />
                      <ScoreCard label="Fraud Score" value={scores.fraud_score} color="amber" invert />
                      <ScoreCard label="Composite Risk" value={scores.composite_risk} color="emerald" invert />
                    </div>

                    {/* Feature importance */}
                    {(s.feature_importance || result.feature_importance) && (
                      <div className="rounded-xl border border-zinc-800/60 p-5">
                        <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-3">SHAP Feature Importance</div>
                        <div className="space-y-2">
                          {Object.entries(s.feature_importance || result.feature_importance || {}).slice(0, 6).map(([key, val]) => (
                            <div key={key} className="flex items-center gap-3">
                              <span className="text-xs text-zinc-500 w-32 shrink-0 truncate">{key.replace(/_/g, ' ')}</span>
                              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${Math.abs(val) * 100}%` }} />
                              </div>
                              <span className="text-xs text-zinc-600 w-10 text-right">{(val * 100).toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fraud flags */}
                    {scores.fraud_flags?.length > 0 && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                        <div className="text-xs text-amber-400 font-semibold mb-2">Fraud Flags Detected</div>
                        {scores.fraud_flags.map((flag, i) => (
                          <div key={i} className="text-xs text-zinc-400 flex items-center gap-2 py-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${flag.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                            <span className="text-zinc-500">{flag.type}:</span> {flag.detail}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button onClick={resetForm}
                        className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm transition-colors">
                        New Application
                      </button>
                      <button onClick={() => { resetForm(); }}
                        className="flex-1 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl text-sm transition-colors border border-emerald-500/20">
                        Adjust & Retry
                      </button>
                    </div>

                    {/* Logs collapsible */}
                    <details className="rounded-xl border border-zinc-800/60 overflow-hidden">
                      <summary className="cursor-pointer text-xs text-zinc-600 hover:text-zinc-400 p-4 transition-colors">
                        View full agent logs ({(result.logs || result.state?.logs || logs).length} entries)
                      </summary>
                      <div className="px-4 pb-4 font-mono text-[10px] space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                        {(result.logs || result.state?.logs || []).map((log, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="text-zinc-700 w-8 text-right shrink-0">{Math.round(log.latency_ms || 0)}</span>
                            <span className={`w-14 shrink-0 ${agentColor(log.agent)}`}>{log.agent}</span>
                            <span className="text-zinc-600">{log.detail}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, color, invert }) {
  const v = typeof value === 'number' ? value : 0;
  const pct = v * 100;
  const isGood = invert ? v < 0.3 : v > 0.7;
  const isBad = invert ? v > 0.6 : v < 0.4;
  const colors = {
    blue: 'text-blue-400',
    cyan: 'text-cyan-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
  };

  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4 text-center">
      <div className={`text-2xl font-bold ${colors[color] || 'text-white'}`}>{v.toFixed(2)}</div>
      <div className="text-[10px] text-zinc-600 mt-1">{label}</div>
      <div className="w-full h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${isGood ? 'bg-emerald-500' : isBad ? 'bg-red-500' : 'bg-amber-500'}`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
