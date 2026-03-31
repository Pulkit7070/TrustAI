import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Navbar } from './components/Navbar';
import { API_BASE } from './lib/api';

const VALID_VIEWS = new Set([
  'home', 'apply', 'swarm', 'demo', 'dashboard', 'shopkeeper',
  'compare', 'tcn', 'mesh', 'decision',
]);

function getViewFromPath() {
  const path = window.location.pathname.replace(/^\//, '');
  return VALID_VIEWS.has(path) ? path : 'home';
}

const MarketplaceDemo = lazy(() => import('./components/MarketplaceDemo'));
const TCNAgentVisualizer = lazy(() => import('./components/TCNAgentVisualizer'));
const CreditReliabilityMesh = lazy(() => import('./components/CreditMesh'));
const DecisionEngine = lazy(() => import('./components/DecisionEngine'));
const UserDashboard = lazy(() => import('./components/UserDashboard'));
const ShopkeeperDashboard = lazy(() => import('./components/ShopkeeperDashboard'));
const SwarmVisualizer = lazy(() => import('./components/SwarmVisualizer'));
const ComparisonDashboard = lazy(() => import('./components/ComparisonDashboard'));
const LoanApplication = lazy(() => import('./components/LoanApplication'));

const translations = {
  en: {
    heroDesc: '87% of India\'s 63M MSMEs can\'t access formal credit. TrustAI turns Paytm Soundbox and UPI transaction data into a real-time credit score — so partner banks can lend confidently through the DLG model.',
    heroBtn: 'Run the Swarm',
    heroBtn2: 'Borrower Dashboard',
  },
  hi: {
    heroDesc: 'पारंपरिक क्रेडिट स्कोर के बिना भी, हम UPI लेनदेन डेटा से मर्चेंट को क्रेडिट दिलाते हैं — Paytm MCP के माध्यम से।',
    heroBtn: 'स्वार्म चलाएं',
    heroBtn2: 'उधारकर्ता डैशबोर्ड',
  },
};

const agentColor = (agent) => {
  if (agent === 'ANALYST') return 'text-blue-400';
  if (agent === 'VERIFIER') return 'text-amber-400';
  if (agent === 'VALIDATOR') return 'text-emerald-400';
  if (agent === 'DISBURSER' || agent === 'SWARM') return 'text-emerald-500';
  if (agent === 'PLANNER') return 'text-violet-400';
  return 'text-zinc-400';
};

const fallbackTerminal = [
  { ts: '0', src: 'SWARM', msg: 'Initializing TrustAI agent swarm...' },
  { ts: '1', src: 'PLANNER', msg: 'Decomposing credit request into 6 sub-tasks' },
  { ts: '2', src: 'ANALYST', msg: 'Running GNN + TCN evaluation on merchant graph' },
  { ts: '3', src: 'VERIFIER', msg: 'Checking fraud signals and market-aligned item prices' },
  { ts: '4', src: 'VALIDATOR', msg: 'Composite risk computed — decision: structured' },
  { ts: '5', src: 'DISBURSER', msg: 'Paytm MCP payment sent to merchant via UPI Escrow' },
];

export default function App() {
  const [currentView, setCurrentView] = useState(getViewFromPath);
  const [loanStatus, setLoanStatus] = useState('none');
  const [structuredRequest, setStructuredRequest] = useState(null);
  const [lang, setLang] = useState('en');
  const [terminalLines, setTerminalLines] = useState(fallbackTerminal);
  const [terminalLoading, setTerminalLoading] = useState(false);
  const [terminalRan, setTerminalRan] = useState(false);
  const terminalRef = useRef(null);
  const t = translations[lang];

  const navigateTo = useCallback((view) => {
    const v = VALID_VIEWS.has(view) ? view : 'home';
    setCurrentView(v);
    window.history.pushState(null, '', v === 'home' ? '/' : `/${v}`);
  }, []);

  // Sync view when browser back/forward buttons are used
  useEffect(() => {
    const onPopState = () => setCurrentView(getViewFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' });
  }, [terminalLines]);

  const runTerminalDemo = async () => {
    setTerminalLoading(true);
    setTerminalLines([{ ts: '0', src: 'SWARM', msg: 'Connecting to backend...' }]);
    try {
      const profilesRes = await fetch(`${API_BASE}/swarm/profiles`);
      const profiles = await profilesRes.json();
      const profile = profiles?.profiles?.find((p) => p.id === 'structured') || profiles?.profiles?.[0];
      if (!profile) throw new Error('No profiles');
      const detailRes = await fetch(`${API_BASE}/swarm/profiles/${profile.id}`);
      const detail = await detailRes.json();
      const runRes = await fetch(`${API_BASE}/swarm/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: detail.merchant_id, merchant_name: detail.merchant_name,
          borrower_id: detail.borrower_id || detail.farmer_id,
          borrower_name: detail.borrower_name || detail.farmer_name,
          loan_amount: detail.loan_amount, items: detail.items,
          transaction_data: detail.transaction_data,
        }),
      });
      const run = await runRes.json();
      const lines = (run.logs || []).slice(-12).map((log) => ({
        ts: String(Math.round(log.latency_ms || 0)), src: log.agent, msg: log.detail,
      }));
      setTerminalLines(lines.length ? lines : fallbackTerminal);
      setTerminalRan(true);
    } catch {
      setTerminalLines([...fallbackTerminal, { ts: '--', src: 'NOTE', msg: 'Backend offline — showing sample output' }]);
    }
    setTerminalLoading(false);
  };

  const toggleLang = () => setLang((v) => v === 'en' ? 'hi' : 'en');
  const handleLoanApplication = (payload) => {
    setStructuredRequest(null);
    setLoanStatus(payload?.decision === 'approved' ? 'approved' : 'rejected');
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden text-white bg-zinc-950">
      <Navbar onNavigate={navigateTo} lang={lang} onToggleLang={toggleLang} />

      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
      {currentView === 'apply' ? (
        <LoanApplication onBack={() => navigateTo('home')} />
      ) : currentView === 'swarm' ? (
        <SwarmVisualizer onBack={() => navigateTo('home')} />
      ) : currentView === 'demo' ? (
        <MarketplaceDemo onBack={() => navigateTo('home')} />
      ) : currentView === 'dashboard' ? (
        <UserDashboard onBack={() => navigateTo('home')} loanStatus={loanStatus}
          onApplyLoan={handleLoanApplication} onNavigateTo={navigateTo}
          setStructuredRequest={setStructuredRequest} />
      ) : currentView === 'shopkeeper' ? (
        <ShopkeeperDashboard onBack={() => navigateTo('dashboard')} requestData={structuredRequest}
          onDecision={(decision, paymentResult) => {
            if (paymentResult) setStructuredRequest((c) => c ? { ...c, paymentResult } : c);
            setLoanStatus(decision === 'approved' ? 'structured_approved' : 'structured_rejected');
          }} />
      ) : currentView === 'compare' ? (
        <ComparisonDashboard onBack={() => navigateTo('home')} onNavigate={navigateTo} />
      ) : currentView === 'tcn' ? (
        <TCNAgentVisualizer onBack={() => navigateTo('home')} />
      ) : currentView === 'mesh' ? (
        <CreditReliabilityMesh onBack={() => navigateTo('home')} />
      ) : currentView === 'decision' ? (
        <DecisionEngine onBack={() => navigateTo('home')}
          onSanction={(decision) => {
            setLoanStatus(decision === 'approved' ? 'approved' : 'rejected');
            if (decision === 'rejected') navigateTo('dashboard');
          }} />
      ) : (
        <LandingPage
          t={t}
          setCurrentView={navigateTo}
          terminalLines={terminalLines}
          terminalLoading={terminalLoading}
          terminalRan={terminalRan}
          terminalRef={terminalRef}
          runTerminalDemo={runTerminalDemo}
        />
      )}
      </Suspense>
    </div>
  );
}

/* ─── Landing Page ─── */
function LandingPage({ t, setCurrentView, terminalLines, terminalLoading, terminalRan, terminalRef, runTerminalDemo }) {
  return (
    <>
      {/* HERO */}
      <div className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* Faint glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-emerald-500/[0.04] blur-[100px]" />

        <div className="relative w-full max-w-4xl mx-auto px-6 pt-24">
          <p className="text-[11px] text-emerald-500 tracking-[0.2em] uppercase mb-5 font-medium">
            Paytm Build for India &middot; AI for Small Businesses
          </p>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-4 leading-[1.08] tracking-tight">
            Trust<span className="text-emerald-500">AI</span>
          </h1>

          <p className="text-xl text-zinc-300 mb-2 max-w-lg font-medium">
            Every Soundbox merchant deserves credit.
          </p>

          <p className="text-base text-zinc-500 mb-10 max-w-lg leading-relaxed">
            {t.heroDesc}
          </p>

          <div className="flex flex-wrap gap-3 mb-16">
            <button onClick={() => setCurrentView('apply')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-6 rounded-lg transition-colors text-sm">
              Apply for a Loan
            </button>
            <button onClick={() => setCurrentView('swarm')}
              className="bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 px-6 rounded-lg transition-colors text-sm">
              {t.heroBtn}
            </button>
            <button onClick={() => setCurrentView('compare')}
              className="bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 px-6 rounded-lg transition-colors text-sm">
              See Comparison
            </button>
          </div>

          {/* Mini stats row */}
          <div className="flex flex-wrap gap-6 text-sm">
            {[
              { v: '63M', l: 'MSMEs underserved' },
              { v: '13M+', l: 'Soundbox merchants' },
              { v: '<200ms', l: 'UPI scoring' },
              { v: '₹250B', l: 'credit gap' },
            ].map((s) => (
              <div key={s.l}>
                <span className="text-white font-semibold">{s.v}</span>
                <span className="text-zinc-600 ml-1.5">{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="w-full max-w-4xl mx-auto px-6 space-y-28 pb-24">

        {/* ── PROBLEM → SOLUTION ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div>
            <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-3">The Problem</div>
            <h2 className="text-2xl font-bold mb-3">CIBIL doesn&apos;t work for small merchants</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              A kirana store owner with 3 years of Soundbox transactions and 200 daily UPI payments has no CIBIL score. Banks reject them. ₹250 billion in MSME credit demand goes unmet.
            </p>
            <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-xs text-red-400/80 font-mono">
              Merchant &rarr; Bank &rarr; No CIBIL &rarr; Rejected
            </div>
          </div>
          <div>
            <div className="text-[11px] text-emerald-500 uppercase tracking-widest mb-3">Our Solution</div>
            <h2 className="text-2xl font-bold mb-3">Score them on what they DO have: UPI data</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              TrustAI builds a merchant credit graph from Soundbox transactions, QR payments, settlement patterns, and P2P flows. Funds go directly to suppliers via Paytm MCP payment links — zero cash-out risk.
            </p>
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-xs text-emerald-400/80 font-mono">
              UPI data &rarr; AI Score &rarr; Partner Bank (DLG) &rarr; Merchant paid via MCP
            </div>
          </div>
        </section>

        {/* ── TRIANGLE ── */}
        <section>
          <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-3">Core Innovation</div>
          <h2 className="text-2xl font-bold mb-8">The DLG Lending Loop</h2>

          <div className="flex justify-center mb-8">
            <svg viewBox="0 0 420 300" className="w-full max-w-md" fill="none">
              {/* Edges */}
              <line x1="210" y1="50" x2="70" y2="240" stroke="#27272a" strokeWidth="1" />
              <line x1="210" y1="50" x2="350" y2="240" stroke="#27272a" strokeWidth="1" />
              <line x1="70" y1="240" x2="350" y2="240" stroke="#10b981" strokeWidth="1.5" strokeDasharray="6 4">
                <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="2s" repeatCount="indefinite" />
              </line>

              {/* Edge labels */}
              <text x="125" y="138" fill="#3f3f46" fontSize="9" transform="rotate(-52, 125, 138)">UPI credit score</text>
              <text x="295" y="138" fill="#3f3f46" fontSize="9" transform="rotate(52, 295, 138)">DLG guarantee</text>
              <text x="210" y="270" fill="#10b981" fontSize="9" textAnchor="middle" opacity="0.7">payment via MCP link</text>

              {/* Merchant (Soundbox) */}
              <circle cx="210" cy="50" r="24" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
              <text x="210" y="54" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">M</text>
              <text x="210" y="28" textAnchor="middle" fill="#71717a" fontSize="9">Merchant (Soundbox)</text>

              {/* Supplier */}
              <circle cx="70" cy="240" r="24" fill="#18181b" stroke="#10b981" strokeWidth="1.5" />
              <text x="70" y="244" textAnchor="middle" fill="#10b981" fontSize="12" fontWeight="600">S</text>
              <text x="70" y="282" textAnchor="middle" fill="#71717a" fontSize="9">Supplier</text>

              {/* Partner Bank */}
              <circle cx="350" cy="240" r="24" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
              <text x="350" y="244" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">$</text>
              <text x="350" y="282" textAnchor="middle" fill="#71717a" fontSize="9">Partner Bank</text>
            </svg>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-800/50 rounded-xl overflow-hidden">
            {[
              { step: '01', title: 'AI scores UPI graph', desc: 'GNN analyzes Soundbox transaction patterns, QR adoption, settlement velocity, and P2P flow symmetry. TCN checks 12-week behavioral stability.' },
              { step: '02', title: 'Partner bank lends via DLG', desc: 'Paytm guarantees the loan using the AI score. Bank disburses — funds go directly to the supplier via MCP payment link. Cash never touches the borrower.' },
              { step: '03', title: 'Auto-repayment from settlements', desc: 'Repayment is auto-deducted as a percentage of the merchant\'s daily Paytm settlements. No separate EMI, no missed payments.' },
            ].map((s) => (
              <div key={s.step} className="bg-zinc-950 p-5">
                <span className="text-emerald-500/60 text-xs font-mono">{s.step}</span>
                <h3 className="text-sm font-semibold text-white mt-1 mb-2">{s.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── PIPELINE + TERMINAL ── */}
        <section>
          <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-3">Agent Architecture</div>
          <h2 className="text-2xl font-bold mb-2">Prism-inspired swarm</h2>
          <p className="text-sm text-zinc-500 mb-6">4 agents analyze UPI transaction graph in real-time. Click &quot;Run&quot; to score a merchant.</p>

          <div className="flex items-center gap-1.5 flex-wrap mb-6 text-xs font-mono">
            <span className="px-2 py-1 rounded bg-violet-500/10 text-violet-400 border border-violet-500/10">PLAN</span>
            <span className="text-zinc-700">&rarr;</span>
            <span className="text-zinc-700">[</span>
            <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/10">ANALYZE</span>
            <span className="text-zinc-600 text-[10px]">||</span>
            <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/10">VERIFY</span>
            <span className="text-zinc-700">]</span>
            <span className="text-zinc-700">&rarr;</span>
            <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">VALIDATE</span>
            <span className="text-zinc-700">&rarr;</span>
            <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">DISBURSE</span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60">
              <span className="text-[11px] text-zinc-600 font-mono">trustai-swarm</span>
              <button onClick={runTerminalDemo} disabled={terminalLoading}
                className="text-[11px] px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white transition-colors font-medium">
                {terminalLoading ? 'Running...' : terminalRan ? 'Run Again' : 'Run Demo'}
              </button>
            </div>
            <div className="p-4 font-mono text-[11px] space-y-1.5 h-64 overflow-y-auto custom-scrollbar" ref={terminalRef}>
              {terminalLines.map((line, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-zinc-700 shrink-0 w-7 text-right">{line.ts}</span>
                  <span className={`shrink-0 w-16 ${agentColor(line.src)}`}>{line.src}</span>
                  <span className="text-zinc-500">{line.msg}</span>
                </div>
              ))}
              {!terminalRan && !terminalLoading && (
                <div className="text-zinc-700 mt-2">Press &quot;Run Demo&quot; to execute against the live backend &rarr;</div>
              )}
            </div>
          </div>
        </section>

        {/* ── EXPLORE VIEWS ── */}
        <section>
          <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-3">Explore</div>
          <h2 className="text-2xl font-bold mb-6">Live demos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { name: 'Apply for Loan', desc: 'Fill your details and get a real-time AI credit decision', view: 'apply', highlight: true },
              { name: 'Agent Swarm', desc: 'Watch agents execute with WebSocket streaming', view: 'swarm' },
              { name: 'Decision Engine', desc: 'Gradient attribution for every credit decision', view: 'decision' },
              { name: 'Credit Graph', desc: '21-node merchant graph (D3)', view: 'mesh' },
              { name: 'Traditional vs TrustAI', desc: 'Side-by-side comparison', view: 'compare' },
              { name: 'Merchant View', desc: 'Shopkeeper payment tracking', view: 'shopkeeper' },
            ].map((item) => (
              <button key={item.name} onClick={() => setCurrentView(item.view)}
                className={`text-left p-4 rounded-xl border transition-all group ${
                  item.highlight
                    ? 'border-emerald-500/30 hover:border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10'
                    : 'border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60'
                }`}>
                <div className={`text-sm font-medium transition-colors mb-1 ${
                  item.highlight ? 'text-emerald-400 group-hover:text-emerald-300' : 'text-zinc-300 group-hover:text-white'
                }`}>{item.name}</div>
                <div className="text-[11px] text-zinc-600">{item.desc}</div>
              </button>
            ))}
          </div>
        </section>

        {/* ── PAYTM ALIGNMENT ── */}
        <section>
          <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-3">Alignment</div>
          <h2 className="text-2xl font-bold mb-6">Built on Paytm&apos;s stack</h2>
          <div className="space-y-0 border border-zinc-800/60 rounded-xl overflow-hidden">
            {[
              ['Soundbox (13M merchants)', 'Transaction data \u2192 GNN credit graph nodes'],
              ['DLG Lending Model', 'AI scoring enables Paytm to guarantee merchant loans to partner banks'],
              ['Credit Line on UPI', 'Purpose-locked disbursement via MCP payment links'],
              ['Paytm MCP Server', 'create_payment_link + fetch_transactions for purpose-locked lending'],
              ['AI Soundbox (11 langs)', 'Hindi voice input + merchant credit score on device'],
              ['UPI P2M + QR + POS', 'Multi-channel graph features for credit scoring'],
            ].map(([paytm, ours], i) => (
              <div key={paytm} className={`flex ${i > 0 ? 'border-t border-zinc-800/40' : ''}`}>
                <div className="w-1/3 p-3 text-xs text-zinc-600 bg-zinc-900/30">{paytm}</div>
                <div className="w-2/3 p-3 text-xs text-zinc-400">{ours}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── STACK ── */}
        <section>
          <div className="text-[11px] text-zinc-600 uppercase tracking-widest mb-4">Tech Stack</div>
          <div className="flex flex-wrap gap-2">
            {['Python', 'FastAPI', 'PyTorch', 'GNN (GCN)', 'TCN', 'React', 'D3.js', 'Paytm MCP', 'UPI Graph Scoring', 'DLG Model', 'Gradient Attribution'].map((t) => (
              <span key={t} className="text-[11px] text-zinc-500 bg-zinc-900/50 border border-zinc-800/60 px-3 py-1.5 rounded-md">{t}</span>
            ))}
          </div>
        </section>
      </main>

      <footer className="w-full py-6 text-center border-t border-zinc-800/40">
        <p className="text-zinc-700 text-xs">TrustAI &middot; Paytm Build for India &middot; DLG Lending &middot; UPI Credit Scoring</p>
      </footer>
    </>
  );
}
