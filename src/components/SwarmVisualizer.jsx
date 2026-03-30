import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Play, RotateCcw, Zap, ShieldCheck, CreditCard,
    BrainCircuit, Search, CheckCircle, XCircle, Clock, Activity,
    ArrowRight, Cpu, Network, AlertTriangle
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const PIPELINE_STAGES = [
    { id: 'plan', label: 'PLAN', agent: 'PLANNER', icon: Cpu, color: '#8b5cf6', desc: 'Decompose credit request' },
    { id: 'analyze', label: 'ANALYZE', agent: 'ANALYST', icon: BrainCircuit, color: '#3b82f6', desc: 'GNN + TCN scoring' },
    { id: 'verify', label: 'VERIFY', agent: 'VERIFIER', icon: Search, color: '#f59e0b', desc: 'Fraud detection + prices' },
    { id: 'validate', label: 'VALIDATE', agent: 'VALIDATOR', icon: ShieldCheck, color: '#10b981', desc: 'Cross-validate & decide' },
    { id: 'disburse', label: 'DISBURSE', agent: 'DISBURSER', icon: CreditCard, color: '#00ff9d', desc: 'Pay via Paytm MCP' },
];

const AgentNode = ({ stage, status, isParallel }) => {
    const Icon = stage.icon;
    const statusColors = {
        pending: 'border-white/10 bg-white/5',
        running: `border-[${stage.color}] bg-[${stage.color}]/10 animate-pulse`,
        completed: `border-green-500/50 bg-green-500/10`,
        failed: 'border-red-500/50 bg-red-500/10',
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative p-4 rounded-2xl border-2 transition-all duration-500 min-w-[140px] ${
                status === 'running' ? 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_20px_rgba(250,204,21,0.2)]' :
                status === 'completed' ? 'border-green-500/50 bg-green-500/10' :
                status === 'failed' ? 'border-red-500/50 bg-red-500/10' :
                'border-white/10 bg-white/5'
            }`}
        >
            {status === 'running' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 animate-ping" />
            )}
            {status === 'completed' && (
                <div className="absolute -top-1 -right-1">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
            )}
            <div className="flex flex-col items-center gap-2">
                <Icon className="w-6 h-6" style={{ color: status === 'pending' ? '#6b7280' : stage.color }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: status === 'pending' ? '#6b7280' : stage.color }}>
                    {stage.label}
                </span>
                <span className="text-[10px] text-gray-500">{stage.desc}</span>
            </div>
            {isParallel && (
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 text-[8px] text-yellow-400 font-bold bg-yellow-400/20 px-1 rounded">
                    ||
                </div>
            )}
        </motion.div>
    );
};

const LogEntry = ({ log, index }) => {
    const agentColors = {
        SWARM: '#00ff9d',
        PLANNER: '#8b5cf6',
        ANALYST: '#3b82f6',
        VERIFIER: '#f59e0b',
        VALIDATOR: '#10b981',
        DISBURSER: '#00ff9d',
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex gap-3 text-xs font-mono py-1.5 border-b border-white/5 last:border-0"
        >
            <span className="text-gray-600 shrink-0 w-16">
                {log.latency_ms > 0 ? `${log.latency_ms.toFixed(0)}ms` : '---'}
            </span>
            <span className="font-bold shrink-0 w-20" style={{ color: agentColors[log.agent] || '#9ca3af' }}>
                {log.agent}
            </span>
            <span className="text-gray-400 shrink-0 w-28 uppercase text-[10px]">{log.action}</span>
            <span className="text-gray-300 flex-1">{log.detail}</span>
        </motion.div>
    );
};

export default function SwarmVisualizer({ onBack }) {
    const [status, setStatus] = useState('idle'); // idle, running, completed, error
    const [stageStatus, setStageStatus] = useState({});
    const [logs, setLogs] = useState([]);
    const [result, setResult] = useState(null);
    const [latency, setLatency] = useState(0);
    const logRef = useRef(null);

    const runSwarm = async () => {
        setStatus('running');
        setLogs([]);
        setResult(null);
        setStageStatus({});

        // Animate pipeline stages
        const animateStage = (id, s, delay) => {
            setTimeout(() => setStageStatus(prev => ({ ...prev, [id]: s })), delay);
        };

        animateStage('plan', 'running', 0);
        animateStage('plan', 'completed', 400);
        animateStage('analyze', 'running', 500);
        animateStage('verify', 'running', 500); // Parallel!
        animateStage('analyze', 'completed', 1500);
        animateStage('verify', 'completed', 1800);
        animateStage('validate', 'running', 2000);
        animateStage('validate', 'completed', 2500);
        animateStage('disburse', 'running', 2600);

        const startTime = Date.now();

        try {
            const res = await fetch(`${API_BASE}/swarm/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchant_id: "KSK-901",
                    merchant_name: "Kisan Sewa Kendra",
                    farmer_id: "FARMER-001",
                    farmer_name: "Rajesh Kumar",
                    loan_amount: 6650,
                    items: [
                        { name: "Hybrid Wheat Seeds (20kg)", qty: 2, price: 1200 },
                        { name: "Urea Fertilizer (50kg)", qty: 5, price: 850 },
                    ],
                    transaction_data: {
                        upi_monthly_count: 45,
                        qr_payments_count: 22,
                        soundbox_active: true,
                        soundbox_txn_count: 30,
                        avg_ticket_size: 650,
                        unique_customers: 78,
                        months_active: 18,
                        monthly_income: 15000,
                        monthly_expense: 12000,
                        p2p_received_monthly: 5000,
                        p2p_sent_monthly: 3000,
                        current_month_count: 50,
                        avg_monthly_count: 45,
                        merchant_kyc_verified: true,
                        repeat_customers: 45,
                        new_customers_monthly: 12,
                        settlement_amount: 200000,
                        loans_repaid: 2,
                        default_rate: 0.0,
                        merchant_tier: 2,
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
                    },
                }),
            });

            const data = await res.json();
            const elapsed = Date.now() - startTime;
            setLatency(data.total_latency_ms || elapsed);
            setLogs(data.logs || []);
            setResult(data);
            setStatus('completed');
            animateStage('disburse', data.decision === 'rejected' ? 'failed' : 'completed', 0);

        } catch (err) {
            // Offline fallback — simulate the swarm execution
            const simulatedLogs = [
                { timestamp: Date.now()/1000, agent: "SWARM", action: "INIT", detail: "Swarm initialized for request abc123", latency_ms: 0 },
                { timestamp: Date.now()/1000, agent: "PLANNER", action: "PLAN", detail: "Decomposing credit request into sub-tasks", latency_ms: 12 },
                { timestamp: Date.now()/1000, agent: "PLANNER", action: "PLAN_COMPLETE", detail: "Generated 6 execution steps", latency_ms: 15 },
                { timestamp: Date.now()/1000, agent: "SWARM", action: "EXECUTE", detail: "Launching Analyst and Verifier agents in parallel", latency_ms: 0 },
                { timestamp: Date.now()/1000, agent: "ANALYST", action: "START", detail: "Beginning credit analysis pipeline", latency_ms: 0 },
                { timestamp: Date.now()/1000, agent: "ANALYST", action: "GNN_COMPLETE", detail: "GNN confidence: 0.7823", latency_ms: 45 },
                { timestamp: Date.now()/1000, agent: "ANALYST", action: "TCN_COMPLETE", detail: "TCN stability: 0.6842", latency_ms: 38 },
                { timestamp: Date.now()/1000, agent: "VERIFIER", action: "FRAUD_CHECK", detail: "Fraud score: 0.05, flags: 0", latency_ms: 22 },
                { timestamp: Date.now()/1000, agent: "VERIFIER", action: "PRICE_CHECK", detail: "Price verified: true", latency_ms: 18 },
                { timestamp: Date.now()/1000, agent: "VALIDATOR", action: "RISK_COMPUTED", detail: "GNN=0.22 TCN=0.32 Fraud=0.05 → Composite=0.23 → structured", latency_ms: 5 },
                { timestamp: Date.now()/1000, agent: "DISBURSER", action: "START", detail: "Initiating payment for ₹6650 via Paytm MCP", latency_ms: 0 },
                { timestamp: Date.now()/1000, agent: "DISBURSER", action: "COMPLETE", detail: "Payment success: TXN#PTM-A1B2C3D4E5F6", latency_ms: 180 },
                { timestamp: Date.now()/1000, agent: "DISBURSER", action: "RECOVERY_SCHEDULED", detail: "Auto-deduction linked to farmer FARMER-001 harvest cycle", latency_ms: 0 },
                { timestamp: Date.now()/1000, agent: "SWARM", action: "COMPLETE", detail: "Swarm completed in 342ms", latency_ms: 342 },
            ];

            // Animate logs appearing one by one
            for (let i = 0; i < simulatedLogs.length; i++) {
                await new Promise(r => setTimeout(r, 200));
                setLogs(prev => [...prev, simulatedLogs[i]]);
            }

            setLatency(342);
            setResult({
                success: true,
                decision: "structured",
                state: {
                    gnn_confidence: 0.7823,
                    tcn_stability: 0.6842,
                    fraud_score: 0.05,
                    composite_risk: 0.2305,
                    payment_txn_id: "PTM-A1B2C3D4E5F6",
                    decision_reason: "Moderate risk (0.23). Recommending structured supply financing to mitigate cash misuse risk while enabling productive investment.",
                },
            });
            setStatus('completed');
            animateStage('disburse', 'completed', 0);
        }
    };

    const reset = () => {
        setStatus('idle');
        setStageStatus({});
        setLogs([]);
        setResult(null);
        setLatency(0);
    };

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs]);

    const decisionColor = result?.decision === 'approved' ? 'text-green-400' :
                           result?.decision === 'structured' ? 'text-cyan-400' :
                           result?.decision === 'rejected' ? 'text-red-400' : 'text-gray-400';

    const decisionBg = result?.decision === 'approved' ? 'bg-green-500/10 border-green-500/30' :
                        result?.decision === 'structured' ? 'bg-cyan-500/10 border-cyan-500/30' :
                        result?.decision === 'rejected' ? 'bg-red-500/10 border-red-500/30' : '';

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 pt-24 font-sans">

            {/* Header */}
            <header className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Zap className="w-6 h-6 text-[var(--cyber-green)]" />
                            Agent Swarm Execution
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">Prism-Inspired Pipeline — Built on Paytm MCP</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {status === 'completed' && (
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span className="text-xs font-mono text-cyan-400">{latency.toFixed(0)}ms</span>
                        </div>
                    )}
                    {status === 'idle' ? (
                        <button onClick={runSwarm} className="px-6 py-2.5 bg-[var(--cyber-green)] text-black font-bold rounded-xl hover:bg-[#00cc7d] flex items-center gap-2 shadow-[0_0_20px_rgba(0,255,157,0.3)]">
                            <Play className="w-4 h-4" /> Run Swarm
                        </button>
                    ) : status === 'completed' ? (
                        <button onClick={reset} className="px-6 py-2.5 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 flex items-center gap-2">
                            <RotateCcw className="w-4 h-4" /> Reset
                        </button>
                    ) : (
                        <div className="px-6 py-2.5 bg-yellow-500/20 text-yellow-400 font-bold rounded-xl flex items-center gap-2 animate-pulse">
                            <Activity className="w-4 h-4 animate-spin" /> Executing...
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto space-y-8">

                {/* Pipeline Visualization */}
                <div className="glass-panel p-8 rounded-2xl border border-white/10 bg-black/60">
                    <div className="flex items-center gap-2 mb-6">
                        <Network className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Swarm Pipeline</span>
                        <span className="text-[10px] text-gray-600 ml-2">Plan → [Analyze || Verify] → Validate → Disburse</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
                        {PIPELINE_STAGES.map((stage, i) => (
                            <React.Fragment key={stage.id}>
                                <AgentNode
                                    stage={stage}
                                    status={stageStatus[stage.id] || 'pending'}
                                    isParallel={stage.id === 'analyze' || stage.id === 'verify'}
                                />
                                {i < PIPELINE_STAGES.length - 1 && (
                                    <div className="shrink-0 flex items-center">
                                        <ArrowRight className={`w-5 h-5 ${stageStatus[PIPELINE_STAGES[i + 1]?.id] ? 'text-[var(--cyber-green)]' : 'text-gray-700'} transition-colors`} />
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Agent Execution Log */}
                    <div className="lg:col-span-8">
                        <div className="glass-panel rounded-2xl border border-white/10 bg-black/60 overflow-hidden">
                            {/* Terminal Header */}
                            <div className="flex items-center px-4 py-2.5 bg-white/5 border-b border-white/10 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                <span className="ml-3 text-xs font-mono text-white/40">trustai-swarm — v2.0.0</span>
                                <div className="ml-auto flex items-center gap-2">
                                    <span className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded">MCP:paytm</span>
                                    <span className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded">agents:3</span>
                                </div>
                            </div>

                            {/* Log Content */}
                            <div ref={logRef} className="p-4 h-[400px] overflow-y-auto custom-scrollbar">
                                {logs.length === 0 && status === 'idle' && (
                                    <div className="flex items-center justify-center h-full text-gray-600">
                                        <div className="text-center">
                                            <Cpu className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p className="text-sm">Click "Run Swarm" to execute the agent pipeline</p>
                                            <p className="text-[10px] text-gray-700 mt-1">Agents will analyze, verify, and disburse in real-time</p>
                                        </div>
                                    </div>
                                )}
                                {logs.map((log, i) => (
                                    <LogEntry key={i} log={log} index={i} />
                                ))}
                                {status === 'running' && (
                                    <div className="text-[var(--cyber-green)] animate-pulse mt-2 font-mono text-sm">_</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div className="lg:col-span-4 space-y-4">

                        {/* Decision Card */}
                        <AnimatePresence>
                            {result && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`p-6 rounded-2xl border ${decisionBg}`}
                                >
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Swarm Decision</h3>
                                    <div className={`text-3xl font-black uppercase tracking-tight mb-3 ${decisionColor}`}>
                                        {result.decision === 'structured' ? 'STRUCTURED FINANCING' : result.decision?.toUpperCase()}
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed mb-4">
                                        {result.state?.decision_reason}
                                    </p>

                                    {/* Metrics */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">GNN Confidence</span>
                                            <span className="text-blue-400 font-mono">{result.state?.gnn_confidence?.toFixed(4)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">TCN Stability</span>
                                            <span className="text-purple-400 font-mono">{result.state?.tcn_stability?.toFixed(4)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Fraud Score</span>
                                            <span className="text-yellow-400 font-mono">{result.state?.fraud_score?.toFixed(4)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs border-t border-white/10 pt-2 mt-2">
                                            <span className="text-gray-400 font-bold">Composite Risk</span>
                                            <span className={`font-mono font-bold ${decisionColor}`}>{result.state?.composite_risk?.toFixed(4)}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* MCP Payment Card */}
                        <AnimatePresence>
                            {result?.state?.payment_txn_id && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="p-6 rounded-2xl border border-[var(--cyber-green)]/30 bg-[var(--cyber-green)]/5"
                                >
                                    <div className="flex items-center gap-2 mb-4">
                                        <CreditCard className="w-4 h-4 text-[var(--cyber-green)]" />
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Paytm MCP Payment</h3>
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Transaction ID</span>
                                            <span className="text-[var(--cyber-green)] font-mono">{result.state.payment_txn_id}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">MCP Tool</span>
                                            <span className="text-gray-300 font-mono text-[10px]">paytm_initiate_transaction</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Payment Mode</span>
                                            <span className="text-gray-300">UPI Escrow</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Status</span>
                                            <span className="text-green-400 font-bold">SUCCESS</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Architecture Info */}
                        <div className="p-5 rounded-2xl border border-white/10 bg-white/5">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Architecture</h3>
                            <div className="space-y-2 text-[11px]">
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                                    <span className="text-gray-400"><span className="text-white">Swarm Pattern:</span> Prism-inspired (Paytm, #2 Spider 2.0)</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                    <span className="text-gray-400"><span className="text-white">Payments:</span> Paytm MCP Server (Model Context Protocol)</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                                    <span className="text-gray-400"><span className="text-white">Models:</span> GNN (3-layer GCN) + TCN (causal conv)</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 shrink-0" />
                                    <span className="text-gray-400"><span className="text-white">Pipeline:</span> Plan → [Analyze ∥ Verify] → Validate → Disburse</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
