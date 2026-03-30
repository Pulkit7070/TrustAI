import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine, AreaChart, Area
} from 'recharts';
import {
    ShieldCheck, Activity, AlertTriangle, CheckCircle, XCircle, ChevronRight, Info, Users, ArrowLeft, TrendingUp
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Aurora from './Aurora';

const MetricCard = ({ title, metrics, type, timeSeriesData }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl relative overflow-hidden group"
    >
        <div className={`absolute top-0 right-0 w-32 h-32 bg-${type === 'gnn' ? 'purple' : 'blue'}-500/10 blur-[60px] rounded-full group-hover:bg-${type === 'gnn' ? 'purple' : 'blue'}-500/20 transition-all duration-500`} />

        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            {type === 'gnn' ? <Users className="w-4 h-4 text-purple-400" /> : <Activity className="w-4 h-4 text-blue-400" />}
            {title}
        </h3>

        <div className="flex justify-between items-end mb-6">
            <div>
                <div className="text-4xl font-bold text-white mb-1">
                    {metrics.score}
                    <span className="text-sm font-normal text-gray-500 ml-2">/ 1.0</span>
                </div>
                <div className={`text-sm ${metrics.score > 0.7 ? 'text-green-400' : 'text-yellow-400'} font-medium flex items-center gap-1`}>
                    {metrics.score > 0.7 ? <ShieldCheck className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {metrics.status}
                </div>
            </div>

            {/* Mini Chart */}
            <div className="w-24 h-12">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeriesData}>
                        <defs>
                            <linearGradient id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={type === 'gnn' ? '#a855f7' : '#3b82f6'} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={type === 'gnn' ? '#a855f7' : '#3b82f6'} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={type === 'gnn' ? '#a855f7' : '#3b82f6'}
                            fill={`url(#gradient-${type})`}
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="space-y-3">
            {metrics.details.map((detail, i) => (
                <div key={i} className="flex justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                    <span className="text-gray-400">{detail.label}</span>
                    <span className={`font-medium ${detail.color}`}>{detail.value}</span>
                </div>
            ))}
        </div>
    </motion.div>
);

const SHAPChart = ({ data }) => (
    <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" hide domain={[-0.1, 0.2]} />
                <YAxis dataKey="name" type="category" width={150} tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }}
                />
                <ReferenceLine x={0} stroke="#4b5563" />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#10b981' : '#ef4444'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    </div>
);

export default function DecisionEngine({ onBack, onSanction }) {
    const [sanctioned, setSanctioned] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // AI Real-time Data
    const [gnnMetrics, setGnnMetrics] = useState({
        score: 0.84, // Default fallback
        status: "Strong",
        networkDensity: "Medium",
        relStability: "High",
        volExposure: "Low"
    });

    const [riskScore, setRiskScore] = useState(0.28); // Default

    useEffect(() => {
        const fetchRisk = async () => {
            try {
                const res = await fetch('http://localhost:8000/swarm/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ merchant_id: "KSK-901", transaction_data: {
                        upi_monthly_count: 45, qr_payments_count: 22, soundbox_active: true,
                        avg_ticket_size: 650, unique_customers: 78, months_active: 18,
                        monthly_income: 15000, monthly_expense: 12000,
                        p2p_received_monthly: 5000, p2p_sent_monthly: 3000,
                        current_month_count: 50, avg_monthly_count: 45,
                        merchant_kyc_verified: true, repeat_customers: 45,
                        weekly_data: [
                            { week: "W1", income: 4000, spending: 3800, savings: 200 },
                            { week: "W2", income: 4200, spending: 4000, savings: 200 },
                            { week: "W3", income: 3800, spending: 4100, savings: -300 },
                            { week: "W4", income: 4500, spending: 3500, savings: 1000 },
                            { week: "W5", income: 4100, spending: 3900, savings: 200 },
                            { week: "W6", income: 4300, spending: 4200, savings: 100 },
                            { week: "W7", income: 4000, spending: 3800, savings: 200 },
                            { week: "W8", income: 4600, spending: 3600, savings: 1000 },
                            { week: "W9", income: 4200, spending: 4000, savings: 200 },
                            { week: "W10", income: 4400, spending: 4100, savings: 300 },
                            { week: "W11", income: 4100, spending: 3900, savings: 200 },
                            { week: "W12", income: 4500, spending: 3700, savings: 800 },
                        ],
                    }}),
                });
                const data = await res.json();
                if (data.gnn_confidence) {
                    setGnnMetrics({
                        score: data.gnn_confidence,
                        status: data.gnn_confidence > 0.7 ? "Strong" : "Moderate",
                        networkDensity: "Medium",
                        relStability: data.gnn_confidence > 0.7 ? "High" : "Moderate",
                        volExposure: data.fraud_score < 0.2 ? "Low" : "High"
                    });

                    const tcnScore = data.tcn_stability || 0.79;
                    const combinedConfidence = (data.gnn_confidence * 0.6) + (tcnScore * 0.4);
                    setRiskScore(Number((1.0 - combinedConfidence).toFixed(2)));
                }
            } catch (e) {
                console.error("Failed to fetch AI risk score (backend offline, using defaults)", e);
            }
        };

        fetchRisk();
        const interval = setInterval(fetchRisk, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleDecision = (decision) => {
        if (decision === 'approved') {
            setSanctioned(true);
            setShowConfetti(true);
            if (onSanction) onSanction('approved');
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#00ff9d', '#ffffff', '#10b981']
            });
            setTimeout(() => setShowConfetti(false), 3000);
        } else {
            if (onSanction) onSanction('rejected');
        }
    };

    const gnnData = [
        { value: 0.7 }, { value: 0.75 }, { value: 0.72 }, { value: 0.8 }, { value: 0.82 }, { value: 0.84 }
    ];

    const tcnData = [
        { value: 0.65 }, { value: 0.68 }, { value: 0.7 }, { value: 0.75 }, { value: 0.78 }, { value: 0.79 }
    ];

    const shapData = [
        { name: 'Consistent Rent', value: 0.18 },
        { name: 'Stable Income', value: 0.12 },
        { name: 'Savings Growth', value: 0.09 },
        { name: 'Spending Volatility', value: -0.07 },
        { name: 'Income Variability', value: -0.04 },
    ].sort((a, b) => b.value - a.value);

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-cyan-500/30 relative overflow-hidden">
            {/* Aurora Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <Aurora
                    colorStops={["#7cff67", "#B19EEF", "#5227FF"]}
                    blend={0.5}
                    amplitude={1.0}
                    speed={1}
                />
            </div>

            {/* Content Container */}
            <div className="relative z-10">
                {/* Header */}
                <header className="max-w-7xl mx-auto mb-12 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Decision Engine</h1>
                            <p className="text-gray-500 text-sm mt-1">Multi-Model AI Underwriting System</p>
                        </div>
                    </div>
                    <div className="hidden md:block text-right">
                        <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Application ID</div>
                        <div className="font-mono text-cyan-400">#APP-2024-8892</div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Section 1: Model Outputs (Left Column) */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* GNN & TCN Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <MetricCard
                                title="Relational Stability (GNN)"
                                type="gnn"
                                metrics={{
                                    score: gnnMetrics.score,
                                    status: gnnMetrics.status,
                                    details: [
                                        { label: "Network Density", value: gnnMetrics.networkDensity, color: "text-white" },
                                        { label: "Relationship Strength", value: gnnMetrics.relStability, color: "text-green-400" },
                                        { label: "Volatility Exposure", value: gnnMetrics.volExposure, color: "text-green-400" }
                                    ]
                                }}
                                timeSeriesData={gnnData}
                            />
                            <MetricCard
                                title="Temporal Consistency (TCN)"
                                type="tcn"
                                metrics={{
                                    score: 0.79,
                                    status: "Good",
                                    details: [
                                        { label: "Savings Consistency", value: "Improving", color: "text-green-400" },
                                        { label: "Spending Volatility", value: "Moderate", color: "text-yellow-400" },
                                        { label: "Payment Discipline", value: "Strong", color: "text-green-400" }
                                    ]
                                }}
                                timeSeriesData={tcnData}
                            />
                        </div>

                        {/* SHAP Analysis */}
                        <div className="glass-panel p-8 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                                    Feature Contribution Analysis (SHAP)
                                </h3>
                                <div className="text-xs text-gray-500 flex items-center gap-4">
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Positive Impact</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Negative Impact</span>
                                </div>
                            </div>
                            <SHAPChart data={shapData} />
                        </div>
                    </div>

                    {/* Section 2: Decision Column (Right Column) */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Combined Risk Score */}
                        <div className="glass-panel p-8 rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-black relative overflow-hidden text-center">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-cyan-500" />

                            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6">Combined Risk Score</h3>

                            <div className="relative w-48 h-48 mx-auto mb-6 flex items-center justify-center">
                                {/* SVG Circular Progress */}
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="96" cy="96" r="88" stroke="#1f2937" strokeWidth="12" fill="none" />
                                    <motion.circle
                                        cx="96" cy="96" r="88"
                                        stroke="#10b981"
                                        strokeWidth="12"
                                        fill="none"
                                        strokeDasharray="552"
                                        strokeDashoffset={552 - (552 * (1 - riskScore))} // 1 - 0.28 = 0.72 safety score approx for viz
                                        animate={{ strokeDashoffset: 552 - (552 * (1 - riskScore)) }} // Inverse relation to risk
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-bold text-white">{riskScore}</span>
                                    <span className="text-xs text-green-400 font-bold uppercase tracking-wider mt-1">Low Risk</span>
                                </div>
                            </div>

                            <div className="text-xs text-gray-500 bg-white/5 py-2 px-4 rounded-lg inline-block">
                                Weighted(GNN: {gnnMetrics.score} + TCN: 0.79)
                            </div>
                        </div>

                        {/* Final Decision & Action */}
                        <div className="glass-panel p-8 rounded-2xl border border-green-500/30 bg-green-500/5 relative">
                            <h3 className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">AI Recommendation</h3>

                            <div className="text-center mb-8">
                                <div className="text-4xl font-black text-green-400 tracking-tight mb-2">APPROVE</div>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Strong relational income network and consistent payment discipline outweigh moderate spending volatility.
                                </p>
                            </div>

                            <div className="bg-black/40 rounded-xl p-4 mb-6 border border-white/5">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-400">Term</span>
                                    <span className="text-white">12 Months</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-400">Interest Rate</span>
                                    <span className="text-green-400">1.2% / month</span>
                                </div>
                                <div className="border-t border-white/10 my-2 pt-2 flex justify-between items-center">
                                    <span className="text-gray-400">Loan Amount</span>
                                    <span className="text-xl font-bold text-white">₹50,000</span>
                                </div>
                            </div>

                            {!sanctioned ? (
                                <div className="flex flex-col gap-3">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleDecision('approved')}
                                        className="w-full py-4 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        Sanction Loan
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleDecision('rejected')}
                                        className="w-full py-4 bg-white/5 hover:bg-red-500/20 text-red-500 font-bold rounded-xl border border-red-500/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <XCircle className="w-5 h-5" />
                                        Reject Loan
                                    </motion.button>
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="w-full py-4 bg-green-500/20 text-green-400 font-bold rounded-xl border border-green-500/50 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    Loan Sanctioned Successfully
                                </motion.div>
                            )}
                        </div>

                    </div>
                </main>

                <footer className="max-w-7xl mx-auto mt-12 text-center text-gray-600 text-xs">
                    Decision generated by TrustAI Swarm Engine (GNN + TCN + Paytm MCP)
                </footer>
            </div>
        </div>
    );
}
