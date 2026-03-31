import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine, AreaChart, Area
} from 'recharts';
import {
    ShieldCheck, Activity, AlertTriangle, CheckCircle, XCircle, ArrowLeft, TrendingUp, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Aurora from './Aurora';
import { API_BASE } from '../lib/api';
const FALLBACK_PROFILES = [
    { id: 'approved', label: 'Strong Merchant (Approved)' },
    { id: 'structured', label: 'Moderate Merchant (Structured)' },
    { id: 'rejected', label: 'Risky Borrower (Rejected)' },
    { id: 'fraud', label: 'Fraudulent Actor (Fraud Alert)' },
];

const fmt = (n) => (typeof n === 'number' ? n.toFixed(4) : '--');
const money = (n) => `INR ${(n || 0).toLocaleString()}`;

const MetricCard = ({ title, score, status, details, series, color, icon }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl"
    >
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            {icon}
            {title}
        </h3>
        <div className="flex justify-between items-end gap-4 mb-6">
            <div>
                <div className="text-4xl font-bold text-white mb-1">
                    {score.toFixed(4)}
                    <span className="text-sm font-normal text-gray-500 ml-2">/ 1.0</span>
                </div>
                <div className={`text-sm font-medium flex items-center gap-1 ${status.color}`}>
                    {score > 0.7 ? <ShieldCheck className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {status.label}
                </div>
            </div>
            <div className="w-24 h-12">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series}>
                        <defs>
                            <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="value" stroke={color} fill={`url(#grad-${title})`} strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
        <div className="space-y-3">
            {details.map((detail) => (
                <div key={detail.label} className="flex justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                    <span className="text-gray-400">{detail.label}</span>
                    <span className={detail.color}>{detail.value}</span>
                </div>
            ))}
        </div>
    </motion.div>
);

export default function DecisionEngine({ onBack, onSanction }) {
    const [profiles, setProfiles] = useState(FALLBACK_PROFILES);
    const [selectedProfile, setSelectedProfile] = useState('structured');
    const [profileData, setProfileData] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshTick, setRefreshTick] = useState(0);
    const [sanctioned, setSanctioned] = useState(false);

    useEffect(() => {
        let ignore = false;
        fetch(`${API_BASE}/swarm/profiles`)
            .then((r) => r.json())
            .then((data) => {
                if (!ignore && Array.isArray(data?.profiles) && data.profiles.length) {
                    setProfiles(data.profiles);
                }
            })
            .catch(() => {});
        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        let ignore = false;
        setLoading(true);
        setError('');
        setSanctioned(false);

        const load = async () => {
            try {
                const profileRes = await fetch(`${API_BASE}/swarm/profiles/${selectedProfile}`);
                const profile = await profileRes.json();
                if (!profileRes.ok) throw new Error('Could not load merchant profile');

                const analysisRes = await fetch(`${API_BASE}/swarm/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        merchant_id: profile.merchant_id,
                        loan_amount: profile.loan_amount,
                        items: profile.items,
                        transaction_data: profile.transaction_data,
                    }),
                });
                const analysisData = await analysisRes.json();
                if (!analysisRes.ok) throw new Error('Could not load underwriting analysis');

                if (!ignore) {
                    setProfileData(profile);
                    setAnalysis(analysisData);
                }
            } catch (err) {
                if (!ignore) {
                    setProfileData(null);
                    setAnalysis(null);
                    setError(err.message || 'Backend unavailable');
                }
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        load();
        return () => {
            ignore = true;
        };
    }, [selectedProfile, refreshTick]);

    const weekly = profileData?.transaction_data?.weekly_data || [];
    const gnnSeries = useMemo(() => {
        if (!weekly.length) return Array.from({ length: 6 }, (_, i) => ({ label: `W${i + 1}`, value: analysis?.gnn_confidence || 0.5 }));
        const avgIncome = weekly.reduce((sum, item) => sum + item.income, 0) / weekly.length;
        return weekly.slice(-6).map((item) => ({
            label: item.week,
            value: Math.min(1, Math.max(0, (item.income / Math.max(avgIncome, 1)) * 0.65 + (Math.max(0, item.savings) / Math.max(item.income, 1)) * 0.35)),
        }));
    }, [weekly, analysis]);

    const tcnSeries = useMemo(() => {
        if (!weekly.length) return Array.from({ length: 6 }, (_, i) => ({ label: `W${i + 1}`, value: analysis?.tcn_stability || 0.5 }));
        return weekly.slice(-6).map((item) => ({
            label: item.week,
            value: Math.min(1, Math.max(0, (((item.income - item.spending) / Math.max(item.income, 1)) + 1) / 2)),
        }));
    }, [weekly, analysis]);

    const decisionTone = analysis?.decision === 'approved'
        ? { color: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/5', ring: '#10b981', label: 'APPROVE' }
        : analysis?.decision === 'structured'
            ? { color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/5', ring: '#f59e0b', label: 'STRUCTURED FINANCING' }
            : { color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/5', ring: '#ef4444', label: 'REJECT' };

    const shapData = useMemo(() => [...(analysis?.feature_importance || [])].sort((a, b) => b.value - a.value), [analysis]);
    const topCluster = Object.entries(analysis?.gnn_cluster_probs || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'n/a';
    const positiveWeeks = weekly.filter((item) => item.savings > 0).length;
    const avgSavings = weekly.length ? Math.round(weekly.reduce((sum, item) => sum + item.savings, 0) / weekly.length) : 0;

    const gnnDetails = [
        { label: 'Network Density', value: `${profileData?.transaction_data?.unique_customers || 0} customers`, color: 'text-white' },
        { label: 'Merchant Tenure', value: `${profileData?.transaction_data?.months_active || 0} months`, color: 'text-green-400' },
        { label: 'Top Cluster', value: topCluster, color: 'text-cyan-400' },
    ];

    const tcnDetails = [
        { label: 'Trend', value: analysis?.tcn_trend || 'stable', color: analysis?.tcn_trend === 'declining' ? 'text-red-400' : 'text-green-400' },
        { label: 'Positive Weeks', value: `${positiveWeeks}/${weekly.length || 0}`, color: positiveWeeks >= Math.ceil((weekly.length || 1) * 0.7) ? 'text-green-400' : 'text-yellow-400' },
        { label: 'Avg Savings', value: money(avgSavings), color: avgSavings >= 0 ? 'text-white' : 'text-red-400' },
    ];

    const offer = analysis?.decision === 'approved'
        ? { title: 'Direct Credit Offer', term: '12 months', pricing: '1.2% / month' }
        : analysis?.decision === 'structured'
            ? { title: 'Structured Supply Financing', term: '6 months', pricing: 'Merchant escrow' }
            : { title: 'Risk Escalation', term: 'Not sanctionable', pricing: 'Manual review required' };

    const riskLabel = (analysis?.composite_risk || 0) <= 0.3 ? 'Low Risk' : (analysis?.composite_risk || 0) <= 0.6 ? 'Moderate Risk' : 'High Risk';

    const submitDecision = (decision) => {
        if (decision !== 'rejected') {
            setSanctioned(true);
            confetti({
                particleCount: 120,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#00ff9d', '#ffffff', decisionTone.ring],
            });
        }
        onSanction?.(decision);
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-cyan-500/30 relative overflow-hidden">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <Aurora colorStops={['#7cff67', '#B19EEF', '#5227FF']} blend={0.5} amplitude={1.0} speed={1} />
            </div>

            <div className="relative z-10">
                <header className="max-w-7xl mx-auto mb-12 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Decision Engine</h1>
                            <p className="text-gray-500 text-sm mt-1">Live underwriting from TrustAI Swarm</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {profiles.map((profile) => (
                            <button
                                key={profile.id}
                                onClick={() => setSelectedProfile(profile.id)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                                    selectedProfile === profile.id ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300' : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                {profile.label}
                            </button>
                        ))}
                        <button
                            onClick={() => setRefreshTick((tick) => tick + 1)}
                            className="px-3 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 flex items-center gap-2"
                        >
                            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <MetricCard
                                title="Relational Stability (GNN)"
                                score={analysis?.gnn_confidence || 0}
                                status={{ label: (analysis?.gnn_confidence || 0) > 0.7 ? 'Strong graph confidence' : 'Weak graph confidence', color: (analysis?.gnn_confidence || 0) > 0.7 ? 'text-green-400' : 'text-yellow-400' }}
                                details={gnnDetails}
                                series={gnnSeries}
                                color="#a855f7"
                                icon={<ShieldCheck className="w-4 h-4 text-purple-400" />}
                            />
                            <MetricCard
                                title="Temporal Consistency (TCN)"
                                score={analysis?.tcn_stability || 0}
                                status={{ label: (analysis?.tcn_stability || 0) > 0.65 ? 'Behavior looks stable' : 'Behavior looks noisy', color: (analysis?.tcn_stability || 0) > 0.65 ? 'text-green-400' : 'text-yellow-400' }}
                                details={tcnDetails}
                                series={tcnSeries}
                                color="#3b82f6"
                                icon={<Activity className="w-4 h-4 text-blue-400" />}
                            />
                        </div>

                        <div className="glass-panel p-8 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                                    Feature Contribution Analysis
                                </h3>
                                <div className="text-xs text-gray-500">SHAP-style contributions from validator</div>
                            </div>
                            {loading ? (
                                <div className="h-64 flex items-center justify-center text-gray-500 text-sm">Loading analysis...</div>
                            ) : error ? (
                                <div className="h-64 flex items-center justify-center text-red-400 text-sm">{error}</div>
                            ) : (
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart layout="vertical" data={shapData} margin={{ top: 5, right: 16, left: 12, bottom: 5 }}>
                                            <XAxis type="number" hide domain={['dataMin - 0.02', 'dataMax + 0.02']} />
                                            <YAxis dataKey="name" type="category" width={150} tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }} formatter={(value) => [Number(value).toFixed(4), 'Contribution']} />
                                            <ReferenceLine x={0} stroke="#4b5563" />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                {shapData.map((entry) => (
                                                    <Cell key={entry.name} fill={entry.value >= 0 ? '#10b981' : '#ef4444'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        <div className="glass-panel p-8 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold">Selected Merchant</h3>
                                    <p className="text-sm text-gray-500">{profileData?.merchant_name || 'Loading profile...'}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 uppercase tracking-widest">Requested Amount</div>
                                    <div className="font-mono text-cyan-400">{money(profileData?.loan_amount)}</div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {(profileData?.items || []).map((item) => (
                                    <div key={`${item.name}-${item.qty}`} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                                        <div>
                                            <div className="font-medium text-white">{item.name}</div>
                                            <div className="text-xs text-gray-500">Qty {item.qty}</div>
                                        </div>
                                        <div className="font-mono text-sm text-white">{money(item.qty * item.price)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className={`glass-panel p-8 rounded-2xl border ${decisionTone.border} ${decisionTone.bg} text-center`}>
                            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6">Composite Risk Score</h3>
                            <div className="relative w-48 h-48 mx-auto mb-6 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="96" cy="96" r="88" stroke="#1f2937" strokeWidth="12" fill="none" />
                                    <motion.circle
                                        cx="96"
                                        cy="96"
                                        r="88"
                                        stroke={decisionTone.ring}
                                        strokeWidth="12"
                                        fill="none"
                                        strokeDasharray="552"
                                        strokeDashoffset={552 - (552 * (1 - (analysis?.composite_risk || 0)))}
                                        animate={{ strokeDashoffset: 552 - (552 * (1 - (analysis?.composite_risk || 0))) }}
                                        transition={{ duration: 1.2, ease: 'easeOut' }}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-bold text-white">{fmt(analysis?.composite_risk)}</span>
                                    <span className={`text-xs font-bold uppercase tracking-wider mt-1 ${decisionTone.color}`}>{riskLabel}</span>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 bg-white/5 py-2 px-4 rounded-lg inline-block">Weighted from GNN, TCN, fraud, and price checks</div>
                        </div>

                        <div className={`glass-panel p-8 rounded-2xl border ${decisionTone.border} ${decisionTone.bg}`}>
                            <h3 className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">AI Recommendation</h3>
                            <div className={`text-4xl font-black tracking-tight mb-2 text-center ${decisionTone.color}`}>
                                {loading ? 'LOADING' : decisionTone.label}
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed text-center mb-6">
                                {error || analysis?.decision_reason || 'Waiting for underwriting response.'}
                            </p>

                            <div className="bg-black/40 rounded-xl p-4 mb-6 border border-white/5">
                                <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">{offer.title}</div>
                                <div className="flex justify-between text-sm mb-2"><span className="text-gray-400">Term</span><span className="text-white">{offer.term}</span></div>
                                <div className="flex justify-between text-sm mb-2"><span className="text-gray-400">Pricing</span><span className={decisionTone.color}>{offer.pricing}</span></div>
                                <div className="border-t border-white/10 my-2 pt-2 flex justify-between items-center"><span className="text-gray-400">Amount</span><span className="text-xl font-bold text-white">{money(profileData?.loan_amount)}</span></div>
                            </div>

                            <div className="space-y-2 text-xs mb-6">
                                <div className="flex justify-between"><span className="text-gray-500">GNN Confidence</span><span className="text-blue-400 font-mono">{fmt(analysis?.gnn_confidence)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">TCN Stability</span><span className="text-purple-400 font-mono">{fmt(analysis?.tcn_stability)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Fraud Score</span><span className={`font-mono ${(analysis?.fraud_score || 0) > 0.3 ? 'text-red-400' : 'text-yellow-400'}`}>{fmt(analysis?.fraud_score)}</span></div>
                            </div>

                            {analysis?.fraud_flags?.length > 0 && (
                                <div className="mb-6 space-y-2">
                                    {analysis.fraud_flags.map((flag) => (
                                        <div key={flag.type} className={`flex items-center gap-2 text-[11px] px-2 py-1 rounded ${flag.severity === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                            <AlertTriangle className="w-3 h-3 shrink-0" />
                                            <span className="font-mono">{flag.type}</span>
                                            <span className="text-[9px] ml-auto uppercase font-bold">{flag.severity}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!sanctioned ? (
                                <div className="flex flex-col gap-3">
                                    <motion.button
                                        whileHover={{ scale: loading || error ? 1 : 1.02 }}
                                        whileTap={{ scale: loading || error ? 1 : 0.98 }}
                                        disabled={loading || !!error}
                                        onClick={() => submitDecision(analysis?.decision || 'rejected')}
                                        className={`w-full py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                                            analysis?.decision === 'rejected' ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-green-500 hover:bg-green-400 text-black'
                                        }`}
                                    >
                                        {analysis?.decision === 'rejected' ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                        {analysis?.decision === 'approved' ? 'Sanction Loan' : analysis?.decision === 'structured' ? 'Offer Structured Financing' : 'Reject Application'}
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: loading ? 1 : 1.02 }}
                                        whileTap={{ scale: loading ? 1 : 0.98 }}
                                        disabled={loading}
                                        onClick={() => submitDecision('rejected')}
                                        className="w-full py-4 bg-white/5 hover:bg-red-500/20 text-red-500 font-bold rounded-xl border border-red-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <XCircle className="w-5 h-5" />
                                        Reject Loan
                                    </motion.button>
                                </div>
                            ) : (
                                <div className="w-full py-4 bg-green-500/20 text-green-400 font-bold rounded-xl border border-green-500/50 flex items-center justify-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    {analysis?.decision === 'structured' ? 'Structured financing queued' : 'Loan sanctioned successfully'}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
