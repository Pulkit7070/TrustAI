import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Play, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

export default function AgentSimulation({ onBack }) {
    const [config, setConfig] = useState({
        item: "Urea Fertilizer",
        quantity: 50,
        vendor_id: "V-9988",
        farmer_id: "F-1024"
    });

    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const [finalResult, setFinalResult] = useState(null);
    const terminalEndRef = useRef(null);

    const scrollToBottom = () => {
        terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    const addLog = (source, message, color = "text-gray-300") => {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
        setLogs(prev => [...prev, { timestamp, source, message, color }]);
    };

    const runSimulation = async () => {
        setLoading(true);
        setLogs([]); // Clear previous logs
        setFinalResult(null);

        addLog("SYSTEM", "Initializing PurposePay Swarm...", "text-blue-400");

        // Simulated "Thinking" delays to make the UI feel alive while waiting for backend
        setTimeout(() => addLog("BROKER", `Verifying market price for ${config.quantity} bags of ${config.item}...`, "text-[var(--cyber-green)]"), 500);
        setTimeout(() => addLog("BROKER", `Contacting Vendor ${config.vendor_id}...`, "text-[var(--cyber-green)]"), 1500);

        try {
            const response = await fetch('http://localhost:8000/run-agents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item: config.item,
                    quantity: Number(config.quantity),
                    vendor_id: config.vendor_id,
                    farmer_id: config.farmer_id
                })
            });

            const data = await response.json();

            if (data.status === "success") {
                addLog("BROKER", "Price Verified. Purchase Order Generated.", "text-[var(--cyber-green)]");
                addLog("ESCROW", "Purchase Order Received. Locking Funds...", "text-[var(--neon-purple)]");
                setTimeout(() => addLog("ESCROW", `Transferring funds to ${config.vendor_id} (UPI)...`, "text-[var(--neon-purple)]"), 500);
                setTimeout(() => addLog("RECOVERY", `Signal Received. Loan linked to Harvest ID.`, "text-[var(--deep-blue)]"), 1000);
                setTimeout(() => {
                    addLog("SYSTEM", "Transaction Request Completed Successfully.", "text-green-500 font-bold");
                    setFinalResult(data.result);
                    setLoading(false);
                }, 1500);
            } else {
                addLog("ERROR", `Simulation Failed: ${data.message}`, "text-red-500");
                setLoading(false);
            }

        } catch (error) {
            addLog("system", `Connection Error: ${error.message}. Is the backend running?`, "text-red-500");
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-6xl mx-auto p-4 md:p-8 pt-24"
        >
            <button
                onClick={onBack}
                className="mb-6 flex items-center text-white/50 hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Configuration */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-panel p-6 rounded-2xl border-l-4 border-[var(--cyber-green)]">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <Terminal className="w-6 h-6 text-[var(--cyber-green)]" />
                            Mission Control
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Product</label>
                                <select
                                    value={config.item}
                                    onChange={(e) => setConfig({ ...config, item: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:border-[var(--cyber-green)] outline-none text-white appearance-none"
                                >
                                    <option>Urea Fertilizer</option>
                                    <option>DAP Fertilizer</option>
                                    <option>Hybrid Seeds</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        value={config.quantity}
                                        onChange={(e) => setConfig({ ...config, quantity: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:border-[var(--cyber-green)] outline-none text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Vendor ID</label>
                                    <input
                                        type="text"
                                        value={config.vendor_id}
                                        onChange={(e) => setConfig({ ...config, vendor_id: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:border-[var(--cyber-green)] outline-none text-white"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={runSimulation}
                                disabled={loading}
                                className={`w-full py-4 mt-4 rounded-xl font-bold text-black flex items-center justify-center gap-2 transition-all ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-[var(--cyber-green)] hover:shadow-[0_0_20px_rgba(0,255,157,0.4)]'}`}
                            >
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Play className="w-5 h-5" />}
                                {loading ? 'AGENTS WORKING...' : 'DEPLOY SWARM'}
                            </button>
                        </div>
                    </div>

                    {/* Status Indicators */}
                    <div className="grid grid-cols-1 gap-4">
                        <StatusCard
                            active={loading || finalResult}
                            icon={CheckCircle}
                            label="Broker"
                            status={loading ? "Verifying..." : finalResult ? "Verified" : "Standby"}
                            color="text-[var(--cyber-green)]"
                        />
                        <StatusCard
                            active={loading || finalResult}
                            icon={CheckCircle}
                            label="Escrow"
                            status={loading ? "Processing..." : finalResult ? "Paid" : "Standby"}
                            color="text-[var(--neon-purple)]"
                        />
                    </div>
                </div>

                {/* Right Column: Terminal Output */}
                <div className="lg:col-span-2 flex flex-col h-[600px] glass-panel rounded-2xl overflow-hidden border border-white/10 bg-black/80">
                    <div className="flex items-center justify-between px-6 py-3 bg-white/5 border-b border-white/10">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/80" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                            <div className="w-3 h-3 rounded-full bg-green-500/80" />
                        </div>
                        <div className="text-xs font-mono text-white/40">agent-swarm-node :: v2.1.0</div>
                    </div>

                    <div className="flex-1 p-6 font-mono text-sm overflow-y-auto custom-scrollbar space-y-3 font-light">
                        {logs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-white/20">
                                <Terminal className="w-16 h-16 mb-4 opacity-20" />
                                <p>Ready for input...</p>
                            </div>
                        )}
                        <AnimatePresence>
                            {logs.map((log, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex gap-3"
                                >
                                    <span className="text-white/30 shrink-0">[{log.timestamp}]</span>
                                    <span className={`font-bold shrink-0 w-24 ${log.color}`}>{`> ${log.source}`}</span>
                                    <span className="text-gray-300">{log.message}</span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {finalResult && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-8 p-4 border border-[var(--cyber-green)] bg-[var(--cyber-green)]/10 rounded-lg text-gray-200 whitespace-pre-wrap"
                            >
                                <div className="text-[var(--cyber-green)] font-bold mb-2">--- FINAL SETTLEMENT REPORT ---</div>
                                {finalResult}
                            </motion.div>
                        )}
                        <div ref={terminalEndRef} />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function StatusCard({ active, icon: Icon, label, status, color }) {
    return (
        <div className={`glass-card flex items-center justify-between p-4 transition-all duration-300 ${active ? 'border-white/30 bg-white/5' : 'opacity-50'}`}>
            <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="font-bold">{label}</span>
            </div>
            <span className={`text-xs uppercase tracking-wider ${active ? 'text-white' : 'text-white/40'}`}>{status}</span>
        </div>
    );
}
