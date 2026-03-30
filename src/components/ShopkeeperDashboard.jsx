import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Store, User, ShieldCheck, AlertCircle, CheckCircle, ArrowLeft, Info,
    BarChart3, BrainCircuit, Network, Coins, ArrowRight, HeartPulse, Truck
} from 'lucide-react';

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

export default function ShopkeeperDashboard({ onBack, requestData, onDecision, riskMetrics }) {
    const [view, setView] = useState('requests'); // 'requests' or 'details'
    const [isProcessing, setIsProcessing] = useState(false);

    // Mock data if none provided (for standalone demo)
    const activeRequest = requestData || {
        userName: "Rajesh Kumar",
        userLocation: "Village-2, Sector B",
        items: [
            { name: "Hybrid Wheat Seeds (20kg)", qty: 2, price: 1200 },
            { name: "Urea Fertilizer (50kg)", qty: 5, price: 850 }
        ],
        total: 6650,
        riskScore: 0.28,
        gnnConfidence: 0.84,
        tcnStability: 0.79,
        rejectionReason: "Direct loan rejected due to high spending volatility exceeding cash-buffer thresholds."
    };

    const handleDecision = (decision) => {
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            onDecision(decision);
            // Auto-navigate back to dashboard to show result
            if (onBack) onBack();
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 pt-24 font-sans selection:bg-[var(--cyber-green)]">

            {/* Header */}
            <header className="max-w-6xl mx-auto mb-12 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Store className="w-6 h-6 text-[var(--cyber-green)]" />
                            Merchant Node Dashboard
                        </h1>
                        <p className="text-xs text-gray-500">Shop: Kisan Sewa Kendra (Partner ID: #KSK-901) | Paytm MCP Connected</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest">Bank Credit Line</div>
                        <div className="text-sm font-mono text-cyan-400">₹2,50,000 Available</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--cyber-green)] to-blue-500 p-[1px]">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-bold text-xs">SK</div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Requests List (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Incoming Requests</h2>
                    <div className="p-4 rounded-2xl bg-[var(--cyber-green)]/10 border border-[var(--cyber-green)]/30 relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center border border-white/5">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{activeRequest.userName}</h3>
                                    <p className="text-[10px] text-gray-500">{activeRequest.userLocation}</p>
                                </div>
                            </div>
                            <span className="text-[10px] bg-[var(--cyber-green)]/20 text-[var(--cyber-green)] px-2 py-0.5 rounded font-bold">NEW</span>
                        </div>
                        <div className="flex justify-between items-center text-xs mb-4">
                            <span className="text-gray-400">Structured Total</span>
                            <span className="font-mono text-white font-bold">₹{activeRequest.total.toLocaleString()}</span>
                        </div>
                        <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden mb-2">
                            <motion.div
                                className="h-full bg-[var(--cyber-green)]"
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 2 }}
                            />
                        </div>
                        <p className="text-[10px] text-[var(--cyber-green)] font-medium">AI Risk Check: Passed ✅</p>
                    </div>

                    {/* Placeholder for older requests */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 opacity-40 grayscale">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-xs">Suresh Verma</h3>
                            <span className="text-[10px] text-gray-500">2 days ago</span>
                        </div>
                        <div className="text-xs text-gray-500">₹4,200 Approved</div>
                    </div>
                </div>

                {/* Right Column: AI Risk Transparency & Decision (8 cols) */}
                <div className="lg:col-span-8 flex flex-col gap-6">

                    {/* AI Risk Transparency Panel */}
                    <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <BrainCircuit className="w-32 h-32 text-cyan-400" />
                        </div>

                        <div className="flex items-center gap-2 mb-8">
                            <ShieldCheck className="w-5 h-5 text-cyan-400" />
                            <h2 className="text-lg font-bold">Risk Summary from Bank</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <AIInsightCard
                                title="Composite Risk"
                                value={activeRequest.riskScore}
                                label="Low Risk (GNN + TCN)"
                                icon={HeartPulse}
                                color="text-green-400"
                            />
                            <AIInsightCard
                                title="Relational Stability"
                                value={(activeRequest.gnnConfidence * 100).toFixed(0) + "%"}
                                label="Strong Network Ties"
                                icon={Network}
                                color="text-blue-400"
                            />
                            <AIInsightCard
                                title="Temporal Discipline"
                                value={(activeRequest.tcnStability * 100).toFixed(0) + "%"}
                                label="Consistent Repayment"
                                icon={BarChart3}
                                color="text-purple-400"
                            />
                        </div>

                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8">
                            <div className="flex items-center gap-2 text-red-400 mb-2 font-bold text-xs uppercase tracking-wider">
                                <AlertCircle className="w-4 h-4" /> REASON FOR DIRECT LOAN REJECTION
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed italic">
                                "{activeRequest.rejectionReason}"
                            </p>
                            <div className="mt-3 text-[10px] text-gray-500 border-t border-red-500/10 pt-2">
                                * Structured financing mitigates this risk by ensuring funds are used specifically for productivity gains (inputs) rather than cash liquidity.
                            </div>
                        </div>

                        {/* Inventory List */}
                        <div className="mb-8">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Requested Inventory</h3>
                            <div className="space-y-2">
                                {activeRequest.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-black/40 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-[var(--cyber-green)]" />
                                            <span className="text-sm font-medium">{item.name}</span>
                                        </div>
                                        <div className="text-sm font-mono">
                                            <span className="text-gray-500">x{item.qty}</span>
                                            <span className="ml-4 text-white">₹{(item.qty * item.price).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center p-3 mt-4 border-t border-white/10">
                                    <span className="font-bold text-white uppercase text-xs tracking-widest">Total Supply Credit</span>
                                    <span className="text-xl font-bold text-[var(--cyber-green)] font-mono">₹{activeRequest.total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Flow Visual Diagram */}
                        <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/5 relative h-48 flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                                {/* Triangle Connecting Bank, Shop, User */}
                                <svg width="300" height="150" viewBox="0 0 300 150" className="opacity-40">
                                    {/* Bank (Top) */}
                                    <circle cx="150" cy="20" r="5" fill="#3b82f6" />
                                    {/* Shop (Bottom Left) */}
                                    <circle cx="50" cy="130" r="5" fill="#10b981" />
                                    {/* User (Bottom Right) */}
                                    <circle cx="250" cy="130" r="5" fill="#fff" />

                                    {/* Paths */}
                                    <path d="M 150 20 L 50 130" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 2" />
                                    <path d="M 50 130 L 250 130" stroke="#10b981" strokeWidth="1" strokeDasharray="4 2" />
                                    <path d="M 250 130 L 150 20" stroke="#fff" strokeWidth="1" strokeDasharray="4 2" />

                                    {/* Animated Arrows */}
                                    <motion.circle r="3" fill="#3b82f6" initial={{ cx: 150, cy: 20 }} animate={{ cx: 50, cy: 130 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
                                    <motion.circle r="3" fill="#10b981" initial={{ cx: 50, cy: 130 }} animate={{ cx: 250, cy: 130 }} transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1 }} />
                                    <motion.circle r="3" fill="#fff" initial={{ cx: 250, cy: 130 }} animate={{ cx: 150, cy: 20 }} transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 2 }} />
                                </svg>
                            </div>

                            {/* Labels Overlay */}
                            <div className="relative z-10 w-full flex justify-between px-12 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                                <div className="flex flex-col items-center gap-1">
                                    <Coins className="w-4 h-4 text-cyan-400" />
                                    <span>Bank Funds Shop</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <Truck className="w-4 h-4 text-[var(--cyber-green)]" />
                                    <span>Shop Supplies User</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <Coins className="w-4 h-4 text-white" />
                                    <span>User Repays Bank</span>
                                </div>
                            </div>
                        </div>

                        {/* Decision Buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => handleDecision('rejected')}
                                className="flex-1 py-4 rounded-2xl border border-red-500/20 hover:bg-red-500/10 text-red-400 font-bold transition-all text-sm uppercase tracking-wider"
                            >
                                Decline Credit
                            </button>
                            <button
                                onClick={() => handleDecision('approved')}
                                disabled={isProcessing}
                                className="flex-[2] py-4 rounded-2xl bg-[var(--cyber-green)] hover:bg-[#00cc7d] text-black font-extrabold transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,255,157,0.2)]"
                            >
                                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Approve Structured Financing</>}
                            </button>
                        </div>

                    </div>

                </div>
            </main>

        </div>
    );
}

// Reuse RefreshCw for Spinner
function RefreshCw(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
        </svg>
    );
}
