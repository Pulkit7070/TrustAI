import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, CheckCircle, Clock, CreditCard, Store, Landmark,
    User, Package, ArrowRight, TrendingUp, ShieldCheck, AlertTriangle,
    CircleDollarSign, CalendarCheck, Receipt, Zap, Activity, Timer,
    ChevronRight, ExternalLink, RefreshCw
} from 'lucide-react';
import { API_BASE } from '../lib/api';

/* ─────────────────────── constants ─────────────────────── */

const STAGE_DELAY_MS = 1500;

const LIFECYCLE_STAGES = [
    {
        id: 'application',
        label: 'Application Submitted',
        desc: 'Loan request received and queued for AI analysis',
        icon: Receipt,
        color: '#8b5cf6',
    },
    {
        id: 'ai_analysis',
        label: 'AI Swarm Analysis',
        desc: 'Multi-agent GNN + TCN + Fraud scoring pipeline',
        icon: Zap,
        color: '#3b82f6',
        scores: { gnn: 0.8742, tcn: 0.9103, fraud: 0.0214 },
    },
    {
        id: 'restructured',
        label: 'Restructured to Supply Financing',
        desc: 'Loan converted from direct cash to purpose-bound merchant payment',
        icon: RefreshCw,
        color: '#f59e0b',
    },
    {
        id: 'payment_sent',
        label: 'Payment Sent to Merchant via MCP',
        desc: 'Paytm MCP disbursement executed',
        icon: CreditCard,
        color: '#00ff9d',
        txnId: 'TXN-PTM-2026-0402-7A3F',
        amount: 42000,
    },
    {
        id: 'goods_delivered',
        label: 'Goods Delivered to Borrower',
        desc: 'Merchant confirmed delivery of goods/services',
        icon: Package,
        color: '#06b6d4',
    },
    {
        id: 'repayment_active',
        label: 'Repayment Schedule Active',
        desc: '6 monthly installments of INR 7,583',
        icon: CalendarCheck,
        color: '#10b981',
    },
    {
        id: 'completed',
        label: 'Loan Completed',
        desc: 'All installments paid — loan closed successfully',
        icon: CheckCircle,
        color: '#22d3ee',
    },
];

const MCP_TRANSACTIONS = [
    { id: 'TXN-PTM-2026-0402-7A3F', method: 'paytm_initiate_transaction', amount: 42000, status: 'success', ts: '2026-04-02 10:34:12' },
    { id: 'TXN-PTM-2026-0402-9B1C', method: 'paytm_check_status', amount: null, status: 'success', ts: '2026-04-02 10:34:15' },
    { id: 'TXN-PTM-2026-0502-3D8E', method: 'paytm_initiate_transaction', amount: 7583, status: 'success', ts: '2026-05-02 09:00:01' },
    { id: 'TXN-PTM-2026-0602-1F4A', method: 'paytm_initiate_transaction', amount: 7583, status: 'success', ts: '2026-06-02 09:00:01' },
    { id: 'TXN-PTM-2026-0702-8C2B', method: 'paytm_initiate_transaction', amount: 7583, status: 'success', ts: '2026-07-02 09:00:01' },
];

const LOAN_DETAILS = {
    borrower: 'Ramesh Kumar',
    merchant: 'Sharma Electronics',
    amount: 42000,
    items: ['Samsung Galaxy A54', 'Protective Case', 'Screen Guard'],
    tenure: '6 months',
    emi: 7583,
    interestRate: '8.4%',
    installmentsPaid: 3,
    totalInstallments: 6,
    nextPayment: '2026-08-02',
    disbursedOn: '2026-04-02',
};

const BOTTOM_STATS = [
    { label: 'Loans Restructured', value: '1,247', icon: RefreshCw, color: '#f59e0b' },
    { label: 'Success Rate', value: '94.3%', icon: TrendingUp, color: '#10b981' },
    { label: 'Avg Repayment Time', value: '5.2 mo', icon: Timer, color: '#3b82f6' },
    { label: 'Default Rate', value: '2.1%', icon: AlertTriangle, color: '#ef4444' },
];

/* ─────────────────── CSS keyframe injection ────────────── */

const KEYFRAMES_CSS = `
@keyframes dashFlow {
    to { stroke-dashoffset: -40; }
}
@keyframes dashFlowReverse {
    to { stroke-dashoffset: 40; }
}
@keyframes particlePulse {
    0%, 100% { r: 3; opacity: 0.9; }
    50% { r: 5; opacity: 1; }
}
@keyframes glowPulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
}
@keyframes nodeRing {
    0% { stroke-dashoffset: 220; }
    100% { stroke-dashoffset: 0; }
}
`;

/* ─────────────── Triangle SVG Visualization ────────────── */

const TriangleVisualization = ({ activeStageIdx }) => {
    const w = 520, h = 400;
    // Triangle node positions (top, bottom-left, bottom-right)
    const nodes = useMemo(() => [
        { x: 260, y: 60,  label: 'Borrower', icon: 'B', color: '#8b5cf6', sub: 'Repays EMI' },
        { x: 80,  y: 340, label: 'Merchant', icon: 'M', color: '#f59e0b', sub: 'Delivers Goods' },
        { x: 440, y: 340, label: 'Bank / NBFC', icon: '$', color: '#10b981', sub: 'Disburses Funds' },
    ], []);

    // Edges: [from, to, label, color, flowId]
    const edges = useMemo(() => [
        { from: nodes[2], to: nodes[1], label: 'Payment via MCP', color: '#10b981', id: 'bank-merchant' },
        { from: nodes[1], to: nodes[0], label: 'Goods / Services', color: '#f59e0b', id: 'merchant-borrower' },
        { from: nodes[0], to: nodes[2], label: 'EMI Repayment', color: '#8b5cf6', id: 'borrower-bank' },
    ], [nodes]);

    const edgeActive = useCallback((edgeId) => {
        if (edgeId === 'bank-merchant') return activeStageIdx >= 3;
        if (edgeId === 'merchant-borrower') return activeStageIdx >= 4;
        if (edgeId === 'borrower-bank') return activeStageIdx >= 5;
        return false;
    }, [activeStageIdx]);

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" style={{ maxHeight: 380 }}>
            <defs>
                {/* Glow filters */}
                <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="glow-purple" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="nodeShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="8" floodOpacity="0.5" />
                </filter>

                {/* Gradients for edges */}
                <linearGradient id="grad-bank-merchant" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <linearGradient id="grad-merchant-borrower" x1="0%" y1="100%" x2="50%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="grad-borrower-bank" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#10b981" />
                </linearGradient>

                {/* Arrowhead markers */}
                {edges.map((e) => (
                    <marker key={`arrow-${e.id}`} id={`arrow-${e.id}`} viewBox="0 0 10 10"
                        refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill={e.color} opacity={edgeActive(e.id) ? 1 : 0.25} />
                    </marker>
                ))}
            </defs>

            {/* Background radial glow */}
            <circle cx={w / 2} cy={h / 2 + 20} r="160" fill="none" stroke="rgba(139,92,246,0.06)" strokeWidth="80"
                style={{ animation: 'glowPulse 4s ease-in-out infinite' }} />

            {/* Edges */}
            {edges.map((e) => {
                const active = edgeActive(e.id);
                const midX = (e.from.x + e.to.x) / 2;
                const midY = (e.from.y + e.to.y) / 2;
                // offset midpoint toward center for curved path
                const cx = midX + (w / 2 - midX) * 0.35;
                const cy = midY + ((h / 2 + 20) - midY) * 0.35;
                const pathD = `M ${e.from.x} ${e.from.y} Q ${cx} ${cy} ${e.to.x} ${e.to.y}`;
                return (
                    <g key={e.id}>
                        {/* Base path (dim) */}
                        <path d={pathD} fill="none" stroke={e.color} strokeWidth="2" strokeOpacity={0.12} />
                        {/* Animated flow path */}
                        <path d={pathD} fill="none"
                            stroke={`url(#grad-${e.id})`}
                            strokeWidth={active ? 2.5 : 1.5}
                            strokeOpacity={active ? 0.9 : 0.2}
                            strokeDasharray="8 12"
                            markerEnd={`url(#arrow-${e.id})`}
                            style={{
                                animation: active ? 'dashFlow 1.2s linear infinite' : 'none',
                            }}
                        />
                        {/* Animated particle on active edge */}
                        {active && (
                            <>
                                <circle r="4" fill={e.color} filter={`url(#glow-${e.id.includes('green') ? 'green' : 'purple'})`}
                                    style={{ animation: 'particlePulse 1.5s ease-in-out infinite' }}>
                                    <animateMotion dur="2s" repeatCount="indefinite" path={pathD} />
                                </circle>
                                <circle r="2.5" fill="white" opacity="0.9">
                                    <animateMotion dur="2s" repeatCount="indefinite" path={pathD} />
                                </circle>
                            </>
                        )}
                        {/* Edge label */}
                        <text x={cx} y={cy - 10} textAnchor="middle" fill={active ? e.color : 'rgba(255,255,255,0.25)'}
                            fontSize="10" fontWeight="600" className="select-none">
                            {e.label}
                        </text>
                    </g>
                );
            })}

            {/* Nodes */}
            {nodes.map((node, i) => {
                const isActive = (i === 0 && activeStageIdx >= 0) ||
                    (i === 1 && activeStageIdx >= 3) ||
                    (i === 2 && activeStageIdx >= 3);
                return (
                    <g key={node.label}>
                        {/* Outer glow ring */}
                        {isActive && (
                            <circle cx={node.x} cy={node.y} r="38" fill="none"
                                stroke={node.color} strokeWidth="2" strokeOpacity="0.3"
                                strokeDasharray="220" style={{ animation: 'nodeRing 2s ease-out forwards' }} />
                        )}
                        {/* Ambient glow */}
                        <circle cx={node.x} cy={node.y} r="32" fill={node.color}
                            opacity={isActive ? 0.15 : 0.05} />
                        {/* Main circle */}
                        <circle cx={node.x} cy={node.y} r="28"
                            fill={isActive ? `${node.color}22` : 'rgba(0,0,0,0.6)'}
                            stroke={node.color}
                            strokeWidth={isActive ? 2.5 : 1}
                            strokeOpacity={isActive ? 1 : 0.3}
                            filter="url(#nodeShadow)" />
                        {/* Icon letter */}
                        <text x={node.x} y={node.y + 1} textAnchor="middle" dominantBaseline="central"
                            fill={isActive ? node.color : 'rgba(255,255,255,0.4)'}
                            fontSize="18" fontWeight="700" className="select-none">
                            {node.icon}
                        </text>
                        {/* Label */}
                        <text x={node.x} y={node.y + (i === 0 ? -42 : 52)} textAnchor="middle"
                            fill={isActive ? 'white' : 'rgba(255,255,255,0.35)'}
                            fontSize="13" fontWeight="700" className="select-none">
                            {node.label}
                        </text>
                        {/* Sub-label */}
                        <text x={node.x} y={node.y + (i === 0 ? -28 : 66)} textAnchor="middle"
                            fill={isActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}
                            fontSize="9" className="select-none">
                            {node.sub}
                        </text>
                    </g>
                );
            })}

            {/* Center label */}
            <text x={w / 2} y={h / 2 + 15} textAnchor="middle" fill="rgba(255,255,255,0.12)"
                fontSize="11" fontWeight="700" letterSpacing="3" className="select-none uppercase">
                Triangular Loop
            </text>
        </svg>
    );
};

/* ────────────────── Timeline Stage Item ────────────────── */

const TimelineStage = ({ stage, index, isActive, isCompleted, isLast }) => {
    const Icon = stage.icon;

    return (
        <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4 }}
            className="flex gap-4 relative"
        >
            {/* Vertical line */}
            {!isLast && (
                <div className="absolute left-[19px] top-[44px] w-[2px] bottom-0"
                    style={{
                        background: isCompleted
                            ? `linear-gradient(to bottom, ${stage.color}, ${LIFECYCLE_STAGES[index + 1]?.color || stage.color})`
                            : 'rgba(255,255,255,0.06)',
                    }}
                />
            )}

            {/* Icon circle */}
            <div className="relative z-10 flex-shrink-0">
                <motion.div
                    animate={isActive ? {
                        boxShadow: [
                            `0 0 0px ${stage.color}40`,
                            `0 0 20px ${stage.color}60`,
                            `0 0 0px ${stage.color}40`,
                        ],
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500"
                    style={{
                        borderColor: isCompleted || isActive ? stage.color : 'rgba(255,255,255,0.1)',
                        background: isCompleted ? `${stage.color}20` : isActive ? `${stage.color}10` : 'rgba(0,0,0,0.4)',
                    }}
                >
                    {isCompleted ? (
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                        >
                            <CheckCircle className="w-5 h-5" style={{ color: stage.color }} />
                        </motion.div>
                    ) : isActive ? (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        >
                            <Icon className="w-5 h-5" style={{ color: stage.color }} />
                        </motion.div>
                    ) : (
                        <Icon className="w-5 h-5 text-gray-600" />
                    )}
                </motion.div>
            </div>

            {/* Content */}
            <div className={`pb-8 transition-all duration-500 ${isCompleted || isActive ? 'opacity-100' : 'opacity-40'}`}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold" style={{ color: isCompleted || isActive ? stage.color : '#6b7280' }}>
                        {stage.label}
                    </span>
                    {isActive && (
                        <motion.span
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                            style={{ borderColor: `${stage.color}40`, color: stage.color, background: `${stage.color}10` }}
                        >
                            PROCESSING
                        </motion.span>
                    )}
                </div>
                <p className="text-xs text-gray-500 mb-2">{stage.desc}</p>

                {/* Extra data for specific stages */}
                <AnimatePresence>
                    {isCompleted && stage.scores && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="flex gap-3 flex-wrap"
                        >
                            {Object.entries(stage.scores).map(([key, val]) => (
                                <span key={key} className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 border border-white/5">
                                    <span className="text-gray-500 uppercase">{key}:</span>{' '}
                                    <span className={val > 0.5 ? 'text-green-400' : 'text-red-400'}>
                                        {key === 'fraud' ? val.toFixed(4) : val.toFixed(4)}
                                    </span>
                                </span>
                            ))}
                        </motion.div>
                    )}
                    {isCompleted && stage.txnId && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="flex gap-3 flex-wrap"
                        >
                            <span className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                TXN: {stage.txnId}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                INR {stage.amount?.toLocaleString()}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

/* ──────────────── Repayment Progress Bar ───────────────── */

const RepaymentProgress = ({ paid, total }) => {
    const pct = (paid / total) * 100;
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs">
                <span className="text-gray-400">Repayment Progress</span>
                <span className="text-white font-bold">{paid}/{total} installments</span>
            </div>
            <div className="h-3 rounded-full bg-white/5 overflow-hidden relative">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
                    className="h-full rounded-full relative"
                    style={{
                        background: 'linear-gradient(90deg, #8b5cf6, #10b981, #00ff9d)',
                    }}
                >
                    <div className="absolute inset-0 rounded-full"
                        style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                            animation: 'shimmer 2s ease-in-out infinite',
                        }}
                    />
                </motion.div>
                {/* Segment markers */}
                {Array.from({ length: total - 1 }, (_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 w-px bg-black/40"
                        style={{ left: `${((i + 1) / total) * 100}%` }} />
                ))}
            </div>
            <div className="flex justify-between">
                {Array.from({ length: total }, (_, i) => (
                    <div key={i} className={`text-[9px] font-mono ${i < paid ? 'text-green-400' : 'text-gray-600'}`}>
                        #{i + 1}
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ───────────────────── Main Component ──────────────────── */

export default function RepaymentTracker({ onBack }) {
    const [activeStageIdx, setActiveStageIdx] = useState(-1);
    const [simulationDone, setSimulationDone] = useState(false);

    // Simulate lifecycle progression on mount
    useEffect(() => {
        let timeout;
        const advanceStage = (idx) => {
            if (idx >= LIFECYCLE_STAGES.length) {
                setSimulationDone(true);
                return;
            }
            timeout = setTimeout(() => {
                setActiveStageIdx(idx);
                advanceStage(idx + 1);
            }, STAGE_DELAY_MS);
        };

        // Start after a short initial delay
        timeout = setTimeout(() => advanceStage(0), 600);

        return () => clearTimeout(timeout);
    }, []);

    const completedStages = activeStageIdx;

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            {/* Inject keyframes */}
            <style>{KEYFRAMES_CSS}{`
                @keyframes shimmer {
                    0%, 100% { transform: translateX(-100%); }
                    50% { transform: translateX(200%); }
                }
            `}</style>

            {/* Ambient background effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)' }} />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)' }} />
                <div className="absolute top-[40%] right-[20%] w-[400px] h-[400px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 70%)' }} />
            </div>

            {/* Header */}
            <div className="relative z-10 border-b border-white/5 bg-black/60 backdrop-blur-xl">
                <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack}
                            className="p-2 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all">
                            <ArrowLeft className="w-4 h-4 text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold flex items-center gap-2">
                                <Activity className="w-5 h-5 text-violet-400" />
                                Triangular Financing Loop
                            </h1>
                            <p className="text-xs text-gray-500">Live repayment lifecycle tracker — TrustAI core innovation</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {simulationDone ? (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 flex items-center gap-1.5"
                            >
                                <CheckCircle className="w-3.5 h-3.5" /> CYCLE COMPLETE
                            </motion.span>
                        ) : (
                            <motion.span
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="text-xs font-bold px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 flex items-center gap-1.5"
                            >
                                <Zap className="w-3.5 h-3.5" /> LIVE SIMULATION
                            </motion.span>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-[1600px] mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* ─── Left Column: Triangle + Timeline ─── */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Triangle Visualization */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl p-6 relative overflow-hidden"
                        >
                            {/* Corner accent */}
                            <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
                                style={{ background: 'radial-gradient(circle at top right, rgba(139,92,246,0.1) 0%, transparent 70%)' }} />

                            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <CircleDollarSign className="w-4 h-4 text-violet-400" />
                                Triangular Flow Visualization
                            </h2>

                            <div className="flex justify-center">
                                <TriangleVisualization activeStageIdx={activeStageIdx} />
                            </div>

                            {/* Flow legend */}
                            <div className="flex justify-center gap-6 mt-4 flex-wrap">
                                {[
                                    { color: '#10b981', label: 'Bank → Merchant (Disbursement)' },
                                    { color: '#f59e0b', label: 'Merchant → Borrower (Goods)' },
                                    { color: '#8b5cf6', label: 'Borrower → Bank (Repayment)' },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-center gap-2 text-[10px] text-gray-400">
                                        <div className="w-3 h-1 rounded-full" style={{ background: item.color }} />
                                        {item.label}
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Lifecycle Timeline */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl p-6"
                        >
                            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-400" />
                                Loan Lifecycle Timeline
                            </h2>

                            <div className="space-y-0">
                                {LIFECYCLE_STAGES.map((stage, i) => (
                                    <TimelineStage
                                        key={stage.id}
                                        stage={stage}
                                        index={i}
                                        isActive={i === activeStageIdx}
                                        isCompleted={i < activeStageIdx || (simulationDone && i === LIFECYCLE_STAGES.length - 1)}
                                        isLast={i === LIFECYCLE_STAGES.length - 1}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* ─── Right Column: Details Panel ─── */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Loan Details Card */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl p-6"
                        >
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-amber-400" />
                                Loan Details
                            </h3>

                            <div className="space-y-4">
                                {/* Amount */}
                                <div className="text-center py-4 rounded-xl border border-white/5 bg-gradient-to-b from-violet-500/5 to-transparent">
                                    <div className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">
                                        INR {LOAN_DETAILS.amount.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">Supply Financing Amount</div>
                                </div>

                                {/* Info rows */}
                                {[
                                    { icon: User, label: 'Borrower', value: LOAN_DETAILS.borrower, color: '#8b5cf6' },
                                    { icon: Store, label: 'Merchant', value: LOAN_DETAILS.merchant, color: '#f59e0b' },
                                    { icon: Landmark, label: 'Tenure', value: LOAN_DETAILS.tenure, color: '#3b82f6' },
                                    { icon: CreditCard, label: 'EMI', value: `INR ${LOAN_DETAILS.emi.toLocaleString()}`, color: '#10b981' },
                                    { icon: TrendingUp, label: 'Interest Rate', value: LOAN_DETAILS.interestRate, color: '#06b6d4' },
                                    { icon: CalendarCheck, label: 'Disbursed On', value: LOAN_DETAILS.disbursedOn, color: '#00ff9d' },
                                ].map((row) => (
                                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <row.icon className="w-3.5 h-3.5" style={{ color: row.color }} />
                                            {row.label}
                                        </div>
                                        <div className="text-sm font-medium text-white">{row.value}</div>
                                    </div>
                                ))}

                                {/* Items */}
                                <div>
                                    <div className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                                        <Package className="w-3.5 h-3.5 text-cyan-400" /> Items Financed
                                    </div>
                                    <div className="space-y-1.5">
                                        {LOAN_DETAILS.items.map((item) => (
                                            <div key={item} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-300 flex items-center gap-2">
                                                <ChevronRight className="w-3 h-3 text-gray-600" />
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Repayment Progress */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl p-6"
                        >
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-green-400" />
                                Repayment Status
                            </h3>

                            <RepaymentProgress paid={LOAN_DETAILS.installmentsPaid} total={LOAN_DETAILS.totalInstallments} />

                            <div className="mt-5 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                                <div className="flex items-center gap-2 text-xs text-amber-400 font-bold mb-1">
                                    <CalendarCheck className="w-3.5 h-3.5" />
                                    Next Payment Due
                                </div>
                                <div className="text-lg font-bold text-white">{LOAN_DETAILS.nextPayment}</div>
                                <div className="text-xs text-gray-500">INR {LOAN_DETAILS.emi.toLocaleString()} via auto-debit</div>
                            </div>
                        </motion.div>

                        {/* MCP Transaction History */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl p-6"
                        >
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-emerald-400" />
                                MCP Transaction History
                            </h3>

                            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                                {MCP_TRANSACTIONS.map((txn, i) => (
                                    <motion.div
                                        key={txn.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6 + i * 0.1 }}
                                        className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group"
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                {txn.method}
                                            </span>
                                            <span className="text-[10px] font-mono text-green-400 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                {txn.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-mono text-gray-500 group-hover:text-gray-400 transition-colors flex items-center gap-1">
                                                <ExternalLink className="w-2.5 h-2.5" />
                                                {txn.id}
                                            </span>
                                            {txn.amount && (
                                                <span className="text-xs font-bold text-white">
                                                    INR {txn.amount.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[9px] text-gray-600 mt-1 font-mono">{txn.ts}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* ─── Bottom Stats ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                    {BOTTOM_STATS.map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 + i * 0.1 }}
                                className="rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl p-5 relative overflow-hidden group hover:border-white/10 transition-all"
                            >
                                {/* Accent glow */}
                                <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ background: `radial-gradient(circle at top right, ${stat.color}15 0%, transparent 70%)` }} />

                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                        style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}25` }}>
                                        <Icon className="w-4 h-4" style={{ color: stat.color }} />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{stat.label}</span>
                                </div>
                                <div className="text-2xl font-bold text-white">{stat.value}</div>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Bottom attribution */}
                <div className="mt-8 text-center pb-8">
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest">
                        TrustAI Triangular Financing Loop — Purpose-Bound Supply Financing
                    </p>
                </div>
            </div>
        </div>
    );
}
