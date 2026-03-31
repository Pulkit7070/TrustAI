import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
    ArrowLeft, ArrowRight, XCircle, CheckCircle, TrendingUp, TrendingDown,
    Shield, ShieldOff, Clock, Zap, Users, Store, Ban, CircleDollarSign,
    AlertTriangle, Lock, RotateCcw, Play, ChevronRight, Sparkles
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';

// ──────────────────────────────────────────────
// Animated Counter Hook
// ──────────────────────────────────────────────
function useAnimatedCounter(target, duration = 2000, inView = true) {
    const [value, setValue] = useState(0);
    const startedRef = useRef(false);

    useEffect(() => {
        if (!inView) return;
        if (startedRef.current) return;
        startedRef.current = true;

        const startTime = performance.now();
        const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [target, duration, inView]);

    return value;
}

// ──────────────────────────────────────────────
// Counter Cell
// ──────────────────────────────────────────────
function CounterCell({ value, suffix = '', prefix = '', color = 'text-white', inView }) {
    const numericValue = typeof value === 'number' ? value : parseInt(value) || 0;
    const animated = useAnimatedCounter(numericValue, 2200, inView);
    return (
        <span className={`font-bold text-lg tabular-nums ${color}`}>
            {prefix}{animated}{suffix}
        </span>
    );
}

// ──────────────────────────────────────────────
// Flow Node
// ──────────────────────────────────────────────
function FlowNode({ label, icon: Icon, color, delay = 0, failed = false }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, type: 'spring', stiffness: 200, damping: 15 }}
            className={`relative flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border-2 min-w-[80px] sm:min-w-[100px] ${
                failed
                    ? 'border-red-500/60 bg-red-500/10'
                    : 'border-white/10 bg-white/5'
            }`}
            style={!failed ? { borderColor: `${color}40`, backgroundColor: `${color}10` } : {}}
        >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: failed ? '#ef4444' : color }} />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-center" style={{ color: failed ? '#ef4444' : color }}>
                {label}
            </span>
            {failed && (
                <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: delay + 0.5, type: 'spring' }}
                    className="absolute -top-2 -right-2"
                >
                    <XCircle className="w-5 h-5 text-red-500" />
                </motion.div>
            )}
        </motion.div>
    );
}

// ──────────────────────────────────────────────
// Animated Arrow
// ──────────────────────────────────────────────
function FlowArrow({ color = '#6b7280', delay = 0, blocked = false }) {
    return (
        <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay, duration: 0.4 }}
            className="flex items-center mx-1"
        >
            {blocked ? (
                <Ban className="w-5 h-5 text-red-500" />
            ) : (
                <div className="relative">
                    <ChevronRight className="w-5 h-5" style={{ color }} />
                    <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ boxShadow: `0 0 8px ${color}` }}
                        animate={{ opacity: [0.3, 0.8, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay }}
                    />
                </div>
            )}
        </motion.div>
    );
}

// ──────────────────────────────────────────────
// Loop Indicator (triangular model)
// ──────────────────────────────────────────────
function LoopIndicator({ delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay }}
            className="flex items-center justify-center mt-3"
        >
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                className="text-emerald-400"
            >
                <RotateCcw className="w-5 h-5" />
            </motion.div>
            <span className="text-[10px] text-emerald-400 ml-2 font-bold uppercase tracking-wider">Continuous Loop</span>
        </motion.div>
    );
}

// ──────────────────────────────────────────────
// Stat Pill
// ──────────────────────────────────────────────
function StatPill({ label, value, bad = false, delay = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: bad ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
            className={`flex justify-between items-center px-4 py-2.5 rounded-xl border text-sm ${
                bad
                    ? 'border-red-500/20 bg-red-500/5'
                    : 'border-emerald-500/20 bg-emerald-500/5'
            }`}
        >
            <span className="text-gray-400 text-xs">{label}</span>
            <span className={`font-bold text-sm ${bad ? 'text-red-400' : 'text-emerald-400'}`}>{value}</span>
        </motion.div>
    );
}

// ──────────────────────────────────────────────
// Rejected / Restructured Stamp
// ──────────────────────────────────────────────
function Stamp({ text, color, bgColor, borderColor, delay = 1.2 }) {
    return (
        <motion.div
            initial={{ scale: 3, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: -12 }}
            transition={{ delay, type: 'spring', stiffness: 300, damping: 20 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
        >
            <div
                className="px-6 py-2 rounded-lg border-4 font-black text-2xl sm:text-3xl uppercase tracking-[0.2em]"
                style={{ color, borderColor, backgroundColor: bgColor }}
            >
                {text}
            </div>
        </motion.div>
    );
}

// ──────────────────────────────────────────────
// Money Flow Particles
// ──────────────────────────────────────────────
function MoneyParticles({ color, count = 6, active = true }) {
    if (!active) return null;
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            {Array.from({ length: count }).map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                    initial={{
                        x: `${10 + Math.random() * 80}%`,
                        y: '100%',
                        opacity: 0
                    }}
                    animate={{
                        y: [null, `${10 + Math.random() * 40}%`, '0%'],
                        opacity: [0, 0.8, 0],
                    }}
                    transition={{
                        duration: 2 + Math.random() * 2,
                        repeat: Infinity,
                        delay: i * 0.4,
                        ease: 'easeOut',
                    }}
                />
            ))}
        </div>
    );
}

// ──────────────────────────────────────────────
// Data Constants
// ──────────────────────────────────────────────
const METRICS = [
    { label: 'Approval Rate', traditional: 30, trustai: 85, suffix: '%', tradIcon: TrendingDown, trustIcon: TrendingUp },
    { label: 'Default Rate', traditional: 12, trustai: 2, suffix: '%', tradIcon: AlertTriangle, trustIcon: Shield, invertColor: true },
    { label: 'Merchant Revenue Impact', traditional: 0, trustai: 40, suffix: '%', prefix: '+', tradIcon: Store, trustIcon: Store },
    { label: 'Time to Decision', traditionalText: '3-5 days', trustaiText: '<200ms', tradIcon: Clock, trustIcon: Zap },
    { label: 'Cash Misuse Risk', traditionalText: 'High', trustaiText: 'Zero (escrow)', tradIcon: ShieldOff, trustIcon: Lock },
    { label: 'Borrower Satisfaction', traditionalText: 'Low', trustaiText: 'High', tradIcon: Users, trustIcon: Users },
];

const radarData = [
    { metric: 'Approval', traditional: 30, trustai: 85 },
    { metric: 'Repayment', traditional: 55, trustai: 94 },
    { metric: 'Speed', traditional: 10, trustai: 98 },
    { metric: 'Merchant Growth', traditional: 15, trustai: 85 },
    { metric: 'Security', traditional: 40, trustai: 95 },
    { metric: 'Inclusion', traditional: 20, trustai: 90 },
];

const barData = [
    { name: 'Approval', Traditional: 30, TrustAI: 85 },
    { name: 'Repayment', Traditional: 55, TrustAI: 94 },
    { name: 'Merchant Growth', Traditional: 0, TrustAI: 40 },
    { name: 'Speed Score', Traditional: 10, TrustAI: 98 },
];

// ──────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────
export default function ComparisonDashboard({ onBack, onNavigate }) {
    const [activeModel, setActiveModel] = useState('both');
    const [showStamp, setShowStamp] = useState(false);
    const metricsRef = useRef(null);
    const metricsInView = useInView(metricsRef, { once: true, margin: '-100px' });
    const chartRef = useRef(null);

    useEffect(() => {
        const timer = setTimeout(() => setShowStamp(true), 1800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-screen bg-black text-white"
        >
            {/* Background Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[200px] -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[200px] translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-1/2 w-[800px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[200px] -translate-x-1/2" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-24 pb-16">

                {/* ── Header ─────────────────────────── */}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="flex items-center text-white/50 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            <span className="hidden md:inline text-sm">Back</span>
                        </button>
                        <div>
                            <motion.h1
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-2xl sm:text-3xl md:text-4xl font-bold"
                            >
                                Traditional Lending{' '}
                                <span className="text-gray-500">vs</span>{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">TrustAI</span>
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-gray-500 text-sm mt-1"
                            >
                                See why the triangular model wins in every metric
                            </motion.p>
                        </div>
                    </div>

                    {/* Model Toggle */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center bg-white/5 border border-white/10 rounded-full p-1"
                    >
                        {[
                            { key: 'both', label: 'Compare' },
                            { key: 'traditional', label: 'Traditional' },
                            { key: 'trustai', label: 'TrustAI' },
                        ].map((opt) => (
                            <button
                                key={opt.key}
                                onClick={() => setActiveModel(opt.key)}
                                className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                                    activeModel === opt.key
                                        ? 'text-black'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {activeModel === opt.key && (
                                    <motion.div
                                        layoutId="toggleBg"
                                        className={`absolute inset-0 rounded-full ${
                                            opt.key === 'traditional'
                                                ? 'bg-red-500'
                                                : opt.key === 'trustai'
                                                ? 'bg-emerald-500'
                                                : 'bg-white'
                                        }`}
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10">{opt.label}</span>
                            </button>
                        ))}
                    </motion.div>
                </header>

                {/* ── Two-Column Comparison ──────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">

                    {/* LEFT: Traditional Model */}
                    <AnimatePresence mode="wait">
                        {(activeModel === 'both' || activeModel === 'traditional') && (
                            <motion.div
                                key="traditional"
                                initial={{ opacity: 0, x: -40 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -40 }}
                                transition={{ duration: 0.5 }}
                                className="relative rounded-3xl border border-red-500/20 bg-gradient-to-b from-red-500/5 to-black/80 p-6 sm:p-8 overflow-hidden"
                            >
                                {/* Title */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                    <h2 className="text-lg sm:text-xl font-bold text-red-400">Traditional Model</h2>
                                </div>

                                {/* Linear Flow Diagram */}
                                <div className="relative flex items-center justify-center gap-1 sm:gap-2 flex-wrap py-8">
                                    <FlowNode label="Borrower" icon={Users} color="#f87171" delay={0.2} />
                                    <FlowArrow color="#f87171" delay={0.4} />
                                    <FlowNode label="Bank" icon={CircleDollarSign} color="#f87171" delay={0.5} />
                                    <FlowArrow color="#ef4444" delay={0.7} blocked />
                                    <FlowNode label="Rejected" icon={Ban} color="#ef4444" delay={0.8} failed />

                                    {showStamp && (
                                        <Stamp
                                            text="REJECTED"
                                            color="#ef4444"
                                            bgColor="rgba(239,68,68,0.1)"
                                            borderColor="#ef4444"
                                            delay={0}
                                        />
                                    )}
                                </div>

                                {/* Money Flow Stops */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1.5 }}
                                    className="flex items-center justify-center gap-2 mb-6"
                                >
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
                                    <span className="text-[10px] text-red-400 uppercase tracking-widest font-bold">Money Flow Stops</span>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
                                </motion.div>

                                {/* Stats */}
                                <div className="space-y-2">
                                    <StatPill label="Rejection Rate" value="70%" bad delay={1.0} />
                                    <StatPill label="Recovery Rate" value="0%" bad delay={1.1} />
                                    <StatPill label="Merchant Growth" value="None" bad delay={1.2} />
                                    <StatPill label="NPA Level" value="High" bad delay={1.3} />
                                </div>

                                {/* Dead End */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.6 }}
                                    className="mt-6 text-center"
                                >
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20">
                                        <XCircle className="w-4 h-4 text-red-400" />
                                        <span className="text-xs text-red-400 font-medium">Dead End — No alternative path</span>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* RIGHT: TrustAI Model */}
                    <AnimatePresence mode="wait">
                        {(activeModel === 'both' || activeModel === 'trustai') && (
                            <motion.div
                                key="trustai"
                                initial={{ opacity: 0, x: 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 40 }}
                                transition={{ duration: 0.5 }}
                                className="relative rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-black/80 p-6 sm:p-8 overflow-hidden"
                            >
                                <MoneyParticles color="#10b981" count={8} active />

                                {/* Title */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                                    <h2 className="text-lg sm:text-xl font-bold text-emerald-400">TrustAI Triangular Model</h2>
                                </div>

                                {/* Triangle Flow Diagram */}
                                <div className="relative py-8">
                                    {/* Top node: Bank */}
                                    <div className="flex justify-center mb-4">
                                        <FlowNode label="Bank" icon={CircleDollarSign} color="#10b981" delay={0.3} />
                                    </div>

                                    {/* SVG connecting lines + animated dot */}
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
                                        <defs>
                                            <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                                                <stop offset="50%" stopColor="#06d6a0" stopOpacity="0.9" />
                                                <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
                                            </linearGradient>
                                            <filter id="glow">
                                                <feGaussianBlur stdDeviation="3" result="blur" />
                                                <feMerge>
                                                    <feMergeNode in="blur" />
                                                    <feMergeNode in="SourceGraphic" />
                                                </feMerge>
                                            </filter>
                                        </defs>
                                        {/* Borrower -> Bank */}
                                        <motion.line
                                            x1="100" y1="150" x2="200" y2="40"
                                            stroke="url(#flowGrad)" strokeWidth="2" strokeDasharray="6 4"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ delay: 0.6, duration: 1 }}
                                        />
                                        {/* Bank -> Merchant */}
                                        <motion.line
                                            x1="200" y1="40" x2="300" y2="150"
                                            stroke="url(#flowGrad)" strokeWidth="2" strokeDasharray="6 4"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ delay: 0.9, duration: 1 }}
                                        />
                                        {/* Merchant -> Borrower */}
                                        <motion.line
                                            x1="300" y1="150" x2="100" y2="150"
                                            stroke="url(#flowGrad)" strokeWidth="2" strokeDasharray="6 4"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ delay: 1.2, duration: 1 }}
                                        />
                                        {/* Animated dot traveling the triangle */}
                                        <motion.circle
                                            r="4" fill="#10b981"
                                            filter="url(#glow)"
                                            animate={{
                                                cx: [100, 200, 300, 100],
                                                cy: [150, 40, 150, 150],
                                            }}
                                            transition={{
                                                duration: 4,
                                                repeat: Infinity,
                                                ease: 'linear',
                                                delay: 2,
                                            }}
                                        />
                                    </svg>

                                    {/* Bottom nodes: Borrower + Merchant */}
                                    <div className="flex justify-between items-center px-4 sm:px-8 mt-4">
                                        <FlowNode label="Borrower" icon={Users} color="#06d6a0" delay={0.5} />
                                        <FlowNode label="Merchant" icon={Store} color="#34d399" delay={0.7} />
                                    </div>

                                    {showStamp && (
                                        <Stamp
                                            text="RESTRUCTURED"
                                            color="#10b981"
                                            bgColor="rgba(16,185,129,0.1)"
                                            borderColor="#10b981"
                                            delay={0}
                                        />
                                    )}
                                </div>

                                <LoopIndicator delay={2.0} />

                                {/* Money Flows Continuously */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1.5 }}
                                    className="flex items-center justify-center gap-2 my-4"
                                >
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                                    <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">Money Flows Continuously</span>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                                </motion.div>

                                {/* Stats */}
                                <div className="space-y-2">
                                    <StatPill label="Approval Rate (post-restructure)" value="85%" delay={1.0} />
                                    <StatPill label="Repayment Rate" value="94%" delay={1.1} />
                                    <StatPill label="Merchant Growth" value="3x" delay={1.2} />
                                    <StatPill label="NPA Level" value="Near Zero" delay={1.3} />
                                </div>

                                {/* Success */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.6 }}
                                    className="mt-6 text-center"
                                >
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                                        <span className="text-xs text-emerald-400 font-medium">Everyone wins — borrower, merchant, bank</span>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── Key Metrics Comparison Table ──────── */}
                <motion.section
                    ref={metricsRef}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.7 }}
                    className="mb-16"
                >
                    <div className="text-center mb-8">
                        <h2 className="text-2xl sm:text-3xl font-bold mb-2">Key Metrics Comparison</h2>
                        <p className="text-gray-500 text-sm">Animated counters showing the real difference</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02] backdrop-blur-sm">
                        {/* Table Header */}
                        <div className="grid grid-cols-3 bg-white/5 border-b border-white/10">
                            <div className="px-4 sm:px-6 py-3">
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Metric</span>
                            </div>
                            <div className="px-4 sm:px-6 py-3 text-center">
                                <span className="text-xs text-red-400 font-bold uppercase tracking-widest">Traditional</span>
                            </div>
                            <div className="px-4 sm:px-6 py-3 text-center">
                                <span className="text-xs text-emerald-400 font-bold uppercase tracking-widest">TrustAI</span>
                            </div>
                        </div>

                        {/* Table Rows */}
                        {METRICS.map((metric, i) => {
                            const TradIcon = metric.tradIcon;
                            const TrustIcon = metric.trustIcon;
                            return (
                                <motion.div
                                    key={metric.label}
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`grid grid-cols-3 items-center border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${
                                        i % 2 === 0 ? 'bg-white/[0.01]' : ''
                                    }`}
                                >
                                    <div className="px-4 sm:px-6 py-4 flex items-center gap-2">
                                        <span className="text-sm text-gray-300">{metric.label}</span>
                                    </div>
                                    <div className="px-4 sm:px-6 py-4 text-center flex items-center justify-center gap-2">
                                        <TradIcon className="w-4 h-4 text-red-400/60 hidden sm:block" />
                                        {metric.traditionalText ? (
                                            <span className="text-red-400 font-bold text-sm">{metric.traditionalText}</span>
                                        ) : (
                                            <CounterCell
                                                value={metric.traditional}
                                                suffix={metric.suffix || ''}
                                                color="text-red-400"
                                                inView={metricsInView}
                                            />
                                        )}
                                    </div>
                                    <div className="px-4 sm:px-6 py-4 text-center flex items-center justify-center gap-2">
                                        <TrustIcon className="w-4 h-4 text-emerald-400/60 hidden sm:block" />
                                        {metric.trustaiText ? (
                                            <span className="text-emerald-400 font-bold text-sm">{metric.trustaiText}</span>
                                        ) : (
                                            <CounterCell
                                                value={metric.trustai}
                                                suffix={metric.suffix || ''}
                                                prefix={metric.prefix || ''}
                                                color="text-emerald-400"
                                                inView={metricsInView}
                                            />
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.section>

                {/* ── Charts Section ────────────────────── */}
                <motion.section
                    ref={chartRef}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.7 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16"
                >
                    {/* Bar Chart */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Performance Comparison</h3>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={barData} barGap={4}>
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                                    axisLine={{ stroke: '#333' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: '#6b7280', fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    domain={[0, 100]}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#111',
                                        border: '1px solid #333',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        color: '#fff',
                                    }}
                                />
                                <Bar dataKey="Traditional" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                    {barData.map((_, index) => (
                                        <Cell key={`trad-${index}`} fill="#ef4444" fillOpacity={0.7} />
                                    ))}
                                </Bar>
                                <Bar dataKey="TrustAI" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                    {barData.map((_, index) => (
                                        <Cell key={`trust-${index}`} fill="#10b981" fillOpacity={0.9} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Radar Chart */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Coverage Radar</h3>
                        <ResponsiveContainer width="100%" height={280}>
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#333" />
                                <PolarAngleAxis
                                    dataKey="metric"
                                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                                />
                                <PolarRadiusAxis
                                    angle={30}
                                    domain={[0, 100]}
                                    tick={{ fill: '#555', fontSize: 9 }}
                                    axisLine={false}
                                />
                                <Radar
                                    name="Traditional"
                                    dataKey="traditional"
                                    stroke="#ef4444"
                                    fill="#ef4444"
                                    fillOpacity={0.15}
                                    strokeWidth={2}
                                />
                                <Radar
                                    name="TrustAI"
                                    dataKey="trustai"
                                    stroke="#10b981"
                                    fill="#10b981"
                                    fillOpacity={0.2}
                                    strokeWidth={2}
                                />
                                <Legend
                                    wrapperStyle={{ fontSize: '11px', color: '#aaa' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.section>

                {/* ── Impact Summary Cards ──────────────── */}
                <motion.section
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
                >
                    {[
                        { label: 'More Approvals', value: '2.8x', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                        { label: 'Faster Decisions', value: '1000x', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
                        { label: 'Lower Defaults', value: '6x', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                        { label: 'Zero Misuse', value: '100%', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                    ].map((card, i) => (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, type: 'spring' }}
                            className={`rounded-2xl border ${card.border} ${card.bg} p-5 text-center hover:scale-105 transition-transform cursor-default`}
                        >
                            <div className={`text-3xl sm:text-4xl font-black ${card.color} mb-1`}>{card.value}</div>
                            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">{card.label}</div>
                        </motion.div>
                    ))}
                </motion.section>

                {/* ── How It Works Strip ────────────────── */}
                <motion.section
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="mb-16"
                >
                    <div className="text-center mb-8">
                        <h2 className="text-2xl sm:text-3xl font-bold mb-2">The TrustAI Difference</h2>
                        <p className="text-gray-500 text-sm">Three simple shifts that change everything</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            {
                                num: '01',
                                title: 'Purpose-Locked Credit',
                                desc: 'Money goes directly to the merchant via Paytm escrow. Borrower never touches cash — zero misuse.',
                                color: '#10b981',
                                icon: Lock,
                            },
                            {
                                num: '02',
                                title: 'AI Agent Swarm',
                                desc: 'Five parallel agents (GNN, TCN, Fraud, Validator, Disburser) produce sub-200ms decisions.',
                                color: '#3b82f6',
                                icon: Zap,
                            },
                            {
                                num: '03',
                                title: 'Triangular Trust',
                                desc: 'Merchant confirms delivery, bank confirms payment, borrower builds credit. Everyone wins.',
                                color: '#8b5cf6',
                                icon: Shield,
                            },
                        ].map((item, i) => {
                            const Icon = item.icon;
                            return (
                                <motion.div
                                    key={item.num}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.15 }}
                                    className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 group hover:border-white/20 transition-all overflow-hidden"
                                >
                                    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-[60px] group-hover:blur-[40px] transition-all" style={{ backgroundColor: `${item.color}20` }} />
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-4xl font-black" style={{ color: `${item.color}30` }}>{item.num}</span>
                                        <Icon className="w-5 h-5" style={{ color: item.color }} />
                                    </div>
                                    <h3 className="text-white font-bold text-lg mb-2">{item.title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.section>

                {/* ── Live Demo CTA ─────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center"
                >
                    <div className="inline-flex flex-col items-center gap-4 p-8 sm:p-12 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent relative overflow-hidden">
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-emerald-500/5 rounded-full blur-[100px]" />
                        </div>
                        <div className="relative z-10">
                            <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                            <h3 className="text-xl sm:text-2xl font-bold mb-2">See It In Action</h3>
                            <p className="text-gray-500 text-sm mb-6 max-w-md">
                                Watch the AI agent swarm process a real credit request in under 200ms
                            </p>
                            <button
                                onClick={() => {
                                    if (onNavigate) {
                                        onNavigate('swarm');
                                    } else {
                                        window.dispatchEvent(new CustomEvent('trustai:navigate', { detail: 'swarm' }));
                                    }
                                }}
                                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all duration-300 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] hover:scale-105"
                            >
                                <Play className="w-5 h-5" />
                                Launch Live Demo
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* ── Footer Tag ────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                    className="text-center mt-16 pb-8"
                >
                    <span className="text-[10px] text-gray-600 uppercase tracking-[0.3em]">
                        TrustAI — Triangular Trust Model — FIN-O-HACK 2026
                    </span>
                </motion.div>
            </div>
        </motion.div>
    );
}
