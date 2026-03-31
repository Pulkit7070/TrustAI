import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Network, Layers3, Activity, ShieldCheck, AlertTriangle, RefreshCw
} from 'lucide-react';
import { API_BASE } from '../lib/api';
const FALLBACK_PROFILES = [
    { id: 'approved', label: 'Strong Merchant (Approved)' },
    { id: 'structured', label: 'Moderate Merchant (Structured)' },
    { id: 'rejected', label: 'Risky Borrower (Rejected)' },
    { id: 'fraud', label: 'Fraudulent Actor (Fraud Alert)' },
];

const CLUSTER_COLORS = {
    business: '#f59e0b',
    credit: '#22c55e',
    customers: '#3b82f6',
    financial: '#ef4444',
    merchant: '#f8fafc',
    revenue: '#a855f7',
};

const STATUS_STROKES = {
    stable: '#22c55e',
    neutral: '#3b82f6',
    warning: '#f59e0b',
    volatile: '#ef4444',
};

const money = (n) => `INR ${(n || 0).toLocaleString()}`;

const pickStatus = (score) => {
    if (score >= 0.75) return 'stable';
    if (score >= 0.55) return 'neutral';
    if (score >= 0.35) return 'warning';
    return 'volatile';
};

const nodeSignal = (node, tx = {}, analysis = {}) => {
    const margin = (tx.monthly_income || 0) > 0 ? (tx.monthly_income - tx.monthly_expense) / tx.monthly_income : 0;
    const clusterScore = analysis.gnn_cluster_probs?.[node.cluster];

    let score = clusterScore ?? 0.5;
    let metric = 'Cluster score';
    let value = typeof clusterScore === 'number' ? clusterScore.toFixed(4) : 'n/a';

    switch (node.id) {
        case 'merchant':
            score = Math.min(1, ((tx.months_active || 0) / 24) * 0.5 + (analysis.gnn_confidence || 0.5) * 0.5);
            metric = 'Merchant tenure';
            value = `${tx.months_active || 0} months`;
            break;
        case 'upi_p2m':
            score = Math.min(1, (tx.upi_monthly_count || 0) / 150);
            metric = 'UPI count';
            value = `${tx.upi_monthly_count || 0} tx/month`;
            break;
        case 'qr_dynamic':
        case 'qr_static':
            score = Math.min(1, (tx.qr_payments_count || 0) / 80);
            metric = 'QR payments';
            value = `${tx.qr_payments_count || 0} tx/month`;
            break;
        case 'soundbox':
            score = tx.soundbox_active ? Math.min(1, 0.45 + (tx.soundbox_txn_count || 0) / 120) : 0.2;
            metric = 'Soundbox';
            value = tx.soundbox_active ? `${tx.soundbox_txn_count || 0} tx` : 'inactive';
            break;
        case 'settlement':
            score = Math.min(1, (tx.settlement_amount || 0) / 500000);
            metric = 'Settlement value';
            value = money(tx.settlement_amount || 0);
            break;
        case 'cashflow':
            score = Math.min(1, Math.max(0, (margin + 0.2) / 0.8));
            metric = 'Income margin';
            value = `${Math.round(margin * 100)}%`;
            break;
        case 'loan_history':
            score = Math.min(1, ((tx.loans_repaid || 0) / 4) * 0.6 + (1 - (tx.default_rate || 0)) * 0.4);
            metric = 'Loans repaid';
            value = `${tx.loans_repaid || 0}`;
            break;
        case 'credit_line':
            score = Math.max(0, 1 - (analysis.composite_risk || 0.5));
            metric = 'Composite risk';
            value = typeof analysis.composite_risk === 'number' ? analysis.composite_risk.toFixed(4) : 'n/a';
            break;
        case 'cust_regular':
            score = Math.min(1, (tx.repeat_customers || 0) / 90);
            metric = 'Repeat customers';
            value = `${tx.repeat_customers || 0}`;
            break;
        case 'cust_new':
            score = Math.min(1, (tx.new_customers_monthly || 0) / 30);
            metric = 'New customers';
            value = `${tx.new_customers_monthly || 0}`;
            break;
        case 'cust_high_value':
            score = Math.min(1, (tx.avg_ticket_size || 0) / 1500);
            metric = 'Avg ticket size';
            value = money(tx.avg_ticket_size || 0);
            break;
        case 'cust_seasonal':
            score = Math.max(0, 1 - Math.min(1, ((tx.current_month_count || 0) / Math.max(tx.avg_monthly_count || 1, 1) - 1) / 2));
            metric = 'Seasonality ratio';
            value = `${((tx.current_month_count || 0) / Math.max(tx.avg_monthly_count || 1, 1)).toFixed(2)}x`;
            break;
        case 'refunds':
        case 'chargeback':
            score = Math.max(0, 1 - (analysis.fraud_score || 0));
            metric = 'Fraud pressure';
            value = typeof analysis.fraud_score === 'number' ? analysis.fraud_score.toFixed(4) : 'n/a';
            break;
        case 'postpaid_usage':
            score = Math.min(1, (tx.merchant_tier || 0) / 4);
            metric = 'Merchant tier';
            value = `${tx.merchant_tier || 0}`;
            break;
        case 'inventory':
            score = Math.min(1, ((tx.monthly_income || 0) / Math.max((tx.monthly_expense || 1), 1)) / 2);
            metric = 'Inventory capacity';
            value = `${Math.max(tx.monthly_income || 0, 0)}/${Math.max(tx.monthly_expense || 0, 0)}`;
            break;
        case 'suppliers':
            score = Math.min(1, (tx.unique_customers || 0) / 120);
            metric = 'Network reach';
            value = `${tx.unique_customers || 0} linked parties`;
            break;
        case 'operating_costs':
            score = Math.max(0, 1 - Math.min(1, (tx.monthly_expense || 0) / Math.max(tx.monthly_income || 1, 1)));
            metric = 'Expense ratio';
            value = `${Math.round(((tx.monthly_expense || 0) / Math.max(tx.monthly_income || 1, 1)) * 100)}%`;
            break;
        default:
            break;
    }

    return {
        score: Number(score.toFixed(4)),
        status: pickStatus(score),
        metric,
        value,
        narrative: `${node.label} reflects the ${node.cluster} cluster with ${pickStatus(score)} health for this merchant profile.`,
    };
};

export default function CreditReliabilityMesh({ onBack }) {
    const containerRef = useRef(null);
    const svgRef = useRef(null);

    const [profiles, setProfiles] = useState(FALLBACK_PROFILES);
    const [selectedProfile, setSelectedProfile] = useState('structured');
    const [topology, setTopology] = useState(null);
    const [profileData, setProfileData] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshTick, setRefreshTick] = useState(0);
    const [selectedNode, setSelectedNode] = useState(null);
    const [hoveredNode, setHoveredNode] = useState(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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
        if (!containerRef.current) return undefined;

        const updateSize = () => {
            setDimensions({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight,
            });
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        let ignore = false;
        setLoading(true);
        setError('');
        setSelectedNode(null);

        const load = async () => {
            try {
                const [topologyRes, profileRes] = await Promise.all([
                    fetch(`${API_BASE}/graph/topology`),
                    fetch(`${API_BASE}/swarm/profiles/${selectedProfile}`),
                ]);

                const topologyData = await topologyRes.json();
                const profile = await profileRes.json();

                if (!topologyRes.ok) throw new Error('Could not load graph topology');
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
                if (!analysisRes.ok) throw new Error('Could not load graph signals');

                if (!ignore) {
                    setTopology(topologyData);
                    setProfileData(profile);
                    setAnalysis(analysisData);
                }
            } catch (err) {
                if (!ignore) {
                    setTopology(null);
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

    const graphData = useMemo(() => {
        if (!topology) return { nodes: [], links: [] };

        const tx = profileData?.transaction_data || {};
        const nodes = topology.nodes.map((node) => {
            const signal = nodeSignal(node, tx, analysis || {});
            return {
                ...node,
                ...signal,
                radius: node.id === 'merchant' ? 24 : 10 + signal.score * 10,
            };
        });

        const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));
        const links = topology.edges.map((edge) => {
            const sourceScore = nodeMap[edge.source]?.score || 0.5;
            const targetScore = nodeMap[edge.target]?.score || 0.5;
            return {
                ...edge,
                strength: (sourceScore + targetScore) / 2,
            };
        });

        return { nodes, links };
    }, [topology, profileData, analysis]);

    useEffect(() => {
        if (!svgRef.current || !dimensions.width || !graphData.nodes.length) return undefined;

        const width = dimensions.width;
        const height = dimensions.height;
        const nodes = graphData.nodes.map((node) => ({ ...node }));
        const links = graphData.links.map((link) => ({ ...link }));

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id((d) => d.id).distance((d) => d.source.id === 'merchant' || d.target.id === 'merchant' ? 110 : 65))
            .force('charge', d3.forceManyBody().strength(-240))
            .force('collide', d3.forceCollide().radius((d) => d.radius + 14))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('radial', d3.forceRadial((d) => d.id === 'merchant' ? 0 : d.cluster === 'merchant' ? 40 : 170, width / 2, height / 2).strength(0.2));

        const link = svg.append('g')
            .attr('stroke-linecap', 'round')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke', '#334155')
            .attr('stroke-opacity', (d) => 0.18 + d.strength * 0.45)
            .attr('stroke-width', (d) => 1 + d.strength * 2);

        const node = svg.append('g')
            .selectAll('g')
            .data(nodes)
            .join('g')
            .attr('cursor', 'pointer')
            .call(
                d3.drag()
                    .on('start', (event, d) => {
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                        d.fx = d.x;
                        d.fy = d.y;
                    })
                    .on('drag', (event, d) => {
                        d.fx = event.x;
                        d.fy = event.y;
                    })
                    .on('end', (event, d) => {
                        if (!event.active) simulation.alphaTarget(0);
                        d.fx = null;
                        d.fy = null;
                    })
            )
            .on('mouseenter', (event, d) => {
                setHoveredNode({ ...d, x: event.clientX, y: event.clientY });
            })
            .on('mouseleave', () => setHoveredNode(null))
            .on('click', (_, d) => setSelectedNode(d));

        node.append('circle')
            .attr('r', (d) => d.radius)
            .attr('fill', (d) => CLUSTER_COLORS[d.cluster] || '#94a3b8')
            .attr('fill-opacity', (d) => d.id === 'merchant' ? 0.9 : 0.7)
            .attr('stroke', (d) => STATUS_STROKES[d.status])
            .attr('stroke-width', (d) => d.id === 'merchant' ? 4 : 2);

        node.append('text')
            .text((d) => d.label.replace(/_/g, ' '))
            .attr('dy', (d) => d.radius + 13)
            .attr('text-anchor', 'middle')
            .attr('fill', '#cbd5e1')
            .attr('font-size', (d) => d.id === 'merchant' ? '11px' : '9px')
            .style('pointer-events', 'none');

        simulation.on('tick', () => {
            link
                .attr('x1', (d) => d.source.x)
                .attr('y1', (d) => d.source.y)
                .attr('x2', (d) => d.target.x)
                .attr('y2', (d) => d.target.y);

            node.attr('transform', (d) => `translate(${d.x},${d.y})`);
        });

        return () => simulation.stop();
    }, [graphData, dimensions]);

    const selectedSummary = selectedNode || graphData.nodes.find((node) => node.id === 'merchant');
    const topFeatures = (analysis?.feature_importance || []).slice(0, 4);

    return (
        <div className="fixed inset-0 z-50 bg-[#0B0E14] text-white font-sans flex flex-col overflow-hidden selection:bg-cyan-500/30">
            <header className="relative z-20 px-6 py-4 border-b border-white/5 bg-[#0B0E14]/80 backdrop-blur-md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                                <Network className="w-5 h-5 text-cyan-400" />
                                Credit Mesh
                            </h1>
                            <p className="text-xs text-gray-500">Live 21-node merchant graph from /graph/topology</p>
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
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] overflow-hidden">
                <div className="relative" ref={containerRef}>
                    <div className="absolute inset-x-6 top-6 z-10 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-4">
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Nodes</div>
                            <div className="text-2xl font-bold text-white">{graphData.nodes.length}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-4">
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Edges</div>
                            <div className="text-2xl font-bold text-white">{graphData.links.length}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-4">
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Decision</div>
                            <div className={`text-lg font-bold ${analysis?.decision === 'approved' ? 'text-green-400' : analysis?.decision === 'structured' ? 'text-yellow-400' : 'text-red-400'}`}>
                                {(analysis?.decision || 'n/a').toUpperCase()}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-md p-4">
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Composite Risk</div>
                            <div className="text-2xl font-bold text-cyan-400">{typeof analysis?.composite_risk === 'number' ? analysis.composite_risk.toFixed(4) : '--'}</div>
                        </div>
                    </div>

                    <svg ref={svgRef} className="w-full h-full" />

                    {hoveredNode && (
                        <div
                            className="absolute pointer-events-none z-40 -translate-x-1/2 -translate-y-full"
                            style={{ left: hoveredNode.x, top: hoveredNode.y - 12 }}
                        >
                            <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl w-56">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-white">{hoveredNode.label}</span>
                                    <span className={`text-[10px] uppercase font-bold`} style={{ color: STATUS_STROKES[hoveredNode.status] }}>
                                        {hoveredNode.status}
                                    </span>
                                </div>
                                <div className="text-[11px] text-gray-400 mb-1">{hoveredNode.cluster} cluster</div>
                                <div className="text-[11px] text-gray-300">{hoveredNode.metric}: {hoveredNode.value}</div>
                            </div>
                        </div>
                    )}

                    {(loading || error) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            <div className={`text-sm ${error ? 'text-red-400' : 'text-gray-300'}`}>
                                {error || 'Loading graph topology...'}
                            </div>
                        </div>
                    )}
                </div>

                <aside className="border-l border-white/5 bg-black/40 backdrop-blur-xl p-6 overflow-y-auto">
                    <div className="mb-6">
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Merchant Profile</div>
                        <div className="text-xl font-bold text-white">{profileData?.merchant_name || 'Loading...'}</div>
                        <div className="text-sm text-gray-500 mt-1">{money(profileData?.loan_amount)} request</div>
                    </div>

                    {selectedSummary && (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedSummary.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-6"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <div className="text-lg font-bold text-white">{selectedSummary.label}</div>
                                        <div className="text-[11px] text-gray-500 uppercase tracking-widest mt-1">{selectedSummary.cluster}</div>
                                    </div>
                                    <div className={`text-[10px] uppercase font-bold px-2 py-1 rounded`} style={{ backgroundColor: `${STATUS_STROKES[selectedSummary.status]}22`, color: STATUS_STROKES[selectedSummary.status] }}>
                                        {selectedSummary.status}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="rounded-xl bg-black/40 p-3 border border-white/5">
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Signal</div>
                                        <div className="text-xl font-bold text-white">{selectedSummary.score.toFixed(4)}</div>
                                    </div>
                                    <div className="rounded-xl bg-black/40 p-3 border border-white/5">
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{selectedSummary.metric}</div>
                                        <div className="text-sm font-semibold text-cyan-400">{selectedSummary.value}</div>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-400 leading-relaxed">{selectedSummary.narrative}</p>
                            </motion.div>
                        </AnimatePresence>
                    )}

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Layers3 className="w-4 h-4 text-cyan-400" />
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cluster Legend</div>
                        </div>
                        <div className="space-y-2">
                            {Object.entries(CLUSTER_COLORS).map(([cluster, color]) => (
                                <div key={cluster} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                        <span className="text-gray-300 capitalize">{cluster}</span>
                                    </div>
                                    <span className="text-gray-500">{graphData.nodes.filter((node) => node.cluster === cluster).length}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="w-4 h-4 text-purple-400" />
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Top Drivers</div>
                        </div>
                        <div className="space-y-3">
                            {topFeatures.map((feature) => (
                                <div key={feature.name} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-300">{feature.name}</span>
                                    <span className={feature.value >= 0 ? 'text-green-400 font-mono' : 'text-red-400 font-mono'}>
                                        {feature.value.toFixed(4)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck className="w-4 h-4 text-green-400" />
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fraud Flags</div>
                        </div>
                        <div className="space-y-2">
                            {(analysis?.fraud_flags?.length ? analysis.fraud_flags : [{ type: 'none', severity: 'stable' }]).map((flag) => (
                                <div key={flag.type} className={`flex items-center gap-2 text-[11px] px-2 py-2 rounded ${
                                    flag.severity === 'critical' ? 'bg-red-500/10 text-red-400' : flag.type === 'none' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                                }`}>
                                    {flag.severity === 'critical' ? <AlertTriangle className="w-3 h-3 shrink-0" /> : <ShieldCheck className="w-3 h-3 shrink-0" />}
                                    <span className="font-mono">{flag.type}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
