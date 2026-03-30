import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Search, CreditCard, ArrowRight, Zap, Shield, Globe } from 'lucide-react';
import Antigravity from './components/Antigravity';
import { Navbar } from './components/Navbar';
import MarketplaceDemo from './components/MarketplaceDemo';
import TCNAgentVisualizer from './components/TCNAgentVisualizer';
import CreditReliabilityMesh from './components/CreditMesh';
import DecisionEngine from './components/DecisionEngine';
import UserDashboard from './components/UserDashboard';
import ShopkeeperDashboard from './components/ShopkeeperDashboard';
import SwarmVisualizer from './components/SwarmVisualizer';

// i18n translations
const translations = {
  en: {
    heroTitle: 'TrustAI',
    heroSub: 'Built on Paytm MCP',
    heroDesc: 'AI agent swarm that turns merchant transaction patterns into trust scores — enabling instant credit decisions through Paytm\'s payment infrastructure.',
    heroBtn: 'Launch Swarm',
    heroBtn2: 'View Dashboard',
    sectionTitle: 'The Agent Swarm',
    sectionDesc: 'Prism-inspired self-organizing agents. Parallel execution. Sub-second decisions.',
    analyst: 'Analyst Agent',
    analystDesc: 'Runs GNN credit mesh + TCN temporal stability analysis on merchant transaction graphs in parallel.',
    verifier: 'Verifier Agent',
    verifierDesc: 'Detects fraud patterns, circular transactions, and verifies market prices against real mandi rates.',
    disburser: 'Disburser Agent',
    disburserDesc: 'Executes payments via Paytm MCP Server — directly to merchants, never to borrowers. UPI escrow pattern.',
    termTitle: 'Live Swarm Execution',
    footerText: 'TrustAI — Built on Paytm MCP Server & Prism Architecture',
    footerSub: 'FIN-O-HACK 2026 | AI for Small Businesses Track',
    poweredBy: 'Powered by',
  },
  hi: {
    heroTitle: 'TrustAI',
    heroSub: 'Paytm MCP पर निर्मित',
    heroDesc: 'AI एजेंट स्वार्म जो व्यापारी लेनदेन पैटर्न को ट्रस्ट स्कोर में बदलता है — Paytm के भुगतान बुनियादी ढांचे के माध्यम से तत्काल क्रेडिट निर्णय।',
    heroBtn: 'स्वार्म चालू करें',
    heroBtn2: 'डैशबोर्ड देखें',
    sectionTitle: 'एजेंट स्वार्म',
    sectionDesc: 'Prism-प्रेरित स्व-संगठित एजेंट। समानांतर निष्पादन। सब-सेकंड निर्णय।',
    analyst: 'विश्लेषक एजेंट',
    analystDesc: 'व्यापारी लेनदेन ग्राफ पर GNN क्रेडिट मेश + TCN टेम्पोरल स्थिरता विश्लेषण समानांतर में चलाता है।',
    verifier: 'सत्यापनकर्ता एजेंट',
    verifierDesc: 'धोखाधड़ी पैटर्न, सर्कुलर लेनदेन का पता लगाता है और वास्तविक मंडी दरों के खिलाफ बाजार कीमतों की पुष्टि करता है।',
    disburser: 'वितरक एजेंट',
    disburserDesc: 'Paytm MCP सर्वर के माध्यम से भुगतान करता है — सीधे व्यापारियों को, कभी उधारकर्ताओं को नहीं। UPI एस्क्रो पैटर्न।',
    termTitle: 'लाइव स्वार्म निष्पादन',
    footerText: 'TrustAI — Paytm MCP सर्वर और Prism आर्किटेक्चर पर निर्मित',
    footerSub: 'FIN-O-HACK 2026 | छोटे व्यवसायों के लिए AI ट्रैक',
    poweredBy: 'द्वारा संचालित',
  },
};

// Animations
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
};

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [loanStatus, setLoanStatus] = useState('rejected');
  const [structuredRequest, setStructuredRequest] = useState(null);
  const [lang, setLang] = useState('en');
  const terminalRef = useRef(null);

  const t = translations[lang];

  const handleLoanApplication = (amount) => {
    setLoanStatus('review');
    setTimeout(() => setLoanStatus('rejected'), 2500);
  };

  const toggleLang = () => setLang(l => l === 'en' ? 'hi' : 'en');

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden text-white font-sans selection:bg-[var(--cyber-green)] selection:text-black">

      {/* Global Background */}
      <div className="fixed inset-0 z-0 bg-black">
        <Antigravity
          count={300}
          magnetRadius={6}
          ringRadius={7}
          waveSpeed={0.4}
          waveAmplitude={1}
          particleSize={1.5}
          lerpSpeed={0.05}
          color="#00ff4c"
          autoAnimate
          particleVariance={1}
          rotationSpeed={0}
          depthFactor={1}
          pulseSpeed={3}
          particleShape="capsule"
          fieldStrength={10}
        />
      </div>

      {/* Navbar */}
      <div className="relative z-50">
        <Navbar onNavigate={setCurrentView} lang={lang} onToggleLang={toggleLang} />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {currentView === 'swarm' ? (
          <SwarmVisualizer onBack={() => setCurrentView('home')} />
        ) : currentView === 'demo' ? (
          <MarketplaceDemo onBack={() => setCurrentView('home')} />
        ) : currentView === 'dashboard' ? (
          <UserDashboard
            onBack={() => setCurrentView('home')}
            loanStatus={loanStatus}
            onApplyLoan={handleLoanApplication}
            onNavigateTo={setCurrentView}
            setStructuredRequest={setStructuredRequest}
          />
        ) : currentView === 'shopkeeper' ? (
          <ShopkeeperDashboard
            onBack={() => setCurrentView('dashboard')}
            requestData={structuredRequest}
            onDecision={(decision) => setLoanStatus(decision === 'approved' ? 'structured_approved' : 'structured_rejected')}
          />
        ) : currentView === 'tcn' ? (
          <TCNAgentVisualizer onBack={() => setCurrentView('home')} />
        ) : currentView === 'mesh' ? (
          <CreditReliabilityMesh onBack={() => setCurrentView('home')} />
        ) : currentView === 'decision' ? (
          <DecisionEngine
            onBack={() => setCurrentView('home')}
            onSanction={(decision) => {
              setLoanStatus(decision);
              if (decision === 'rejected') setCurrentView('dashboard');
            }}
          />
        ) : (
          <>
            {/* ===== LANDING PAGE ===== */}

            {/* Hero Section */}
            <div className="relative w-full min-h-screen flex flex-col justify-center px-4 max-w-5xl mx-auto">
              <div className="relative z-10 pt-32 sm:pt-40 md:pt-48">
                {/* Paytm MCP Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6"
                >
                  <div className="w-2 h-2 rounded-full bg-[var(--cyber-green)] animate-pulse" />
                  <span className="text-xs text-gray-400">{t.heroSub}</span>
                  <span className="text-[10px] text-gray-600">|</span>
                  <span className="text-[10px] text-gray-500">FIN-O-HACK 2026</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-5xl sm:text-7xl md:text-8xl font-bold mb-6 leading-tight tracking-tight"
                >
                  {t.heroTitle}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg sm:text-xl md:text-2xl mb-8 opacity-90 max-w-2xl text-gray-200 leading-relaxed"
                >
                  {t.heroDesc}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex flex-col sm:flex-row items-start gap-3"
                >
                  <button
                    onClick={() => setCurrentView('swarm')}
                    className="bg-[var(--cyber-green)] hover:bg-[#00cc7d] text-black font-bold py-3 sm:py-4 px-8 rounded-full transition duration-300 shadow-[0_0_20px_rgba(0,255,157,0.3)] hover:scale-105 flex items-center gap-2"
                  >
                    <Zap className="w-5 h-5" />
                    {t.heroBtn}
                  </button>
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className="bg-white/10 border border-white/20 hover:bg-white/20 text-white font-medium py-3 sm:py-4 px-8 rounded-full transition duration-300 backdrop-blur-md flex items-center gap-2"
                  >
                    {t.heroBtn2}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>

                {/* Tech Stack Pills */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="mt-12 flex flex-wrap gap-2"
                >
                  {['Paytm MCP Server', 'Prism Architecture', 'GNN', 'TCN', 'FastAPI', 'React'].map(tech => (
                    <span key={tech} className="text-[10px] text-gray-500 bg-white/5 border border-white/5 px-3 py-1 rounded-full">
                      {tech}
                    </span>
                  ))}
                </motion.div>
              </div>
            </div>

            {/* Main Content */}
            <main className="relative z-10 flex flex-col items-center w-full px-4 md:px-8 max-w-7xl mx-auto space-y-32 pb-24 bg-black/60 backdrop-blur-xl rounded-t-3xl border-t border-white/10 pt-24 mt-[-10vh]">

              {/* Agent Swarm Section */}
              <section className="w-full" id="solution">
                <motion.div
                  className="text-center mb-16"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.sectionTitle}</h2>
                  <p className="text-gray-300 text-lg">{t.sectionDesc}</p>
                </motion.div>

                <motion.div
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={staggerContainer}
                >
                  <GlassCard
                    icon={<BrainCircuit className="w-8 h-8 text-blue-400" />}
                    title={t.analyst}
                    description={t.analystDesc}
                    tag="GNN + TCN"
                    tagColor="text-blue-400 bg-blue-500/10"
                  />
                  <GlassCard
                    icon={<Search className="w-8 h-8 text-yellow-400" />}
                    title={t.verifier}
                    description={t.verifierDesc}
                    tag="Fraud Detection"
                    tagColor="text-yellow-400 bg-yellow-500/10"
                  />
                  <GlassCard
                    icon={<CreditCard className="w-8 h-8 text-[var(--cyber-green)]" />}
                    title={t.disburser}
                    description={t.disburserDesc}
                    tag="Paytm MCP"
                    tagColor="text-[var(--cyber-green)] bg-[var(--cyber-green)]/10"
                  />
                </motion.div>

                {/* Pipeline Diagram */}
                <motion.div
                  className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/10 max-w-3xl mx-auto"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                >
                  <div className="text-center text-xs text-gray-500 uppercase tracking-widest mb-4">Execution Pipeline</div>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <PipelineStep label="PLAN" color="#8b5cf6" />
                    <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" />
                    <div className="flex items-center gap-1 border border-dashed border-yellow-400/30 rounded-lg p-2">
                      <PipelineStep label="ANALYZE" color="#3b82f6" />
                      <span className="text-yellow-400 text-[10px] font-bold mx-1">||</span>
                      <PipelineStep label="VERIFY" color="#f59e0b" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" />
                    <PipelineStep label="VALIDATE" color="#10b981" />
                    <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" />
                    <PipelineStep label="DISBURSE" color="#00ff9d" />
                  </div>
                  <div className="text-center text-[10px] text-gray-600 mt-3">Parallel execution for sub-second latency</div>
                </motion.div>
              </section>

              {/* Terminal / Live Activity */}
              <section className="w-full max-w-4xl mx-auto pb-24" id="features">
                <motion.div
                  className="text-center mb-12"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-3xl font-bold">{t.termTitle}</h2>
                </motion.div>

                <motion.div
                  className="w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black/80"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  {/* Terminal Header */}
                  <div className="flex items-center px-4 py-2 bg-white/5 border-b border-white/10 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    <div className="ml-4 text-xs font-mono text-white/40">trustai-swarm — v2.0.0</div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[10px] text-[var(--cyber-green)] bg-[var(--cyber-green)]/10 px-2 py-0.5 rounded font-mono">MCP:paytm</span>
                    </div>
                  </div>

                  {/* Terminal Content */}
                  <div className="p-6 font-mono text-sm space-y-3 text-left h-96 overflow-y-auto custom-scrollbar" ref={terminalRef}>
                    <TerminalLine ts="00:00" src="SWARM" msg="Initializing TrustAI agent swarm..." c="text-[var(--cyber-green)]" />
                    <TerminalLine ts="00:12" src="PLANNER" msg="Decomposing credit request → 6 sub-tasks generated" c="text-purple-400" />
                    <TerminalLine ts="00:15" src="SWARM" msg="Launching ANALYST and VERIFIER in parallel..." c="text-[var(--cyber-green)]" />
                    <TerminalLine ts="00:18" src="ANALYST" msg="GNN forward pass on merchant graph (21 nodes, 6 clusters)..." c="text-blue-400" />
                    <TerminalLine ts="00:45" src="ANALYST" msg="GNN confidence: 0.7823 | Cluster: revenue (strong)" c="text-blue-400" />
                    <TerminalLine ts="00:52" src="ANALYST" msg="TCN stability score: 0.6842 | Trend: improving" c="text-blue-400" />
                    <TerminalLine ts="00:38" src="VERIFIER" msg="Fraud check — 0 critical flags, score: 0.05" c="text-yellow-400" />
                    <TerminalLine ts="00:56" src="VERIFIER" msg="Price verified: Wheat Seeds ₹1200 (market ₹1200 ✓), Urea ₹850 (market ₹850 ✓)" c="text-yellow-400" />
                    <TerminalLine ts="01:02" src="VALIDATOR" msg="GNN=0.22 TCN=0.32 Fraud=0.05 → Composite=0.2305" c="text-green-400" />
                    <TerminalLine ts="01:05" src="VALIDATOR" msg="Decision: STRUCTURED FINANCING (moderate risk, supply-based)" c="text-green-400" />
                    <TerminalLine ts="01:08" src="DISBURSER" msg="[MCP] paytm_initiate_transaction → ₹6,650 to KSK-901" c="text-[var(--cyber-green)]" />
                    <TerminalLine ts="01:28" src="DISBURSER" msg="[MCP] TXN_SUCCESS: PTM-A1B2C3D4E5F6 | UPI_ESCROW" c="text-[var(--cyber-green)]" />
                    <TerminalLine ts="01:30" src="DISBURSER" msg="[MCP] paytm_create_subscription → Auto-deduction on harvest" c="text-[var(--cyber-green)]" />
                    <TerminalLine ts="01:42" src="SWARM" msg="Pipeline complete in 342ms | 3 agents | 4 MCP calls" c="text-white" />
                    <div className="animate-pulse text-[var(--cyber-green)] mt-4">_</div>
                  </div>
                </motion.div>
              </section>

            </main>

            {/* Footer */}
            <footer className="relative z-10 w-full py-8 text-center border-t border-white/5 bg-black/20 backdrop-blur-sm">
              <p className="text-white/30 text-sm mb-1">{t.footerText}</p>
              <p className="text-white/20 text-xs">{t.footerSub}</p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

// Sub-components

function GlassCard({ icon, title, description, tag, tagColor }) {
  return (
    <motion.div
      variants={fadeInUp}
      className="glass-card flex flex-col items-start text-left group overflow-hidden relative"
    >
      <div className="flex items-center justify-between w-full mb-4">
        <div className="p-3 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
          {icon}
        </div>
        {tag && (
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${tagColor}`}>
            {tag}
          </span>
        )}
      </div>
      <h3 className="text-xl font-bold mb-2 group-hover:text-[var(--cyber-green)] transition-colors text-white">{title}</h3>
      <p className="text-gray-300 text-sm leading-relaxed">{description}</p>
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[var(--cyber-green)]/10 rounded-full blur-[80px] group-hover:bg-[var(--cyber-green)]/30 transition-all duration-500" />
    </motion.div>
  );
}

function PipelineStep({ label, color }) {
  return (
    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
    </div>
  );
}

function TerminalLine({ ts, src, msg, c }) {
  return (
    <div className="flex flex-col md:flex-row gap-1 md:gap-4 md:items-start">
      <span className="text-white/30 shrink-0 text-xs py-0.5">[{ts}ms]</span>
      <div className="flex gap-2">
        <span className={`font-bold shrink-0 w-20 text-xs ${c}`}>{src}:</span>
        <span className="text-gray-300 text-xs">{msg}</span>
      </div>
    </div>
  );
}
