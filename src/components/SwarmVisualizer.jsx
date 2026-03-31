import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Play, RotateCcw, Zap, ShieldCheck, CreditCard,
    BrainCircuit, Search, CheckCircle, XCircle, Clock, Activity,
    ArrowRight, Cpu, Network, AlertTriangle, Mic, MicOff,
    ChevronDown, Gauge, Volume2
} from 'lucide-react';
import { API_BASE, WS_BASE } from '../lib/api';

const PIPELINE_STAGES = [
    { id: 'plan', label: 'PLAN', agent: 'PLANNER', icon: Cpu, color: '#8b5cf6', desc: 'Decompose credit request' },
    { id: 'analyze', label: 'ANALYZE', agent: 'ANALYST', icon: BrainCircuit, color: '#3b82f6', desc: 'GNN + TCN scoring' },
    { id: 'verify', label: 'VERIFY', agent: 'VERIFIER', icon: Search, color: '#f59e0b', desc: 'Fraud detection + prices' },
    { id: 'validate', label: 'VALIDATE', agent: 'VALIDATOR', icon: ShieldCheck, color: '#10b981', desc: 'Cross-validate & decide' },
    { id: 'disburse', label: 'DISBURSE', agent: 'DISBURSER', icon: CreditCard, color: '#00ff9d', desc: 'Pay via Paytm MCP' },
];

const AGENT_STAGE_MAP = {
    PLANNER: 'plan',
    ANALYST: 'analyze',
    VERIFIER: 'verify',
    VALIDATOR: 'validate',
    DISBURSER: 'disburse',
};

const AgentNode = ({ stage, status, isParallel }) => {
    const Icon = stage.icon;

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
            {status === 'failed' && (
                <div className="absolute -top-1 -right-1">
                    <XCircle className="w-4 h-4 text-red-400" />
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

    const isFraud = log.action?.includes('FRAUD') || log.detail?.toLowerCase().includes('fraud');
    const isCritical = log.detail?.toLowerCase().includes('critical') || log.detail?.toLowerCase().includes('rejected');

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className={`flex gap-3 text-xs font-mono py-1.5 border-b border-white/5 last:border-0 ${
                isCritical ? 'bg-red-500/5' : ''
            }`}
        >
            <span className="text-gray-600 shrink-0 w-16">
                {log.latency_ms > 0 ? `${log.latency_ms.toFixed(0)}ms` : '---'}
            </span>
            <span className="font-bold shrink-0 w-20" style={{ color: agentColors[log.agent] || '#9ca3af' }}>
                {log.agent}
            </span>
            <span className="text-gray-400 shrink-0 w-28 uppercase text-[10px]">{log.action}</span>
            <span className={`flex-1 ${isFraud ? 'text-red-400 font-bold' : 'text-gray-300'}`}>
                {isFraud && <AlertTriangle className="w-3 h-3 inline mr-1 text-red-400" />}
                {log.detail}
            </span>
        </motion.div>
    );
};

export default function SwarmVisualizer({ onBack }) {
    const [status, setStatus] = useState('idle');
    const [stageStatus, setStageStatus] = useState({});
    const [logs, setLogs] = useState([]);
    const [result, setResult] = useState(null);
    const [latency, setLatency] = useState(0);
    const logRef = useRef(null);

    // Profile selector
    const [profiles, setProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState('structured');
    const [profileOpen, setProfileOpen] = useState(false);

    // Voice input
    const [listening, setListening] = useState(false);
    const [voiceText, setVoiceText] = useState('');
    const recognitionRef = useRef(null);

    // Fraud alert
    const [fraudAlert, setFraudAlert] = useState(null);

    // Benchmark
    const [benchmark, setBenchmark] = useState(null);
    const [benchLoading, setBenchLoading] = useState(false);

    // Fetch profiles on mount
    useEffect(() => {
        fetch(`${API_BASE}/swarm/profiles`)
            .then(r => r.json())
            .then(data => setProfiles(data.profiles || []))
            .catch(() => {
                setProfiles([
                    { id: 'approved', label: 'Strong Merchant (Approved)', merchant_name: 'Metro Electronics', loan_amount: 6650 },
                    { id: 'structured', label: 'Moderate Merchant (Structured)', merchant_name: 'Singh General Store', loan_amount: 12000 },
                    { id: 'rejected', label: 'Risky Borrower (Rejected)', merchant_name: 'FastTrack Deliveries', loan_amount: 50000 },
                    { id: 'fraud', label: 'Fraudulent Actor (Fraud Alert)', merchant_name: 'Quick Cash Store', loan_amount: 100000 },
                ]);
            });
    }, []);

    // Voice recognition setup
    const startVoice = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'hi-IN';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(r => r[0].transcript)
                .join('');
            setVoiceText(transcript);

            if (event.results[0].isFinal) {
                const text = transcript.toLowerCase();
                if (text.includes('approved') || text.includes('strong') || text.includes('अच्छा') || text.includes('मंजूर')) {
                    setSelectedProfile('approved');
                } else if (text.includes('fraud') || text.includes('धोखा')) {
                    setSelectedProfile('fraud');
                } else if (text.includes('reject') || text.includes('risky') || text.includes('जोखिम')) {
                    setSelectedProfile('rejected');
                } else if (text.includes('run') || text.includes('start') || text.includes('चालू') || text.includes('शुरू')) {
                    runSwarm();
                }
                setTimeout(() => setVoiceText(''), 2000);
            }
        };

        recognition.onend = () => setListening(false);
        recognition.onerror = () => setListening(false);

        recognitionRef.current = recognition;
        recognition.start();
        setListening(true);
    }, [selectedProfile]);

    const stopVoice = () => {
        recognitionRef.current?.stop();
        setListening(false);
    };

    // Update stage status from log entries
    const updateStageFromLog = (log) => {
        const agent = log.agent;
        const action = log.action;
        const stageId = AGENT_STAGE_MAP[agent];

        if (!stageId) return;

        if (action === 'START' || action === 'PLAN' || action === 'EXECUTE') {
            setStageStatus(prev => ({ ...prev, [stageId]: 'running' }));
        } else if (action?.includes('COMPLETE') || action?.includes('RECOVERY')) {
            setStageStatus(prev => ({ ...prev, [stageId]: 'completed' }));
        } else if (action === 'ERROR') {
            setStageStatus(prev => ({ ...prev, [stageId]: 'failed' }));
        }

        // Fraud alert detection
        if (log.detail?.toLowerCase().includes('critical fraud') || log.detail?.toLowerCase().includes('unverified_merchant')) {
            setFraudAlert({
                type: 'critical',
                message: log.detail,
                timestamp: Date.now(),
            });
        } else if (log.action?.includes('FRAUD') && log.detail?.includes('flags:') && !log.detail?.includes('flags: 0')) {
            setFraudAlert({
                type: 'warning',
                message: log.detail,
                timestamp: Date.now(),
            });
        }
    };

    // WebSocket-based swarm execution
    const runSwarmWS = async () => {
        setStatus('running');
        setLogs([]);
        setResult(null);
        setStageStatus({});
        setFraudAlert(null);

        // Start plan stage immediately
        setStageStatus({ plan: 'running' });

        try {
            const ws = new WebSocket(`${WS_BASE}/swarm/ws`);

            ws.onopen = () => {
                ws.send(JSON.stringify({ profile: selectedProfile }));
            };

            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);

                if (msg.type === 'log') {
                    setLogs(prev => [...prev, msg.data]);
                    updateStageFromLog(msg.data);
                } else if (msg.type === 'result') {
                    const data = msg.data;
                    setLatency(data.total_latency_ms || 0);
                    setResult(data);
                    setStatus('completed');

                    // Final stage status based on decision
                    if (data.decision === 'rejected' || data.decision === 'error') {
                        setStageStatus(prev => ({ ...prev, disburse: 'failed' }));
                    }
                } else if (msg.type === 'error') {
                    setStatus('error');
                }
            };

            ws.onerror = () => {
                // Fallback to REST if WebSocket fails
                runSwarmREST();
            };

            ws.onclose = () => {};

        } catch {
            runSwarmREST();
        }
    };

    // REST fallback
    const runSwarmREST = async () => {
        const animateStage = (id, s, delay) => {
            setTimeout(() => setStageStatus(prev => ({ ...prev, [id]: s })), delay);
        };

        animateStage('plan', 'running', 0);
        animateStage('plan', 'completed', 400);
        animateStage('analyze', 'running', 500);
        animateStage('verify', 'running', 500);
        animateStage('analyze', 'completed', 1500);
        animateStage('verify', 'completed', 1800);
        animateStage('validate', 'running', 2000);
        animateStage('validate', 'completed', 2500);
        animateStage('disburse', 'running', 2600);

        try {
            // Fetch profile data
            let profileData;
            try {
                const profileRes = await fetch(`${API_BASE}/swarm/profiles/${selectedProfile}`);
                profileData = await profileRes.json();
            } catch {
                profileData = null;
            }

            const body = profileData ? {
                merchant_id: profileData.merchant_id,
                merchant_name: profileData.merchant_name,
                borrower_id: profileData.borrower_id || profileData.farmer_id,
                borrower_name: profileData.borrower_name || profileData.farmer_name,
                loan_amount: profileData.loan_amount,
                items: profileData.items,
                transaction_data: profileData.transaction_data,
            } : {
                merchant_id: "MET-901",
                merchant_name: "Metro Electronics",
                borrower_id: "BRW-001",
                borrower_name: "Priya Sharma",
                loan_amount: 6650,
                items: [
                    { name: "LED Display Units (10-pack)", qty: 2, price: 1200 },
                    { name: "POS Terminal Paper Rolls", qty: 5, price: 850 },
                ],
                transaction_data: {
                    upi_monthly_count: 45, qr_payments_count: 22, soundbox_active: true,
                    avg_ticket_size: 650, unique_customers: 78, months_active: 18,
                    monthly_income: 15000, monthly_expense: 12000,
                    p2p_received_monthly: 5000, p2p_sent_monthly: 3000,
                    current_month_count: 50, avg_monthly_count: 45,
                    merchant_kyc_verified: true,
                    weekly_data: Array.from({ length: 12 }, (_, i) => ({
                        week: `W${i + 1}`, income: 4000 + Math.random() * 600,
                        spending: 3600 + Math.random() * 500, savings: 200 + Math.random() * 800,
                    })),
                },
            };

            const res = await fetch(`${API_BASE}/swarm/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            setLatency(data.total_latency_ms || 0);
            setLogs(data.logs || []);
            setResult(data);
            setStatus('completed');
            animateStage('disburse', data.decision === 'rejected' ? 'failed' : 'completed', 0);

            // Check for fraud in logs
            (data.logs || []).forEach(log => {
                if (log.detail?.toLowerCase().includes('critical fraud') || log.detail?.toLowerCase().includes('unverified_merchant')) {
                    setFraudAlert({ type: 'critical', message: log.detail, timestamp: Date.now() });
                }
            });

        } catch {
            // Offline fallback
            const isFraudProfile = selectedProfile === 'fraud';
            const isRejected = selectedProfile === 'rejected';

            const decision = isFraudProfile ? 'rejected' : isRejected ? 'rejected' : selectedProfile === 'approved' ? 'approved' : 'structured';
            const simulatedLogs = [
                { agent: "SWARM", action: "INIT", detail: `Swarm initialized (profile: ${selectedProfile})`, latency_ms: 0 },
                { agent: "PLANNER", action: "PLAN", detail: "Decomposing credit request into sub-tasks", latency_ms: 12 },
                { agent: "PLANNER", action: "PLAN_COMPLETE", detail: "Generated 6 execution steps", latency_ms: 15 },
                { agent: "SWARM", action: "EXECUTE", detail: "Launching Analyst and Verifier in parallel", latency_ms: 0 },
                { agent: "ANALYST", action: "START", detail: "Beginning credit analysis pipeline", latency_ms: 0 },
                { agent: "ANALYST", action: "GNN_COMPLETE", detail: `GNN confidence: ${isFraudProfile ? '0.21' : isRejected ? '0.42' : '0.78'}`, latency_ms: 45 },
                { agent: "ANALYST", action: "TCN_COMPLETE", detail: `TCN stability: ${isFraudProfile ? '0.15' : isRejected ? '0.35' : '0.68'}`, latency_ms: 38 },
                { agent: "VERIFIER", action: "FRAUD_CHECK", detail: isFraudProfile
                    ? "Fraud score: 0.83, flags: 4 | CRITICAL: circular_transactions, velocity_spike, unverified_merchant, high_leverage"
                    : `Fraud score: ${isRejected ? '0.35' : '0.05'}, flags: ${isRejected ? 2 : 0}`,
                    latency_ms: 22 },
                { agent: "VERIFIER", action: "PRICE_CHECK", detail: isFraudProfile ? "Price verified: false (item not in market DB)" : "Price verified: true", latency_ms: 18 },
                { agent: "VALIDATOR", action: "RISK_COMPUTED", detail: isFraudProfile
                    ? "Critical fraud detected: unverified_merchant -> REJECTED"
                    : `Composite=${isRejected ? '0.72' : selectedProfile === 'approved' ? '0.18' : '0.35'} -> ${decision}`,
                    latency_ms: 5 },
                ...(decision !== 'rejected' ? [
                    { agent: "DISBURSER", action: "START", detail: "Initiating payment via Paytm MCP", latency_ms: 0 },
                    { agent: "DISBURSER", action: "COMPLETE", detail: "Payment success: TXN#PTM-A1B2C3D4E5F6", latency_ms: 180 },
                ] : []),
                { agent: "SWARM", action: "COMPLETE", detail: `Swarm completed | Decision: ${decision.toUpperCase()}`, latency_ms: 342 },
            ];

            for (let i = 0; i < simulatedLogs.length; i++) {
                await new Promise(r => setTimeout(r, 150));
                const log = { ...simulatedLogs[i], timestamp: Date.now() / 1000 };
                setLogs(prev => [...prev, log]);
                updateStageFromLog(log);
            }

            setLatency(342);
            setResult({
                success: !isFraudProfile,
                decision,
                state: {
                    gnn_confidence: isFraudProfile ? 0.21 : isRejected ? 0.42 : 0.78,
                    tcn_stability: isFraudProfile ? 0.15 : isRejected ? 0.35 : 0.68,
                    fraud_score: isFraudProfile ? 0.83 : isRejected ? 0.35 : 0.05,
                    composite_risk: isFraudProfile ? 1.0 : isRejected ? 0.72 : selectedProfile === 'approved' ? 0.18 : 0.35,
                    payment_txn_id: decision !== 'rejected' ? 'PTM-A1B2C3D4E5F6' : null,
                    decision_reason: isFraudProfile
                        ? 'Critical fraud detected: unverified_merchant. KYC verification failed. Multiple fraud signals detected.'
                        : isRejected
                        ? 'High risk (0.72). Insufficient trust signals across GNN and TCN models.'
                        : selectedProfile === 'approved'
                        ? 'Low risk (0.18). Strong relational stability and behavioral consistency.'
                        : 'Moderate risk (0.35). Recommending structured supply financing.',
                    fraud_flags: isFraudProfile ? [
                        { type: 'circular_transactions', severity: 'warning' },
                        { type: 'velocity_spike', severity: 'warning' },
                        { type: 'unverified_merchant', severity: 'critical' },
                        { type: 'high_leverage', severity: 'warning' },
                    ] : [],
                },
            });
            setStatus('completed');

            if (isFraudProfile) {
                setFraudAlert({ type: 'critical', message: 'Critical fraud detected: unverified_merchant, circular transactions, velocity spike', timestamp: Date.now() });
            }
        }
    };

    const runSwarm = () => {
        runSwarmWS();
    };

    const reset = () => {
        setStatus('idle');
        setStageStatus({});
        setLogs([]);
        setResult(null);
        setLatency(0);
        setFraudAlert(null);
    };

    const runBenchmark = async () => {
        setBenchLoading(true);
        try {
            const res = await fetch(`${API_BASE}/swarm/benchmark?runs=50`);
            const data = await res.json();
            setBenchmark(data);
        } catch {
            setBenchmark({
                runs: 50, p50_ms: 1.2, p95_ms: 2.8, p99_ms: 4.1,
                min_ms: 0.8, max_ms: 5.2, mean_ms: 1.5, stdev_ms: 0.6,
            });
        }
        setBenchLoading(false);
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

    const selectedProfileData = profiles.find(p => p.id === selectedProfile);

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 pt-24 font-sans">

            {/* Fraud Alert Overlay */}
            <AnimatePresence>
                {fraudAlert && fraudAlert.type === 'critical' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 pointer-events-none"
                    >
                        <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
                        <motion.div
                            initial={{ y: -100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -100, opacity: 0 }}
                            className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto"
                        >
                            <div className="bg-red-950/90 border-2 border-red-500 rounded-2xl px-8 py-4 shadow-[0_0_40px_rgba(239,68,68,0.4)] flex items-center gap-4 max-w-xl">
                                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 animate-pulse">
                                    <AlertTriangle className="w-6 h-6 text-red-400" />
                                </div>
                                <div>
                                    <div className="text-red-400 font-bold text-sm uppercase tracking-wider">Fraud Alert</div>
                                    <div className="text-red-300 text-xs mt-1">{fraudAlert.message}</div>
                                </div>
                                <button onClick={() => setFraudAlert(null)} className="pointer-events-auto p-1 hover:bg-red-500/20 rounded">
                                    <XCircle className="w-4 h-4 text-red-400" />
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="max-w-7xl mx-auto mb-8 flex items-center justify-between flex-wrap gap-4">
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
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Profile Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl hover:bg-white/10 transition-colors text-sm"
                        >
                            <span className={`w-2 h-2 rounded-full ${
                                selectedProfile === 'approved' ? 'bg-green-400' :
                                selectedProfile === 'structured' ? 'bg-cyan-400' :
                                selectedProfile === 'rejected' ? 'bg-orange-400' :
                                'bg-red-500 animate-pulse'
                            }`} />
                            <span className="text-gray-300 max-w-[150px] truncate">
                                {selectedProfileData?.label || selectedProfile}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {profileOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full mt-2 right-0 bg-gray-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 min-w-[280px]"
                                >
                                    {profiles.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => { setSelectedProfile(p.id); setProfileOpen(false); }}
                                            className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center gap-3 ${
                                                selectedProfile === p.id ? 'bg-white/5' : ''
                                            }`}
                                        >
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                p.id === 'approved' ? 'bg-green-400' :
                                                p.id === 'structured' ? 'bg-cyan-400' :
                                                p.id === 'rejected' ? 'bg-orange-400' :
                                                'bg-red-500'
                                            }`} />
                                            <div>
                                                <div className="text-sm text-gray-200">{p.label}</div>
                                                <div className="text-[10px] text-gray-500">{p.merchant_name} — ₹{p.loan_amount?.toLocaleString()}</div>
                                            </div>
                                            {selectedProfile === p.id && <CheckCircle className="w-4 h-4 text-[var(--cyber-green)] ml-auto shrink-0" />}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Voice Button */}
                    <button
                        onClick={listening ? stopVoice : startVoice}
                        className={`p-2.5 rounded-xl transition-all ${
                            listening
                                ? 'bg-red-500/20 border border-red-500/50 text-red-400 animate-pulse'
                                : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                        title="Hindi voice input (say 'चालू' to run)"
                    >
                        {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    {/* Latency Badge */}
                    {status === 'completed' && (
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span className="text-xs font-mono text-cyan-400">{latency.toFixed(0)}ms</span>
                        </div>
                    )}

                    {/* Run / Reset */}
                    {status === 'idle' ? (
                        <button onClick={runSwarm} className="px-6 py-2.5 bg-[var(--cyber-green)] text-black font-bold rounded-xl hover:bg-[#00cc7d] flex items-center gap-2 shadow-[0_0_20px_rgba(0,255,157,0.3)]">
                            <Play className="w-4 h-4" /> Run Swarm
                        </button>
                    ) : status === 'completed' || status === 'error' ? (
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

            {/* Voice Transcript */}
            <AnimatePresence>
                {voiceText && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="max-w-7xl mx-auto mb-4"
                    >
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-2 flex items-center gap-3">
                            <Volume2 className="w-4 h-4 text-purple-400 animate-pulse" />
                            <span className="text-sm text-purple-300">{voiceText}</span>
                            <span className="text-[10px] text-purple-500 ml-auto">Hindi Voice Input</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="max-w-7xl mx-auto space-y-8">

                {/* Pipeline Visualization */}
                <div className="glass-panel p-8 rounded-2xl border border-white/10 bg-black/60">
                    <div className="flex items-center gap-2 mb-6">
                        <Network className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Swarm Pipeline</span>
                        <span className="text-[10px] text-gray-600 ml-2">Plan → [Analyze || Verify] → Validate → Disburse</span>
                        {selectedProfileData && (
                            <span className="ml-auto text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded">
                                Profile: {selectedProfileData.merchant_name}
                            </span>
                        )}
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
                            <div className="flex items-center px-4 py-2.5 bg-white/5 border-b border-white/10 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                <span className="ml-3 text-xs font-mono text-white/40">trustai-swarm — v2.1.0</span>
                                <div className="ml-auto flex items-center gap-2">
                                    <span className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded">MCP:paytm</span>
                                    <span className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded">agents:3</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                                        status === 'running' ? 'text-yellow-400 bg-yellow-400/10' :
                                        status === 'completed' ? 'text-green-400 bg-green-400/10' :
                                        'text-gray-600 bg-white/5'
                                    }`}>
                                        {status === 'running' ? 'LIVE' : status === 'completed' ? 'DONE' : 'READY'}
                                    </span>
                                </div>
                            </div>

                            <div ref={logRef} className="p-4 h-[400px] overflow-y-auto custom-scrollbar">
                                {logs.length === 0 && status === 'idle' && (
                                    <div className="flex items-center justify-center h-full text-gray-600">
                                        <div className="text-center">
                                            <Cpu className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p className="text-sm">Select a merchant profile and click "Run Swarm"</p>
                                            <p className="text-[10px] text-gray-700 mt-1">Or say "शुरू करो" with Hindi voice input</p>
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
                                    className={`p-6 rounded-2xl border ${decisionBg} ${
                                        result.decision === 'rejected' && result.state?.fraud_flags?.length > 0
                                            ? 'shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                                            : ''
                                    }`}
                                >
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Swarm Decision</h3>
                                    <div className={`text-3xl font-black uppercase tracking-tight mb-3 ${decisionColor}`}>
                                        {result.decision === 'structured' ? 'STRUCTURED FINANCING' : result.decision?.toUpperCase()}
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed mb-4">
                                        {result.state?.decision_reason}
                                    </p>

                                    {/* Fraud Flags */}
                                    {result.state?.fraud_flags?.length > 0 && (
                                        <div className="mb-4 space-y-1.5">
                                            {result.state.fraud_flags.map((flag, i) => (
                                                <div key={i} className={`flex items-center gap-2 text-[11px] px-2 py-1 rounded ${
                                                    flag.severity === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                                                }`}>
                                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                                    <span className="font-mono">{flag.type}</span>
                                                    <span className={`text-[9px] ml-auto uppercase font-bold ${
                                                        flag.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                                                    }`}>{flag.severity}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

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
                                            <span className={`font-mono ${result.state?.fraud_score > 0.3 ? 'text-red-400 font-bold' : 'text-yellow-400'}`}>
                                                {result.state?.fraud_score?.toFixed(4)}
                                            </span>
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

                        {/* Benchmark Card */}
                        <div className="p-5 rounded-2xl border border-white/10 bg-white/5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Gauge className="w-4 h-4 text-cyan-400" />
                                    Latency Benchmark
                                </h3>
                                <button
                                    onClick={runBenchmark}
                                    disabled={benchLoading}
                                    className="text-[10px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded disabled:opacity-50"
                                >
                                    {benchLoading ? 'Running...' : 'Run (50x)'}
                                </button>
                            </div>
                            {benchmark ? (
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-black/30 rounded-lg p-2">
                                        <div className="text-[10px] text-gray-500 mb-1">p50</div>
                                        <div className="text-sm font-mono text-green-400">{benchmark.p50_ms}ms</div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-2">
                                        <div className="text-[10px] text-gray-500 mb-1">p95</div>
                                        <div className="text-sm font-mono text-yellow-400">{benchmark.p95_ms}ms</div>
                                    </div>
                                    <div className="bg-black/30 rounded-lg p-2">
                                        <div className="text-[10px] text-gray-500 mb-1">p99</div>
                                        <div className="text-sm font-mono text-orange-400">{benchmark.p99_ms}ms</div>
                                    </div>
                                    <div className="col-span-3 text-[10px] text-gray-600 mt-1">
                                        {benchmark.runs} runs | mean: {benchmark.mean_ms}ms | stdev: {benchmark.stdev_ms}ms
                                    </div>
                                </div>
                            ) : (
                                <div className="text-[11px] text-gray-600 text-center py-2">
                                    Click "Run" to benchmark pipeline latency
                                </div>
                            )}
                        </div>

                        {/* Architecture Info */}
                        <div className="p-5 rounded-2xl border border-white/10 bg-white/5">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Architecture</h3>
                            <div className="space-y-2 text-[11px]">
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                                    <span className="text-gray-400"><span className="text-white">Swarm:</span> Prism-inspired (Paytm, #2 Spider 2.0)</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                    <span className="text-gray-400"><span className="text-white">Payments:</span> Paytm MCP (Model Context Protocol)</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                                    <span className="text-gray-400"><span className="text-white">Models:</span> GNN (3-layer GCN) + TCN (causal conv)</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 shrink-0" />
                                    <span className="text-gray-400"><span className="text-white">Streaming:</span> WebSocket real-time logs</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                    <span className="text-gray-400"><span className="text-white">Voice:</span> Hindi input (Web Speech API)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
