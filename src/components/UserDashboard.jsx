import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import {
    TrendingUp, ShieldCheck, AlertCircle, CheckCircle, Info, ChevronRight, ArrowLeft, RefreshCw, Zap,
    Store, ShoppingCart, Truck, Clock, MapPin
} from 'lucide-react';

const MetricCard = ({ label, value, subtext, status }) => (
    <div className="glass-panel p-4 rounded-xl border border-white/5 bg-white/5 flex flex-col justify-between h-full">
        <div>
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">{label}</div>
            <div className="text-2xl font-bold text-white mb-1">{value}</div>
        </div>
        <div className={`text-xs font-medium flex items-center gap-1 ${status === 'good' ? 'text-green-400' :
            status === 'warning' ? 'text-yellow-400' : 'text-red-400'
            }`}>
            {status === 'good' ? <TrendingUp className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {subtext}
        </div>
    </div>
);

// Mock Data for Shops and Items
const NEARBY_SHOPS = [
    { id: 1, name: "Kisan Sewa Kendra", distance: "0.8 km", rating: "4.8", verified: true, inventory: ["Seeds", "Fertilizers"] },
    { id: 2, name: "AgriTarget Supplies", distance: "2.1 km", rating: "4.5", verified: true, inventory: ["Tools", "Pesticides"] },
    { id: 3, name: "Village Co-op Store", distance: "3.5 km", rating: "4.9", verified: true, inventory: ["All"] },
];

const SHOP_ITEMS = [
    { id: 's1', name: "Hybrid Wheat Seeds (20kg)", price: 1200, credit: true },
    { id: 'f1', name: "Urea Fertilizer (50kg)", price: 850, credit: true },
    { id: 'p1', name: "Bio-Pesticide (1L)", price: 450, credit: true },
    { id: 't1', name: "Spread Sprayer", price: 2500, credit: false }, // Cash only example
    { id: 'f2', name: "DAP Fertilizer (50kg)", price: 1350, credit: true },
];

export default function UserDashboard({ onBack, loanStatus = 'none', onApplyLoan, onNavigateTo, setStructuredRequest }) {
    const [simulating, setSimulating] = useState(false);
    const [improvementMode, setImprovementMode] = useState(false);
    const [showApplicationModal, setShowApplicationModal] = useState(false);
    const [loanAmount, setLoanAmount] = useState('50000');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Alternative Financing State
    const [financingStep, setFinancingStep] = useState(0); // 0: None, 1: Intro, 2: Shops, 3: Items, 4: Pending
    const [selectedShop, setSelectedShop] = useState(null);
    const [cart, setCart] = useState({}); // { itemId: quantity }

    // Auto-navigate to shopkeeper for demo when request is in pending state
    React.useEffect(() => {
        if (financingStep === 4 && loanStatus === 'rejected') {
            const timer = setTimeout(() => {
                if (onNavigateTo) onNavigateTo('shopkeeper');
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [financingStep, loanStatus, onNavigateTo]);

    // ... (Chart Data logic remains same)
    // Initial Data
    const initialData = [
        { week: 'W1', income: 4000, spending: 3800, savings: 200 },
        { week: 'W2', income: 4200, spending: 4000, savings: 200 },
        { week: 'W3', income: 3800, spending: 4100, savings: -300 },
        { week: 'W4', income: 4500, spending: 3500, savings: 1000 },
        { week: 'W5', income: 4100, spending: 3900, savings: 200 },
        { week: 'W6', income: 4300, spending: 4200, savings: 100 },
        { week: 'W7', income: 4000, spending: 3800, savings: 200 },
        { week: 'W8', income: 4600, spending: 3600, savings: 1000 },
        { week: 'W9', income: 4200, spending: 4000, savings: 200 },
        { week: 'W10', income: 4400, spending: 4100, savings: 300 },
        { week: 'W11', income: 4100, spending: 3900, savings: 200 },
        { week: 'W12', income: 4500, spending: 3700, savings: 800 },
    ];

    const improvedData = initialData.map((d, i) => i > 8 ? { ...d, savings: d.savings + 500, spending: d.spending - 300 } : d);
    const [chartData, setChartData] = useState(initialData);

    const toggleSimulation = () => {
        setSimulating(true);
        setTimeout(() => {
            setImprovementMode(!improvementMode);
            setChartData(!improvementMode ? improvedData : initialData);
            setSimulating(false);
        }, 800);
    };

    const handleApply = () => {
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            setShowApplicationModal(false);
            onApplyLoan(loanAmount);
        }, 1500);
    };

    // Helper to calculate total
    const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
        const item = SHOP_ITEMS.find(i => i.id === id);
        return sum + (item ? item.price * qty : 0);
    }, 0);

    const handleSubmitFinancing = () => {
        setIsSubmitting(true);
        const selectedItems = Object.entries(cart).map(([id, qty]) => {
            const item = SHOP_ITEMS.find(i => i.id === id);
            return { name: item.name, qty, price: item.price };
        }).filter(i => i.qty > 0);

        setTimeout(() => {
            setFinancingStep(4);
            setIsSubmitting(false);
            if (setStructuredRequest) {
                setStructuredRequest({
                    userName: "Rajesh Kumar",
                    userLocation: "Village-2, Sector B",
                    items: selectedItems,
                    total: cartTotal,
                    riskScore: 0.62, // Matches GNN
                    gnnConfidence: 0.62,
                    tcnStability: 0.58,
                    rejectionReason: "Direct loan rejected due to Income Volatility (Spending volatility exceeding cash-buffer thresholds)."
                });
            }
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-8 pt-24 font-sans selection:bg-cyan-500/30">

            {/* Header */}
            <header className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="flex items-center text-white/50 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back
                    </button>
                    <h1 className="text-2xl font-bold">Borrower Dashboard</h1>
                </div>
                {/* Visual Flow Indicator for Alternative Financing */}
                {financingStep > 0 && (
                    <div className="hidden md:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                        <div className={`w-2 h-2 rounded-full ${financingStep >= 1 ? 'bg-[var(--cyber-green)]' : 'bg-gray-600'}`} />
                        <span className="text-xs text-gray-400">AI Assist</span>
                        <div className="w-4 h-[1px] bg-white/10" />
                        <div className={`w-2 h-2 rounded-full ${financingStep >= 2 ? 'bg-[var(--cyber-green)]' : 'bg-gray-600'}`} />
                        <span className="text-xs text-gray-400">Shop</span>
                        <div className="w-4 h-[1px] bg-white/10" />
                        <div className={`w-2 h-2 rounded-full ${financingStep >= 3 ? 'bg-[var(--cyber-green)]' : 'bg-gray-600'}`} />
                        <span className="text-xs text-gray-400">Items</span>
                        <div className="w-4 h-[1px] bg-white/10" />
                        <div className={`w-2 h-2 rounded-full ${financingStep >= 4 ? 'bg-[var(--cyber-green)]' : 'bg-gray-600'}`} />
                        <span className="text-xs text-gray-400">Approval</span>
                    </div>
                )}
            </header>

            {/* Top Status Card when Rejected */}
            <AnimatePresence>
                {loanStatus === 'rejected' && financingStep === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-6xl mx-auto mb-8 p-6 rounded-2xl bg-red-500/10 border border-red-500/20 relative overflow-hidden"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-red-500/20">
                                <AlertCircle className="w-6 h-6 text-red-500" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-white mb-1">Loan Application Status: Rejected</h2>
                                <p className="text-sm text-gray-400 mb-4">Your loan request was not approved based on risk evaluation.</p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-red-500/10">
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Relational Risk Score (GNN)</div>
                                        <div className="text-lg font-mono font-bold text-red-400">0.62</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Behavioral Stability (TCN)</div>
                                        <div className="text-lg font-mono font-bold text-red-400">0.58</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Primary Risk Driver</div>
                                        <div className="text-lg font-bold text-white">Income Volatility</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Financial Behavior (2/3 width) */}
                <div className={`lg:col-span-2 space-y-6 transition-opacity duration-500 ${financingStep > 0 ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>

                    {/* Graph Section */}
                    <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                                    Financial Behavior
                                </h2>
                                <p className="text-xs text-gray-400">12-Week Income vs Spending Analysis</p>
                            </div>
                            <button
                                onClick={toggleSimulation}
                                disabled={simulating}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${improvementMode
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                                    }`}
                            >
                                {simulating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                {improvementMode ? 'Simulation Active' : 'Simulate Improvement'}
                            </button>
                        </div>

                        <div className="h-64 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="week" stroke="#ffffff40" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', borderColor: '#333', borderRadius: '8px' }}
                                        itemStyle={{ fontSize: '12px' }}
                                    />
                                    <Area type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                                    <Area type="monotone" dataKey="spending" stroke="#ef4444" strokeWidth={2} fillOpacity={0} fill="transparent" strokeDasharray="5 5" />
                                    <Area type="monotone" dataKey="savings" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSavings)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            <MetricCard label="Income Stability" value={improvementMode ? "82%" : "78%"} subtext={improvementMode ? "High" : "Moderate"} status={improvementMode ? "good" : "warning"} />
                            <MetricCard label="Spending Volatility" value={improvementMode ? "Low" : "Med-High"} subtext={improvementMode ? "Controlled" : "Fluctuating"} status={improvementMode ? "good" : "warning"} />
                            <MetricCard label="Savings Rate" value={improvementMode ? "15%" : "4%"} subtext={improvementMode ? "Excellent" : "Low"} status={improvementMode ? "good" : "bad"} />
                            <MetricCard label="Payment Reliability" value="98%" subtext="Strong" status="good" />
                        </div>
                    </div>

                    {/* Secondary Fallback Card */}
                    <AnimatePresence>
                        {loanStatus === 'rejected' && financingStep === 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="glass-panel p-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-black/40 relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Store className="w-32 h-32 text-[var(--cyber-green)]" />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-bold text-white mb-2">Need Support? Alternative Supply Financing Available</h3>
                                    <p className="text-gray-400 mb-8 max-w-xl text-lg">
                                        While direct cash lending was not approved, you may request supply-based financing through verified agri partners.
                                    </p>
                                    <button
                                        onClick={() => setFinancingStep(1)}
                                        className="px-8 py-4 bg-[var(--cyber-green)] hover:bg-[#00cc7d] text-black font-bold rounded-xl shadow-[0_0_30px_rgba(0,255,157,0.3)] transition-all flex items-center gap-2 text-lg"
                                    >
                                        Explore Alternative Financing <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Column: Loan Status (1/3 width) - Switches to Financing Flow */}
                <div className="lg:col-span-1 space-y-6">

                    {/* MAIN INTERACTION CARD */}
                    <AnimatePresence mode="wait">
                        {financingStep === 0 ? (
                            <motion.div
                                key="status-card"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="glass-panel p-6 rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-black/40 h-full flex flex-col relative overflow-hidden min-h-[400px]"
                            >
                                {/* Background Glow */}
                                <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${loanStatus === 'approved' ? 'from-green-500/20' : loanStatus === 'rejected' ? 'from-red-500/20' : 'from-blue-500/10'} blur-[80px] rounded-full pointer-events-none`} />

                                <h2 className="text-lg font-bold mb-6 relative z-10">
                                    {loanStatus === 'rejected' ? 'Current Status' : 'Loan Application'}
                                </h2>

                                <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
                                    {/* STATUS: NONE (Apply) */}
                                    {loanStatus === 'none' && (
                                        <>
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                                                <ShieldCheck className="w-8 h-8 text-cyan-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">Eligible for Loan</h3>
                                            <p className="text-sm text-gray-400 mb-8">
                                                Your profile meets the baseline criteria for micro-credit up to ₹50,000.
                                            </p>
                                            <button onClick={() => setShowApplicationModal(true)} className="w-full py-3 bg-[var(--cyber-green)] hover:bg-[#00cc7d] text-black font-bold rounded-xl shadow-[0_0_20px_rgba(0,255,157,0.3)] transition-all">
                                                Apply Now
                                            </button>
                                        </>
                                    )}

                                    {/* STATUS: REVIEW */}
                                    {loanStatus === 'review' && (
                                        <>
                                            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4 border border-yellow-500/20 animate-pulse">
                                                <RefreshCw className="w-8 h-8 text-yellow-400 animate-spin" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">Under Review</h3>
                                            <p className="text-sm text-gray-400 mb-8">
                                                The AI Decision Engine is analyzing your profile. This usually takes less than a minute.
                                            </p>
                                        </>
                                    )}

                                    {/* STATUS: APPROVED */}
                                    {loanStatus === 'approved' && (
                                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 border border-green-500/20">
                                                <CheckCircle className="w-8 h-8 text-green-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">Loan Sanctioned</h3>
                                            <p className="text-sm text-green-400/80 mb-6 bg-green-500/10 py-2 px-3 rounded-lg border border-green-500/20">
                                                Funds unlocked via Smart Contract
                                            </p>
                                        </motion.div>
                                    )}

                                    {/* STATUS: REJECTED - TRIGGER ALTERNATIVE FLOW handled by cards above */}
                                    {loanStatus === 'rejected' && (
                                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
                                                <AlertCircle className="w-8 h-8 text-red-400" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">Rejected</h3>
                                            <p className="text-sm text-gray-400 mb-6 font-mono">
                                                Risk Factor: 0.62 (High)
                                            </p>
                                            <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg">
                                                See detailed analysis at top of page
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* STATUS: STRUCTURED APPROVED */}
                                    {loanStatus === 'structured_approved' && (
                                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                                            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 border border-green-500/20 shadow-[0_0_40px_rgba(34,197,94,0.2)]">
                                                <CheckCircle className="w-10 h-10 text-green-400" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-2">Structured Financing Approved</h3>
                                            <p className="text-green-400/90 text-sm mb-4 font-bold uppercase tracking-wider">
                                                Items ready for collection
                                            </p>
                                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left">
                                                <div className="flex items-center gap-2 text-[var(--cyber-green)] mb-1">
                                                    <Store className="w-4 h-4" />
                                                    <span className="text-xs font-bold uppercase tracking-widest">{selectedShop?.name || 'Partner Store'}</span>
                                                </div>
                                                <div className="text-[10px] text-gray-400">Transaction Confirmed via Smart Contract</div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* STATUS: STRUCTURED REJECTED */}
                                    {loanStatus === 'structured_rejected' && (
                                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
                                                <AlertCircle className="w-8 h-8 text-red-500" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">Shopkeeper Declined Request</h3>
                                            <p className="text-sm text-gray-400 mb-6">
                                                Please try another partner for your supply-based financing.
                                            </p>
                                            <button onClick={() => setFinancingStep(2)} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-xs font-bold uppercase tracking-widest">
                                                Try Another Partner
                                            </button>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            // ALTERNATIVE FINANCING MULTI-STEP FLOW - FIXED AS SIDEBAR/MODAL HYBRID
                            <motion.div
                                key="financing-flow"
                                initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
                                className="glass-panel p-6 rounded-2xl border border-[var(--cyber-green)]/30 bg-black/80 h-full flex flex-col relative min-h-[500px]"
                            >
                                <button onClick={() => setFinancingStep(Math.max(0, financingStep - 1))} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                                    <ArrowLeft className="w-4 h-4" />
                                </button>

                                {/* Step 1: Agent Intro */}
                                {financingStep === 1 && (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 rounded-full bg-[var(--cyber-green)]/20 flex items-center justify-center mb-6 border border-[var(--cyber-green)]/40">
                                            <Store className="w-8 h-8 text-[var(--cyber-green)]" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-4">Structured Supply Financing</h3>
                                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                                            Instead of cash, we will approve a credit line for specific agricultural inputs (Seeds, Fertilizers) through our partner network.
                                        </p>
                                        <ul className="text-left text-sm text-gray-300 space-y-3 mb-8 bg-white/5 p-4 rounded-xl border border-white/10 w-full">
                                            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[var(--cyber-green)]" /> 0% Interest for 30 days</li>
                                            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[var(--cyber-green)]" /> Verified Quality Goods</li>
                                            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[var(--cyber-green)]" /> Direct Bank-to-Shop Payment</li>
                                        </ul>
                                        <button onClick={() => setFinancingStep(2)} className="w-full py-3 bg-[var(--cyber-green)] text-black font-bold rounded-xl hover:bg-[#00cc7d]">
                                            Find Nearby Agri Shops
                                        </button>
                                    </div>
                                )}

                                {/* Step 2: Shop Selection */}
                                {financingStep === 2 && (
                                    <div className="flex-1 flex flex-col">
                                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                            <MapPin className="w-5 h-5 text-[var(--cyber-green)]" /> Select Shopkeeper
                                        </h3>
                                        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                            {NEARBY_SHOPS.map(shop => (
                                                <div key={shop.id} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[var(--cyber-green)]/50 transition-all cursor-pointer group" onClick={() => { setSelectedShop(shop); setFinancingStep(3); }}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-white group-hover:text-[var(--cyber-green)] transition-colors">{shop.name}</h4>
                                                        <span className="text-xs bg-[var(--cyber-green)]/20 text-[var(--cyber-green)] px-2 py-0.5 rounded">{shop.rating} ★</span>
                                                    </div>
                                                    <div className="text-xs text-gray-400 mb-3 flex items-center gap-4">
                                                        <span>{shop.distance}</span>
                                                        {shop.verified && <span className="flex items-center gap-1 text-blue-400"><ShieldCheck className="w-3 h-3" /> Verified</span>}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {shop.inventory.map(i => (
                                                            <span key={i} className="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-300 border border-white/5">{i}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Item Selection */}
                                {financingStep === 3 && (
                                    <div className="flex-1 flex flex-col">
                                        <h3 className="text-lg font-bold mb-2">{selectedShop?.name}</h3>
                                        <p className="text-xs text-gray-500 mb-6">Select items for financing request</p>

                                        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 mb-4">
                                            {SHOP_ITEMS.map(item => (
                                                <div key={item.id} className={`p-3 rounded-xl border transition-all flex justify-between items-center ${cart[item.id] ? 'bg-[var(--cyber-green)]/10 border-[var(--cyber-green)]' : 'bg-white/5 border-white/10'}`}>
                                                    <div>
                                                        <div className="font-medium text-sm text-white">{item.name}</div>
                                                        <div className="text-xs text-gray-400">₹{item.price}</div>
                                                    </div>
                                                    {item.credit ? (
                                                        <div className="flex items-center gap-3">
                                                            {cart[item.id] > 0 && (
                                                                <button onClick={() => setCart({ ...cart, [item.id]: cart[item.id] - 1 })} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">-</button>
                                                            )}
                                                            <span className={`text-sm font-mono ${cart[item.id] ? 'text-white' : 'text-gray-600'}`}>{cart[item.id] || 0}</span>
                                                            <button onClick={() => setCart({ ...cart, [item.id]: (cart[item.id] || 0) + 1 })} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center">+</button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-1 rounded">Cash Only</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="border-t border-white/10 pt-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-sm text-gray-400">Total Request</span>
                                                <span className="text-xl font-bold text-[var(--cyber-green)] font-mono">₹{cartTotal.toLocaleString()}</span>
                                            </div>
                                            <button
                                                onClick={handleSubmitFinancing}
                                                disabled={cartTotal === 0 || isSubmitting}
                                                className="w-full py-3 bg-[var(--cyber-green)] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl hover:bg-[#00cc7d] flex items-center justify-center gap-2"
                                            >
                                                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Submit Financing Request'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 4: Pending / Sent / Result */}
                                {financingStep === 4 && (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                                        {loanStatus === 'structured_approved' ? (
                                            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                                                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 border border-green-500/20">
                                                    <CheckCircle className="w-10 h-10 text-green-400" />
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-2">Structured Financing Approved</h3>
                                                <p className="text-green-400/80 text-sm mb-8 bg-green-500/10 py-2 px-3 rounded-lg border border-green-500/20">
                                                    Items ready for collection
                                                </p>
                                                <button onClick={() => setFinancingStep(0)} className="text-xs text-gray-500 underline hover:text-white">Done</button>
                                            </motion.div>
                                        ) : loanStatus === 'structured_rejected' ? (
                                            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                                                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                                                    <AlertCircle className="w-10 h-10 text-red-500" />
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-2">Shopkeeper Declined Request</h3>
                                                <p className="text-gray-400 text-sm mb-8">
                                                    Try another partner
                                                </p>
                                                <button onClick={() => setFinancingStep(2)} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">Try Another Shop</button>
                                            </motion.div>
                                        ) : (
                                            <>
                                                <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6 border border-yellow-500/20 animate-pulse">
                                                    <Clock className="w-10 h-10 text-yellow-500" />
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-2">Structured Financing Request Sent</h3>
                                                <p className="text-gray-400 text-sm mb-8">
                                                    Waiting for Shopkeeper ({selectedShop?.name}) to approve inventory availability.
                                                </p>

                                                <div className="bg-white/5 rounded-lg p-4 w-full text-left border border-white/10">
                                                    <div className="text-xs text-gray-500 uppercase mb-2">Next Steps</div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                                        <span className="text-sm text-gray-300">Shopkeeper Approval</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-gray-600" />
                                                        <span className="text-sm text-gray-500">Bank Disbursal</span>
                                                    </div>
                                                </div>
                                                {/* DEMO BUTTON TO JUMP TO SHOPKEEPER VIEW */}
                                                <button
                                                    onClick={() => onNavigateTo && onNavigateTo('shopkeeper')}
                                                    className="mt-8 text-xs text-gray-500 underline hover:text-[var(--cyber-green)]"
                                                >
                                                    (Demo) Go to Shopkeeper View
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>

            </main>

            {/* Application Modal (Original) - Keep logic mostly same */}
            <AnimatePresence>
                {showApplicationModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm glass-panel bg-[#0B0E14] border border-white/10 rounded-2xl p-6">
                            <h3 className="text-lg font-bold mb-4">Confirm Application</h3>
                            <div className="mb-4">
                                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Loan Amount</label>
                                <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                                    <span className="text-gray-400 mr-2">₹</span>
                                    <input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} className="bg-transparent border-none outline-none text-white w-full font-mono" />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowApplicationModal(false)} className="flex-1 py-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">Cancel</button>
                                <button onClick={handleApply} className="flex-1 py-3 bg-[var(--cyber-green)] text-black font-bold rounded-lg hover:bg-[#00cc7d] transition-colors flex items-center justify-center gap-2">
                                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
