import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
    ArrowRight, Activity, TrendingUp, TrendingDown,
    ShieldCheck, AlertCircle, Zap, CheckCircle2,
    Clock, DollarSign, Wallet
} from 'lucide-react';

const TCNAgentVisualizer = ({ onBack }) => {
    // --- State Configuration ---
    const [weeks, setWeeks] = useState(12);
    const [data, setData] = useState([]);

    // TCN Output State
    const [stabilityScore, setStabilityScore] = useState(0.82);
    const [predictionText, setPredictionText] = useState("");

    // Derived Indices
    const [liquidityBuffer, setLiquidityBuffer] = useState(4.2);

    // Sliders State (0-100)
    const [sliders, setSliders] = useState({
        savings: 50,          // Affects Savings Line & Liquidity
        spendingVol: 30,      // Affects Spending Line Volatility & Liquidity
        incomeStab: 80,       // Affects Income Line Stability
        paymentReliability: 90 // Affects Payment Score
    });

    const [isSimulating, setIsSimulating] = useState(false);

    // --- Data Generation Logic ---
    useEffect(() => {
        generateData();
    }, [weeks, sliders]);

    const generateData = () => {
        const baseIncome = 5000;
        const baseSpending = 3500;

        // Dynamic calculation for derived metrics
        const calculatedLiquidity = (sliders.savings / 20) + (100 - sliders.spendingVol) / 25;
        setLiquidityBuffer(calculatedLiquidity);

        const newData = [];
        for (let i = 1; i <= weeks; i++) {
            // Income with stability noise
            const incomeNoise = (100 - sliders.incomeStab) * 15;
            const income = baseIncome + (Math.random() - 0.5) * incomeNoise;

            // Spending with volatility
            const spendingNoise = sliders.spendingVol * 25;
            const spending = baseSpending + (Math.random() - 0.5) * spendingNoise;

            // Savings based on slider
            const savingsMulti = 1 + (sliders.savings - 50) / 100;
            const savings = (income - spending) * savingsMulti;

            newData.push({
                week: `W${i}`,
                income: Math.max(0, Math.round(income)),
                spending: Math.max(0, Math.round(spending)),
                savings: Math.round(savings)
            });
        }
        setData(newData);
        calculateStability(calculatedLiquidity);
    };

    const calculateStability = (liquidity) => {
        // TCN Simulation Logic
        // Stability is a weighted sum of normalized inputs
        let score = 0.5;

        score += (sliders.incomeStab / 100) * 0.25;    // Income Stability weight
        score -= (sliders.spendingVol / 100) * 0.20;   // Spending Volatility penalty
        score += (sliders.savings / 100) * 0.15;       // Savings weight
        score += (sliders.paymentReliability / 100) * 0.20; // Payment weight (high impact)
        score += (liquidity / 10) * 0.10;              // Liquidity bonus

        // Normalize and clamp
        score = Math.min(0.99, Math.max(0.1, score));

        setStabilityScore(score);

        // Dynamic Prediction Text Logic
        if (score > 0.85) {
            setPredictionText("High consistency detected across all temporal vectors. Ideal candidate for automated credit approval.");
        } else if (score > 0.70) {
            if (sliders.spendingVol > 60) setPredictionText("Moderate volatility in spending patterns. Suggest limiting exposure until variance stabilizes.");
            else if (sliders.paymentReliability < 70) setPredictionText("Payment history showing irregularities. Recommend manual review.");
            else setPredictionText("Stable behavior with minor fluctuations. Standard credit terms applicable.");
        } else if (score > 0.50) {
            setPredictionText("Irregular income and high spending volatility detected. High risk of default.");
        } else {
            setPredictionText("Critical instability in financial behavior. Application rejected by TCN model.");
        }
    };

    const handleSimulate = () => {
        setIsSimulating(true);
        setTimeout(() => {
            setWeeks(prev => prev + 4);
            setIsSimulating(false);
        }, 1500);
    };

    // --- UI Components ---

    const SliderControl = ({ label, value, onChange, min = 0, max = 100, color = "blue" }) => (
        <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
                <span>{label}</span>
                <span className={`text-${color}-400 font-mono`}>{value}%</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className={`w-full h-1 bg-gray-700/50 rounded-lg appearance-none cursor-pointer accent-${color}-500 hover:accent-${color}-400 transition-all`}
            />
        </div>
    );

    return (
        <div className="fixed inset-0 w-full h-full bg-[#0f172a] text-white flex flex-col font-sans selection:bg-cyan-500/30 overflow-hidden">

            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0f172a] to-[#0f172a] pointer-events-none" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />

            {/* Navbar Stub */}
            <header className="relative z-20 px-6 py-3 border-b border-white/5 flex items-center justify-between bg-[#0f172a]/90 backdrop-blur-md h-14 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                    >
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white rotate-180" />
                    </button>
                    <div className="flex items-baseline gap-2">
                        <h1 className="text-lg font-bold tracking-tight text-white/90">
                            TCN Agent <span className="text-cyan-400">v2.1</span>
                        </h1>
                        <p className="hidden md:block text-xs text-gray-500 font-mono border-l border-white/10 pl-2">Temporal Convolutional Network • Live Monitoring</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full border flex items-center gap-2 transition-colors ${stabilityScore > 0.6 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${stabilityScore > 0.6 ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={`text-xs font-medium ${stabilityScore > 0.6 ? 'text-green-400' : 'text-red-400'}`}>
                            {stabilityScore > 0.6 ? 'System Stable' : 'High Volatility'}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Split Layout */}
            <main className="relative z-10 flex-1 flex flex-col lg:flex-row overflow-hidden w-full h-full">

                {/* LEFT PANEL: Interactive Time-Series (70%) */}
                <section className="flex-1 flex flex-col border-r border-white/5 bg-black/20 overflow-hidden relative">

                    <div className="p-4 lg:p-6 border-b border-white/5 flex justify-between items-center bg-[#0f172a]/50">
                        <h2 className="text-sm font-semibold flex items-center gap-2 text-gray-200">
                            <Activity className="w-4 h-4 text-cyan-400" />
                            Real-time Behavioral Analysis
                        </h2>
                        <div className="flex gap-4 text-[10px] md:text-xs font-mono uppercase tracking-wider">
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> Income</div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Spending</div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Savings</div>
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div className="flex-1 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                <XAxis
                                    dataKey="week"
                                    stroke="#475569"
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#475569"
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value / 1000}k`}
                                    dx={-10}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                    itemStyle={{ fontSize: '12px' }}
                                    formatter={(value) => [`$${value}`, '']}
                                    cursor={{ stroke: '#ffffff20', strokeWidth: 1 }}
                                />
                                <Line type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} animationDuration={500} isAnimationActive={!isSimulating} />
                                <Line type="monotone" dataKey="spending" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} animationDuration={500} isAnimationActive={!isSimulating} />
                                <Line type="monotone" dataKey="savings" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} animationDuration={500} isAnimationActive={!isSimulating} />

                                {/* Projection Line Divider */}
                                {weeks > 12 && (
                                    <ReferenceLine x="W12" stroke="#eab308" strokeDasharray="3 3" label={{ value: "PROJECTION EXTENDED", position: 'insideTopRight', fill: '#eab308', fontSize: 10 }} />
                                )}
                            </LineChart>
                        </ResponsiveContainer>

                        {/* Simulating Overlay */}
                        <AnimatePresence>
                            {isSimulating && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20"
                                >
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="animate-spin text-cyan-400"><Clock className="w-8 h-8" /></div>
                                        <span className="text-cyan-400 font-mono text-sm tracking-wider">GENERATING TCN PREDICTIONS...</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Controls Section (Bottom of Left Panel) */}
                    <div className="bg-[#0f172a] border-t border-white/5 p-6 z-10 shrink-0">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Simulation Parameters</h3>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSimulate}
                                disabled={isSimulating}
                                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Zap className="w-3 h-3" />
                                Simulate Next 4 Weeks
                            </motion.button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
                            <SliderControl
                                label="Increase Savings %"
                                value={sliders.savings}
                                onChange={(v) => setSliders({ ...sliders, savings: v })}
                                color="emerald"
                            />
                            <SliderControl
                                label="Reduce Spending Volatility"
                                value={sliders.spendingVol}
                                onChange={(v) => setSliders({ ...sliders, spendingVol: v })}
                                color="red"
                            />
                            <SliderControl
                                label="Improve Income Stability"
                                value={sliders.incomeStab}
                                onChange={(v) => setSliders({ ...sliders, incomeStab: v })}
                                color="blue"
                            />
                            <SliderControl
                                label="Payment Reliability"
                                value={sliders.paymentReliability}
                                onChange={(v) => setSliders({ ...sliders, paymentReliability: v })}
                                color="purple"
                            />
                        </div>
                    </div>

                </section>

                {/* RIGHT PANEL: Behavioral Indices (30% but fixed min width for sidebar feel) */}
                <aside className="w-full lg:w-[350px] xl:w-[400px] shrink-0 bg-[#0b1120] border-l border-white/5 p-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar h-full lg:h-auto">

                    <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 sticky top-0 bg-[#0b1120] py-2 z-10 border-b border-white/5">
                        TCN Behavioral Indices
                    </h2>

                    {/* 1. Income Stability Index */}
                    <IndexCard title="Income Stability" icon={<DollarSign className="w-3.5 h-3.5 text-blue-400" />}>
                        <div className="flex items-center justify-between">
                            <div className="relative w-14 h-14">
                                <svg className="w-full h-full rotate-[-90deg]">
                                    <circle cx="28" cy="28" r="24" stroke="#1e293b" strokeWidth="4" fill="none" />
                                    <circle cx="28" cy="28" r="24" stroke="#3b82f6" strokeWidth="4" fill="none" strokeDasharray={`${sliders.incomeStab * 1.5} 150`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-400">
                                    {sliders.incomeStab}%
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={`text-xl font-bold ${sliders.incomeStab > 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {sliders.incomeStab > 70 ? 'High' : 'Med'}
                                </span>
                                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <TrendingUp className="w-3 h-3 text-green-500" /> Improving
                                </div>
                            </div>
                        </div>
                    </IndexCard>

                    {/* 2. Spending Volatility Index */}
                    <IndexCard title="Spending Volatility" icon={<Activity className="w-3.5 h-3.5 text-red-400" />}>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500">
                                <span>Risk Level</span>
                                <span className={sliders.spendingVol > 50 ? "text-red-400" : "text-green-400"}>
                                    {sliders.spendingVol > 75 ? "CRITICAL" : sliders.spendingVol > 40 ? "MODERATE" : "LOW"}
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                <motion.div
                                    className={`h-full ${sliders.spendingVol > 60 ? "bg-red-500" : sliders.spendingVol > 30 ? "bg-yellow-500" : "bg-green-500"}`}
                                    animate={{ width: `${sliders.spendingVol}%` }}
                                />
                            </div>
                        </div>
                    </IndexCard>

                    {/* 3. Savings Consistency Index */}
                    <IndexCard title="Savings Consistency" icon={<Wallet className="w-3.5 h-3.5 text-emerald-400" />}>
                        <div className="h-8 flex items-end gap-1 mt-2">
                            {[45, 55, 40, 60, 50, 65, sliders.savings].map((val, i) => (
                                <motion.div
                                    key={i}
                                    className={`w-1/7 flex-1 rounded-t-sm ${sliders.savings > 50 ? 'bg-emerald-500/60' : 'bg-yellow-500/60'}`}
                                    animate={{ height: `${val}%` }}
                                />
                            ))}
                        </div>
                        <div className={`text-right text-[10px] mt-1 font-mono ${sliders.savings > 50 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                            {sliders.savings > 50 ? '+12.4% vs Avg' : '-5.2% vs Avg'}
                        </div>
                    </IndexCard>

                    {/* 4. Liquidity Buffer Score */}
                    <IndexCard title="Liquidity Health" icon={<ShieldCheck className="w-3.5 h-3.5 text-purple-400" />}>
                        <div className="flex justify-between items-center">
                            <div className={`text-2xl font-bold ${liquidityBuffer > 4 ? 'text-purple-400' : 'text-gray-400'}`}>
                                {liquidityBuffer.toFixed(1)}x
                            </div>
                            <div className="flex gap-1" title="Months of coverage">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <motion.div
                                        key={i}
                                        className={`w-1.5 h-6 rounded-sm ${i <= liquidityBuffer ? 'bg-purple-500' : 'bg-gray-800'}`}
                                        animate={{ opacity: i <= liquidityBuffer ? 1 : 0.2 }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">Monthly Coverage Ratio</div>
                    </IndexCard>

                    {/* 5. Payment Reliability Score */}
                    <IndexCard title="Payment Reliability" icon={<CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}>
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className={`text-lg font-bold ${sliders.paymentReliability > 90 ? 'text-cyan-400' : 'text-yellow-400'}`}>
                                    {sliders.paymentReliability}/100
                                </span>
                                <span className="text-[10px] text-gray-500 uppercase">On-Time Performance</span>
                            </div>
                            <div className={`p-2 rounded-full ${sliders.paymentReliability > 90 ? 'bg-cyan-500/10' : 'bg-yellow-500/10'}`}>
                                <CheckCircle2 className={`w-5 h-5 ${sliders.paymentReliability > 90 ? 'text-cyan-500' : 'text-yellow-500'}`} />
                            </div>
                        </div>
                    </IndexCard>

                    {/* TCN Output Section (Pinned to bottom of sidebar logic conceptually, but flows here visually) */}
                    <div className="mt-4 pt-6 border-t border-white/10">
                        <h3 className="text-[10px] font-bold text-gray-400 mb-3 uppercase flex items-center gap-2">
                            <Zap className="w-3 h-3 text-yellow-500" />
                            Temporal Consistency Output
                        </h3>

                        <div className={`bg-gradient-to-br border rounded-xl p-5 relative overflow-hidden transition-all duration-700 ${stabilityScore > 0.8 ? 'from-emerald-900/20 to-emerald-900/5 border-emerald-500/20 shadow-[0_0_30px_-5px_rgba(16,185,129,0.1)]' :
                                stabilityScore > 0.6 ? 'from-yellow-900/20 to-yellow-900/5 border-yellow-500/20 shadow-[0_0_30px_-5px_rgba(234,179,8,0.1)]' :
                                    'from-red-900/20 to-red-900/5 border-red-500/20 shadow-[0_0_30px_-5px_rgba(239,68,68,0.1)]'
                            }`}>

                            <div className="relative z-10">
                                <div className="text-xs text-gray-400 mb-1 font-medium">Behavioral Stability Score</div>
                                <div className="flex items-baseline gap-2">
                                    <motion.span
                                        key={stabilityScore} // Re-render for number update animation effect logic if complex, but framer handles values too
                                        initial={{ opacity: 0.5, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`text-4xl font-bold tracking-tight ${getScoreColor(stabilityScore)}`}
                                    >
                                        {stabilityScore.toFixed(2)}
                                    </motion.span>
                                    <span className="text-xs text-gray-600 font-mono">/ 1.00</span>
                                </div>

                                <motion.div
                                    key={predictionText}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mt-4 flex items-start gap-2 text-xs text-gray-300 bg-black/40 p-2.5 rounded-lg border border-white/5 leading-relaxed"
                                >
                                    <AlertCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${getScoreColor(stabilityScore)}`} />
                                    {predictionText}
                                </motion.div>
                            </div>
                        </div>
                    </div>

                </aside>

            </main>
        </div>
    );
};

// Main Helper Components
const IndexCard = ({ title, icon, children }) => (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 group">
        <div className="flex items-center gap-2 mb-3 opacity-70 group-hover:opacity-100 transition-opacity">
            {icon}
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">{title}</span>
        </div>
        {children}
    </div>
);

const getScoreColor = (score) => {
    if (score > 0.8) return "text-emerald-400";
    if (score > 0.6) return "text-yellow-400";
    return "text-red-400";
}

const getStatusColor = (score) => {
    if (score > 0.8) return "text-emerald-500";
    if (score > 0.6) return "text-yellow-500";
    return "text-red-500";
}

export default TCNAgentVisualizer;
