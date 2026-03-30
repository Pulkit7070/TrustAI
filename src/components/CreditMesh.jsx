import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Activity, Info, ShieldCheck, Zap, AlertTriangle,
    TrendingUp, Network, Clock, DollarSign, Users, CreditCard,
    LayoutDashboard, MousePointer2
} from 'lucide-react';
import {
    LineChart, Line, ResponsiveContainer, YAxis
} from 'recharts';

// --- Sparkline Component ---
const Sparkline = ({ data, color = "#22c55e" }) => (
    <div className="h-10 w-24">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    </div>
);

const CreditReliabilityMesh = ({ onBack }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [hoveredNode, setHoveredNode] = useState(null);
    const [hoveredEdge, setHoveredEdge] = useState(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const simulationRef = useRef(null);

    // --- Enhanced Graph Data ---
    const graphData = useMemo(() => {
        const nodes = [];
        const links = [];

        // 1. Center User Node
        const userNode = {
            id: 'user', group: 'user', label: 'USER', r: 30,
            status: 'stable', importance: 10,
            metrics: { score: 810, risk: "Low" }
        };
        nodes.push(userNode);

        // 2. Primary Nodes with Detailed Metrics
        const primaryNodes = [
            {
                id: 'employer', label: 'EMPLOYER / GIG', group: 'income', status: 'stable', importance: 9,
                metrics: { label1: "Income Consistency", val1: "82%", label2: "Avg Monthly", val2: "₹28,500", label3: "Variance", val3: "Low" },
                trend: [{ value: 28000 }, { value: 28200 }, { value: 28500 }, { value: 28500 }]
            },
            {
                id: 'upi', label: 'UPI NETWORK', group: 'payment', status: 'neutral', importance: 7,
                metrics: { label1: "Monthly Volume", val1: "₹18,200", label2: "Recurring", val2: "64%", label3: "Volatility", val3: "Medium" },
                trend: [{ value: 15000 }, { value: 19000 }, { value: 16000 }, { value: 18200 }]
            },
            {
                id: 'rent', label: 'RENT / UTILITIES', group: 'obligation', status: 'stable', importance: 8,
                metrics: { label1: "On-Time Rate", val1: "95%", label2: "Missed (6m)", val2: "0", label3: "Avg Payment", val3: "₹12,000" },
                trend: [{ value: 12000 }, { value: 12000 }, { value: 12000 }, { value: 12000 }]
            },
            {
                id: 'merchant', label: 'MERCHANT NETWORK', group: 'spending', status: 'volatile', importance: 8,
                metrics: { label1: "Spending Volatility", val1: "High", label2: "Essential Ratio", val2: "72%", label3: "Spikes", val3: "2/mo" },
                trend: [{ value: 5000 }, { value: 12000 }, { value: 6000 }, { value: 15000 }]
            },
            {
                id: 'savings', label: 'SAVINGS ACCOUNT', group: 'asset', status: 'stable', importance: 7,
                metrics: { label1: "Avg Monthly", val1: "₹3,200", label2: "Consistency", val2: "78%", label3: "Buffer", val3: "2.5 mo" },
                trend: [{ value: 3000 }, { value: 3100 }, { value: 3000 }, { value: 3200 }]
            },
            {
                id: 'p2p', label: 'P2P NETWORK', group: 'social', status: 'neutral', importance: 6,
                metrics: { label1: "Borrowing Events", val1: "1", label2: "Transfers", val2: "Moderate", label3: "Network Risk", val3: "Low" },
                trend: [{ value: 2 }, { value: 0 }, { value: 1 }, { value: 1 }]
            },
        ];

        primaryNodes.forEach(p => {
            nodes.push({ ...p, r: 15 + p.importance, type: 'primary' });
            links.push({
                source: 'user', target: p.id,
                distance: 120, strength: 0.8,
                freq: p.importance / 2, // Edge thickness
                stable: p.status === 'stable',
                active: p.status === 'volatile' || p.id === 'upi', // Pulsing edges
                metrics: { txCount: Math.floor(Math.random() * 50) + 10, avgVal: `₹${Math.floor(Math.random() * 5000) + 500}` }
            });
        });

        // 3. Secondary Nodes (Clusters) - Visual clutter reduction: smaller, less detail
        const clusters = {
            employer: [{ id: 'inc_stable', label: 'Salary', status: 'stable' }, { id: 'inc_var', label: 'Bonus', status: 'neutral' }],
            upi: [{ id: 'bill', label: 'Bills', status: 'stable' }, { id: 'groceries', label: 'Store', status: 'neutral' }],
            merchant: [{ id: 'lux', label: 'Luxury', status: 'volatile' }, { id: 'subs', label: 'Subs', status: 'stable' }],
            savings: [{ id: 'rd', label: 'FD', status: 'stable' }]
        };

        Object.entries(clusters).forEach(([pid, kids]) => {
            kids.forEach(k => {
                nodes.push({ ...k, group: pid, r: 8, type: 'secondary', importance: 3 });
                links.push({ source: pid, target: k.id, distance: 40, strength: 0.5, freq: 1, stable: true });
            });
        });

        return { nodes, links };
    }, []);

    // --- D3 Simulation ---
    useEffect(() => {
        if (!containerRef.current) return;
        setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    }, []);

    useEffect(() => {
        if (!svgRef.current || dimensions.width === 0) return;

        const { nodes, links } = graphData;
        const width = dimensions.width;
        const height = dimensions.height;

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(d => d.distance || 60))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(d => d.r + 15).strength(0.8))
            .force("radial", d3.forceRadial(d => d.group === 'user' ? 0 : d.type === 'primary' ? 140 : 220, width / 2, height / 2).strength(0.15));

        simulationRef.current = simulation;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // -- Defs for Glows --
        const defs = svg.append("defs");
        const createGlow = (color, id) => {
            const filter = defs.append("filter").attr("id", id).attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
            filter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
            const merge = filter.append("feMerge");
            merge.append("feMergeNode").attr("in", "coloredBlur");
            merge.append("feMergeNode").attr("in", "SourceGraphic");
        };
        createGlow("#22c55e", "glow-green");
        createGlow("#ef4444", "glow-red");
        createGlow("#3b82f6", "glow-blue");
        createGlow("#eab308", "glow-yellow");

        // -- Links --
        const link = svg.append("g")
            .attr("stroke-linecap", "round")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke", d => d.stable ? "#22c55e" : "#ef4444")
            .attr("stroke-opacity", d => d.active ? 0.6 : 0.2)
            .attr("stroke-width", d => d.freq * 1.5)
            .attr("class", d => d.active ? "animate-pulse-fast" : "")
            .on("mouseenter", (e, d) => setHoveredEdge({ ...d, x: e.clientX, y: e.clientY }))
            .on("mouseleave", () => setHoveredEdge(null));

        // -- Link Pulse Animation (CSS override injection for D3 elements) --
        svg.append("style").text(`
            @keyframes pulse-link { 0% { opacity: 0.2; } 50% { opacity: 0.7; } 100% { opacity: 0.2; } }
            .animate-pulse-fast { animation: pulse-link 2s infinite; }
        `);

        // -- Nodes --
        const node = svg.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("cursor", "pointer")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended))
            .on("mouseenter", (e, d) => setHoveredNode({ ...d, x: d.x, y: d.y })) // Use d.x/y for better stability or e.client for mouse
            .on("mouseleave", () => setHoveredNode(null))
            .on("click", (e, d) => { e.stopPropagation(); setSelectedNode(d); });

        // Node Circles
        node.append("circle")
            .attr("r", d => d.r)
            .attr("fill", d => getNodeColor(d))
            .attr("stroke", "#fff")
            .attr("stroke-width", d => d.id === 'user' ? 3 : 1.5)
            .style("filter", d => {
                if (d.status === 'stable') return "url(#glow-green)";
                if (d.status === 'volatile') return "url(#glow-red)";
                if (d.status === 'warning') return "url(#glow-yellow)";
                return "url(#glow-blue)";
            });

        // Icons for Primary Nodes
        node.filter(d => d.type === 'primary').append("foreignObject")
            .attr("width", 20).attr("height", 20)
            .attr("x", -10).attr("y", -10)
            .style("pointer-events", "none")
            .append("xhtml:div")
            .attr("class", "flex items-center justify-center h-full text-white/80")
            .html(d => `<i data-lucide="${getIconName(d.group)}" width="16" height="16"></i>`);

        // Labels
        node.append("text")
            .text(d => d.label)
            .attr("dy", d => d.r + 15)
            .attr("text-anchor", "middle")
            .attr("fill", "#e2e8f0")
            .attr("font-size", d => d.id === 'user' ? "12px" : "10px")
            .attr("font-weight", d => d.id === 'user' ? "bold" : "500")
            .style("pointer-events", "none")
            .style("text-shadow", "0 2px 4px rgba(0,0,0,0.8)");

        // Tick
        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });

        // Drag Handlers
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
            setSelectedNode(d);
        }
        function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
        }

        // Click BG to deselect
        svg.on("click", () => setSelectedNode(null));

    }, [dimensions, graphData]);

    // Update Lucide icons inside D3
    useEffect(() => {
        // Simple hack to render icons if needed, but we used text/svg above. 
        // Providing SVGs directly in D3 is harder with lucide-react, so we often omit or use simple paths.
        // For this demo, let's keep circles clean.
    }, []);

    const getNodeColor = (d) => {
        if (d.id === 'user') return '#fbbf24';
        switch (d.status) {
            case 'stable': return '#22c55e';
            case 'volatile': return '#ef4444';
            case 'warning': return '#eab308';
            default: return '#3b82f6';
        }
    };

    const getIconName = (group) => {
        switch (group) {
            case 'income': return 'briefcase';
            case 'payment': return 'zap';
            case 'obligation': return 'home';
            case 'spending': return 'shopping-cart';
            case 'asset': return 'piggy-bank';
            default: return 'circle';
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0B0E14] text-white font-sans flex flex-col overflow-hidden selection:bg-cyan-500/30">

            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#0B0E14] to-[#0B0E14] pointer-events-none" />

            {/* Header & Stats Bar */}
            <header className="relative z-20 px-6 py-4 flex flex-col gap-4 border-b border-white/5 bg-[#0B0E14]/80 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                            <Network className="w-5 h-5 text-cyan-400" />
                            Credit Mesh <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 tracking-wider">BETA</span>
                        </h1>
                    </div>
                </div>

                {/* Top Summary Bar Removed */}
            </header>

            {/* Main Viz Container */}
            <div className="flex-1 flex relative overflow-hidden" ref={containerRef}>
                <svg ref={svgRef} className="w-full h-full cursor-move active:cursor-grabbing" style={{ width: '100%', height: '100%' }} />

                {/* Node Tooltip */}
                <AnimatePresence>
                    {hoveredNode && hoveredNode.type === 'primary' && !selectedNode && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{ left: dimensions.width / 2 + hoveredNode.x / 2 /* Rough positioning logic can be improved */, top: hoveredNode.y }}
                        // In real d3 app, we'd translate d.x/d.y to screen coords. For now let's use fixed corner capability or follow mouse.
                        // Let's use customized floating based on mouse for reliability
                        /> // Placeholder, implemented below in a better way
                    )}
                </AnimatePresence>

                {/* Render Tooltip explicitly using state coords */}
                {hoveredNode && hoveredNode.metrics && !selectedNode && (
                    <div
                        className="absolute pointer-events-none z-40 transform -translate-x-1/2 -translate-y-[120%]"
                        style={{ left: dimensions.width / 2 + (hoveredNode.x - dimensions.width / 2) * 1 /* Zoom factor if applied */, top: dimensions.height / 2 + (hoveredNode.y - dimensions.height / 2) * 1 }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-[#151921]/90 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl w-48"
                        >
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                                <div className={`w-2 h-2 rounded-full ${hoveredNode.status === 'stable' ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="text-xs font-bold text-gray-200">{hoveredNode.label}</span>
                            </div>
                            <div className="space-y-1.5">
                                {Object.entries(hoveredNode.metrics).map(([k, v], i) => (
                                    k.startsWith('val') ? null :
                                        <div key={i} className="flex justify-between text-[10px]">
                                            <span className="text-gray-500">{v}</span>
                                            <span className="text-gray-300 font-mono">
                                                {hoveredNode.metrics[`val${k.replace('label', '')}`]}
                                            </span>
                                        </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Edge Tooltip */}
                {hoveredEdge && !selectedNode && (
                    <div
                        className="absolute pointer-events-none z-40"
                        style={{ left: hoveredEdge.x, top: hoveredEdge.y }}
                    >
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="bg-black/80 backdrop-blur text-xs rounded px-2 py-1 border border-white/10 transform -translate-y-full"
                        >
                            Tx Count: <span className="text-cyan-400">{hoveredEdge.metrics?.txCount}</span>
                        </motion.div>
                    </div>
                )}


                {/* Side Panel */}
                <AnimatePresence>
                    {selectedNode && (
                        <motion.div
                            initial={{ x: 400, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 400, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="absolute top-4 right-4 bottom-4 w-80 md:w-96 bg-[#151921]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-y-auto custom-scrollbar p-6 z-30"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-bold text-white mb-1">{selectedNode.label}</h2>
                                    <div className={`text-[10px] inline-flex items-center px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${selectedNode.status === 'stable' ? 'bg-green-500/20 text-green-400' :
                                        selectedNode.status === 'volatile' ? 'bg-red-500/20 text-red-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>
                                        {selectedNode.status} Signal
                                    </div>
                                </div>
                                <button className="p-1 hover:bg-white/10 rounded flex items-center justify-center transition-colors" onClick={() => setSelectedNode(null)}>
                                    <ArrowLeft className="w-5 h-5 text-gray-500 rotate-180" />
                                </button>
                            </div>

                            {/* Detailed Metrics */}
                            <div className="space-y-6">

                                {selectedNode.trend && (
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-gray-400 uppercase tracking-wider">3-Month Trend</span>
                                            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                                        </div>
                                        <Sparkline data={selectedNode.trend} color={selectedNode.status === 'volatile' ? '#ef4444' : '#22c55e'} />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    {selectedNode.metrics && Object.entries(selectedNode.metrics).map(([k, v], i) => (
                                        k.startsWith('val') ? null :
                                            <div key={i} className="bg-black/20 p-3 rounded-lg border border-white/5">
                                                <div className="text-[10px] text-gray-500 mb-1">{v}</div>
                                                <div className="text-sm font-bold text-gray-200">
                                                    {selectedNode.metrics[`val${k.replace('label', '')}`]}
                                                </div>
                                            </div>
                                    ))}
                                </div>

                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                                        <Info className="w-4 h-4 text-cyan-400" />
                                        Behavioral Insight
                                    </h3>
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        {selectedNode.status === 'stable'
                                            ? "Consistently positive signal. This node contributes +12 points to the overall credit reliability score."
                                            : selectedNode.status === 'volatile'
                                                ? "Detected irregular patterns in the last 30 days. High variance suggests potential liquidity stress."
                                                : "Neutral behavior observed. No significant impact on risk model currently."}
                                    </p>
                                </div>

                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}

export default CreditReliabilityMesh;
